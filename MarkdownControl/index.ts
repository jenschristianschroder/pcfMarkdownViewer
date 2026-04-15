import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { Marked } from "marked";

// Mermaid is loaded dynamically from CDN to keep the bundle small
interface MermaidAPI {
    initialize(config: Record<string, unknown>): void;
    render(id: string, definition: string): Promise<{ svg: string }>;
}

let mermaidInstance: MermaidAPI | null = null;
let mermaidLoading: Promise<MermaidAPI> | null = null;

function loadMermaid(): Promise<MermaidAPI> {
    if (mermaidInstance) return Promise.resolve(mermaidInstance);
    if (mermaidLoading) return mermaidLoading;
    mermaidLoading = new Promise<MermaidAPI>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";
        script.onload = () => {
            const m = (window as unknown as Record<string, MermaidAPI>).mermaid;
            if (m) {
                m.initialize({
                    startOnLoad: false,
                    theme: "default",
                    securityLevel: "strict",
                });
                mermaidInstance = m;
                resolve(m);
            } else {
                reject(new Error("Mermaid not found on window after script load"));
            }
        };
        script.onerror = () => reject(new Error("Failed to load mermaid from CDN"));
        document.head.appendChild(script);
    });
    return mermaidLoading;
}

const SAMPLE_MARKDOWN = `# Markdown Viewer
Welcome to the **Markdown Viewer** PCF control!

## Features
- **Bold** and *italic* text
- [Links](https://example.com)
- Lists (ordered and unordered)
- Code blocks and inline \`code\`

### Code Block
\`\`\`typescript
const greeting = "Hello, Power Apps!";
console.log(greeting);
\`\`\`

### Table
| Feature | Supported |
|---------|-----------|
| Headings | Yes |
| Tables | Yes |
| Lists | Yes |
| Blockquotes | Yes |

> **Tip:** Bind this control to a multiline text column containing markdown content.

### Mermaid Diagram
\`\`\`mermaid
graph LR
    A[Markdown] --> B[Marked Parser]
    B --> C[HTML]
    C --> D[PCF Control]
    D --> E[Power Apps]
\`\`\`

---
*This sample is shown when the input is empty.*`;

// SVG icons for the toggle button
const VIEW_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 3C4.5 3 1.6 5.3.5 8c1.1 2.7 4 5 7.5 5s6.4-2.3 7.5-5c-1.1-2.7-4-5-7.5-5zm0 8.3A3.3 3.3 0 1 1 8 4.7a3.3 3.3 0 0 1 0 6.6zM8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>`;
const EDIT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.2 1.6a2 2 0 0 0-2.8 0L2 10l-.8 3.6a.5.5 0 0 0 .6.6L5.4 13.4l8.4-8.4a2 2 0 0 0 0-2.8l-.6-.6zM3.2 10.4l7.2-7.2 1.8 1.8-7.2 7.2-2.4.6.6-2.4z"/></svg>`;
const DOWNLOAD_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 12L3 7h3V1h4v6h3L8 12z"/><path d="M14 13v1H2v-1h12z"/></svg>`;

