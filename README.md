# Markdown Control Solution

A PowerApps Component Framework (PCF) control that renders Markdown content in model-driven apps with support for Mermaid diagrams, inline editing, and file download.

## Features

- Renders Markdown to HTML using [marked](https://github.com/markedjs/marked)
- Mermaid diagram support (loaded dynamically from CDN)
- Toggle between rendered view and edit mode
- Download markdown content as a `.md` file
- Configurable show/hide for edit and download buttons

## Control Properties

| Property | Type | Usage | Required | Description |
|---|---|---|---|---|
| markdownContent | Multiple | Bound | Yes | The markdown text to render |
| fileName | SingleLine.Text | Bound | No | Filename for downloading (without extension) |
| showEditButton | TwoOptions | Input | No | Show or hide the edit/view toggle button |
| showDownloadButton | TwoOptions | Input | No | Show or hide the download button |

## Solution Details

| Field | Value |
|---|---|
| Solution Name | Markdown Control Solution |
| Solution Unique Name | MarkdownControlSolution |
| Control Namespace | MarkdownControl |
| Publisher | Jens Schroder (`jenssch`) |
| Customization Prefix | `jenssch` |
| Choice Value Prefix | 73720 |

## Changing the Publisher

If you need to deploy under a different publisher, update the `<Publisher>` section in [Solution/src/Other/Solution.xml](Solution/src/Other/Solution.xml):

```xml
<Publisher>
  <UniqueName>yourpublisher</UniqueName>
  <LocalizedNames>
    <LocalizedName description="Your Publisher Name" languagecode="1033" />
  </LocalizedNames>
  <Descriptions>
    <Description description="" languagecode="1033" />
  </Descriptions>
  <CustomizationPrefix>yourprefix</CustomizationPrefix>
  <CustomizationOptionValuePrefix>12345</CustomizationOptionValuePrefix>
</Publisher>
```

The values must exactly match an existing publisher in your target environment:

| Field | Where to find it |
|---|---|
| **UniqueName** | Power Platform Admin → Settings → Publishers → **Name** (read-only field) |
| **LocalizedName** | Publishers → **Display name** |
| **CustomizationPrefix** | Publishers → **Prefix** |
| **CustomizationOptionValuePrefix** | Publishers → **Choice value prefix** |

If the `UniqueName` doesn't match an existing publisher, Power Platform will create a new one on import.

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- [.NET SDK](https://dotnet.microsoft.com/download)
- [Power Platform CLI](https://learn.microsoft.com/en-us/power-platform/developer/cli/introduction) (`pac`)

## Build

```bash
# Install dependencies
npm install

# Build the PCF control
npm run build

# Build the solution package
cd Solution
dotnet build MarkdownControl_solution.cdsproj
```

## Deploy

```bash
# Authenticate to your Power Platform environment
pac auth create --url https://your-org.crm.dynamics.com

# Import the solution
pac solution import --path Solution/bin/Debug/MarkdownControl_solution.zip

# Publish customizations
pac solution publish
```

## Usage in Model-Driven Apps

1. Open the form editor for your entity
2. Select a **Multiline Text** field
3. Go to **Components** → **+ Component** → search for **MarkdownControl**
4. Configure the bound properties and save/publish the form

## Project Structure

```
MarkdownControl/          # PCF control source
  ControlManifest.Input.xml
  index.ts
  css/MarkdownViewer.css
Solution/                 # Power Platform solution project
  MarkdownControl_solution.cdsproj
  src/Other/Solution.xml
```