export class MarkdownControl
    implements ComponentFramework.StandardControl<IInputs, IOutputs>
{
    private _container: HTMLDivElement;
    private _wrapper: HTMLDivElement;
    private _contentDiv: HTMLDivElement;
    private _editor: HTMLTextAreaElement;
    private _toggleBtn: HTMLButtonElement;
    private _downloadBtn: HTMLButtonElement;
    private _marked: Marked;
    private _isEditing = false;
    private _notifyOutputChanged: () => void;
    private _currentMarkdown = "";
    private _fileName = "document";

    constructor() {
        this._marked = new Marked({
            async: false,
            breaks: true,
        });
    }

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this._container = container;
        this._notifyOutputChanged = notifyOutputChanged;

        // Wrapper with relative positioning
        this._wrapper = document.createElement("div");
        this._wrapper.classList.add("markdown-wrapper");
        this._container.appendChild(this._wrapper);

        // Toolbar for buttons
        const toolbar = document.createElement("div");
        toolbar.classList.add("markdown-toolbar");
        this._wrapper.appendChild(toolbar);

        // Download button (appears first in DOM, but flex order puts it left of edit)
        this._downloadBtn = document.createElement("button");
        this._downloadBtn.classList.add("markdown-toolbar-btn");
        this._downloadBtn.innerHTML = DOWNLOAD_ICON;
        this._downloadBtn.title = "Download as .md file";
        this._downloadBtn.addEventListener("click", () => this.downloadMarkdown());
        toolbar.appendChild(this._downloadBtn);

        // Toggle button
        this._toggleBtn = document.createElement("button");
        this._toggleBtn.classList.add("markdown-toolbar-btn");
        this._toggleBtn.innerHTML = EDIT_ICON;
        this._toggleBtn.title = "Edit markdown";
        this._toggleBtn.addEventListener("click", () => this.toggleMode());
        toolbar.appendChild(this._toggleBtn);

        // Rendered view
        this._contentDiv = document.createElement("div");
        this._contentDiv.classList.add("markdown-viewer");
        this._wrapper.appendChild(this._contentDiv);

        // Editor textarea (hidden by default)
        this._editor = document.createElement("textarea");
        this._editor.classList.add("markdown-editor");
        this._editor.style.display = "none";
        this._editor.addEventListener("input", () => {
            this._currentMarkdown = this._editor.value;
            this._notifyOutputChanged();
        });
        this._wrapper.appendChild(this._editor);

        this.renderMarkdown(context);
    }

    private sanitizeFileName(name: string): string {
        // Strip any existing .md extension, replace whitespace with dashes, remove unsafe chars
        let sanitized = name.replace(/\.md$/i, "").trim();
        sanitized = sanitized.replace(/\s+/g, "-");
        sanitized = sanitized.replace(/[^a-zA-Z0-9_.-]/g, "");
        return (sanitized || "document") + ".md";
    }

    private downloadMarkdown(): void {
        const blob = new Blob([this._currentMarkdown], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = this.sanitizeFileName(this._fileName);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    private toggleMode(): void {
        this._isEditing = !this._isEditing;
        if (this._isEditing) {
            this._contentDiv.style.display = "none";
            this._editor.style.display = "block";
            this._editor.value = this._currentMarkdown;
            this._toggleBtn.innerHTML = VIEW_ICON;
            this._toggleBtn.title = "View rendered markdown";
            this._editor.focus();
        } else {
            this._editor.style.display = "none";
            this._contentDiv.style.display = "block";
            this._toggleBtn.innerHTML = EDIT_ICON;
            this._toggleBtn.title = "Edit markdown";
            this.renderContent(this._currentMarkdown);
        }
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this.renderMarkdown(context);
    }

    private renderMarkdown(context: ComponentFramework.Context<IInputs>): void {
        const showPlaceholder = context.parameters.showPlaceholder?.raw !== false;
        this._currentMarkdown = context.parameters.markdownContent.raw || (showPlaceholder ? SAMPLE_MARKDOWN : "");
        this._fileName = context.parameters.fileName?.raw || "document";

        const showEdit = context.parameters.showEditButton?.raw !== false;
        const showDownload = context.parameters.showDownloadButton?.raw !== false;
        this._toggleBtn.style.display = showEdit ? "" : "none";
        this._downloadBtn.style.display = showDownload ? "" : "none";

        // If edit button is hidden while in edit mode, switch back to view
        if (!showEdit && this._isEditing) {
            this._isEditing = false;
            this._editor.style.display = "none";
            this._contentDiv.style.display = "block";
            this._toggleBtn.innerHTML = EDIT_ICON;
        }

        if (!this._isEditing) {
            this.renderContent(this._currentMarkdown);
        }
    }

    private renderContent(rawMarkdown: string): void {
        const html = this._marked.parse(rawMarkdown) as string;

        // Use DOMParser to safely parse the HTML, then extract only safe content
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Remove any script tags for safety
        doc.querySelectorAll("script").forEach((el) => el.remove());
        // Remove event handler attributes
        doc.querySelectorAll("*").forEach((el) => {
            for (const attr of Array.from(el.attributes)) {
                if (attr.name.startsWith("on")) {
                    el.removeAttribute(attr.name);
                }
            }
            // Remove javascript: URLs
            if (
                el.hasAttribute("href") &&
                el.getAttribute("href")?.trim().toLowerCase().startsWith("javascript:")
            ) {
                el.removeAttribute("href");
            }
            if (
                el.hasAttribute("src") &&
                el.getAttribute("src")?.trim().toLowerCase().startsWith("javascript:")
            ) {
                el.removeAttribute("src");
            }
        });

        this._contentDiv.innerHTML = doc.body.innerHTML;
        this.renderMermaidDiagrams();
    }

    private async renderMermaidDiagrams(): Promise<void> {
        const codeBlocks = this._contentDiv.querySelectorAll("code.language-mermaid");
        if (codeBlocks.length === 0) return;

        let mermaidLib: MermaidAPI;
        try {
            mermaidLib = await loadMermaid();
        } catch {
            // Could not load mermaid, leave code blocks as-is
            return;
        }

        for (let i = 0; i < codeBlocks.length; i++) {
            const codeEl = codeBlocks[i];
            const pre = codeEl.parentElement;
            if (!pre || pre.tagName !== "PRE") continue;

            const definition = codeEl.textContent || "";
            try {
                const id = `mermaid-${Date.now()}-${i}`;
                const { svg } = await mermaidLib.render(id, definition);
                const container = document.createElement("div");
                container.classList.add("mermaid-diagram");
                container.innerHTML = svg;
                pre.replaceWith(container);
            } catch {
                // Leave the code block as-is if mermaid fails to parse
            }
        }
    }

    public getOutputs(): IOutputs {
        return {
            markdownContent: this._currentMarkdown,
        };
    }

    public destroy(): void {
        // cleanup handled by framework removing the container
    }
}
