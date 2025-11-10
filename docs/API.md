# API Documentation

This document describes the available APIs in Manus Electron for developers and advanced users.

## Documentation Index

- **[Component API Reference](./COMPONENT_API.md)** - Complete API reference for UI components (agent plan, chat, layout)
- **[IPC API Reference](#window-api)** - Main process communication APIs (below)
- **[Task Management API](#task-management-apis)** - Task execution and history APIs
- **[Configuration API](#configuration-apis)** - User settings and preferences

## Architecture Overview

### IPC Handler Registration

All IPC handlers are registered during application initialization **before** any windows are created. This ensures that renderer processes can communicate with the main process immediately upon window creation.

**Registration Order:**
1. App ready event (`app.whenReady()`)
2. **IPC handlers registered** (`registerAllIpcHandlers()`)
3. Protocol registration
4. Window creation

**Registered Handler Categories:**
- **Eko Handlers** - AI agent task execution (`ekoRun`, `ekoModify`, `ekoCancelTask`)
- **View Handlers** - WebContentsView coordination (`setDetailViewVisible`, `updateDetailViewBounds`)
- **History Handlers** - Task history management
- **Config Handlers** - User configuration persistence
- **Agent Handlers** - Agent configuration management

## Window API

The `window.api` object provides access to Electron main process functionality through secure IPC communication. All methods are available immediately after window creation due to early IPC handler registration.

### Browser Control APIs

#### `navigateTo(url: string)`
Navigate the browser view to a specific URL.

**Parameters:**
- `url` (string): The URL to navigate to

**Returns:** `Promise<{ url: string; title: string }>`

**Example:**
```typescript
const result = await window.api.navigateTo('https://example.com');
console.log(`Navigated to: ${result.title}`);
```

#### `getMainViewScreenshot()`
Capture a screenshot of the current browser view.

**Returns:** `Promise<{ imageBase64: string; imageType: "image/jpeg" | "image/png" }>`

**Example:**
```typescript
const screenshot = await window.api.getMainViewScreenshot();
// Use screenshot.imageBase64 for display
```

#### `getMainViewUrlAndTitle()`
Get the current URL and title of the browser view.

**Returns:** `Promise<{ url: string; title: string }>`

### Layout Transformation APIs

These APIs coordinate the resizable panel layout with Electron's WebContentsView positioning.

**IMPORTANT UPDATE (November 7, 2025)**: The browser view (detailView) is now positioned on the LEFT side (75% width, full height) but remains hidden by default. These APIs control browser automation visibility as before, with the new positioning preparing for future layout transformations.

#### `setDetailViewVisible(visible: boolean)`
Show or hide the browser view (main browsing area).

**Parameters:**
- `visible` (boolean): Whether to show the browser view

**Returns:** `Promise<void>`

**Example:**
```typescript
// Browser view is hidden by default (original behavior preserved)
// Shows when AI agent uses browser tools

// Show browser view during automation
await window.api.setDetailViewVisible(true);

// Hide browser view after automation completes
await window.api.setDetailViewVisible(false);
```

**Note**: The browser view is positioned on the LEFT side (75% width) but visibility behavior remains unchanged from the original implementation.

#### `updateDetailViewBounds(bounds: DetailViewBounds)`
Update the position and size of the browser view to match panel layout changes during resize operations.

**Parameters:**
- `bounds` (DetailViewBounds): The new bounds for the browser view

**DetailViewBounds Interface:**
```typescript
interface DetailViewBounds {
  x: number      // Horizontal offset from window left edge (typically 0 for LEFT-side browser)
  y: number      // Vertical offset from window top (typically 0 for edge-to-edge)
  width: number  // Browser panel width (75% of window width by default)
  height: number // Browser panel height (full window height for edge-to-edge)
}
```

**Returns:** `Promise<void>`

**Example:**
```typescript
// Update browser view when panels are resized (75/25 split)
const windowWidth = window.innerWidth;
const browserPanelPercent = 75; // Browser takes 75% of window width

const bounds = {
  x: 0,                                    // LEFT edge of window
  y: 0,                                    // TOP edge of window (edge-to-edge)
  width: (windowWidth * browserPanelPercent) / 100,  // 75% of window width
  height: window.innerHeight               // Full window height
};
await window.api.updateDetailViewBounds(bounds);
```

**Current Default Positioning (November 7, 2025)**:
```typescript
// Browser view positioned on LEFT side (75% width, full height)
// Hidden by default, shows on first message
const windowBounds = mainWindow.getBounds();
const browserWidth = Math.floor(windowBounds.width * 0.75);

detailView.setBounds({
  x: 0,
  y: 0,
  width: browserWidth,
  height: windowBounds.height
});
detailView.setVisible(false); // Hidden by default
```

#### `showHistoryView(screenshotBase64: string)`
Display a historical screenshot in the history view.

**Parameters:**
- `screenshotBase64` (string): Base64-encoded screenshot data

**Returns:** `Promise<void>`

**Example:**
```typescript
// Show historical screenshot from tool execution
await window.api.showHistoryView(toolAction.screenshot);
```

#### `hideHistoryView()`
Hide the history view.

**Returns:** `Promise<void>`

**Example:**
```typescript
// Hide history view when switching tools or exiting history mode
await window.api.hideHistoryView();
```

### AI Agent APIs

#### `ekoRun(prompt: string)`
Execute an AI task with the given prompt.

**Parameters:**
- `prompt` (string): The task description for the AI agent

**Returns:** `Promise<any>`

#### `ekoModify(taskId: string, prompt: string)`
Modify an existing AI task.

**Parameters:**
- `taskId` (string): The ID of the task to modify
- `prompt` (string): The modification instructions

**Returns:** `Promise<any>`

#### `ekoCancelTask(taskId: string)`
Cancel a running AI task.

**Parameters:**
- `taskId` (string): The ID of the task to cancel

**Returns:** `Promise<any>`

#### `onEkoStreamMessage(callback: (message: any) => void)`
Listen for streaming messages from AI task execution.

**Parameters:**
- `callback` (function): Function to handle incoming messages

**Example:**
```typescript
window.api.onEkoStreamMessage((message) => {
  console.log('AI message:', message);
  // Update UI with streaming content
});
```

### Configuration APIs

#### `getUserModelConfigs()`
Get the current user model configurations.

**Returns:** `Promise<UserModelConfigs>`

#### `saveUserModelConfigs(configs: UserModelConfigs)`
Save user model configurations.

**Parameters:**
- `configs` (UserModelConfigs): The configuration object

**Returns:** `Promise<{ success: boolean }>`

#### `getSelectedProvider()`
Get the currently selected AI provider.

**Returns:** `Promise<ProviderType>`

#### `setSelectedProvider(provider: ProviderType)`
Set the active AI provider.

**Parameters:**
- `provider` (ProviderType): One of 'deepseek', 'qwen', 'google', 'anthropic', 'openrouter', 'custom'

**Returns:** `Promise<{ success: boolean }>`

### Agent Configuration APIs

#### `getAgentConfig()`
Get the current agent configuration.

**Returns:** `Promise<{ success: boolean; data: AgentConfig }>`

#### `saveAgentConfig(config: AgentConfig)`
Save agent configuration.

**Parameters:**
- `config` (AgentConfig): The agent configuration object

**Returns:** `Promise<{ success: boolean }>`

#### `getMcpTools()`
Get available MCP (Model Context Protocol) tools.

**Returns:** `Promise<{ success: boolean; data: McpToolSchema[] }>`

#### `setMcpToolEnabled(toolName: string, enabled: boolean)`
Enable or disable an MCP tool.

**Parameters:**
- `toolName` (string): The name of the MCP tool
- `enabled` (boolean): Whether to enable the tool

**Returns:** `Promise<{ success: boolean }>`

## Type Definitions

### Core Types

```typescript
// Supported AI providers
type ProviderType = 'deepseek' | 'qwen' | 'google' | 'anthropic' | 'openrouter' | 'custom';

// Panel layout state for persistence
interface PanelLayoutState {
  browserPanelSize: number     // Percentage (40-85)
  aiSidebarSize: number        // Percentage (15-60)
  isCollapsed: boolean         // Sidebar collapsed state
  lastModified: number         // Timestamp for cache invalidation
}

// Agent configuration structure
interface AgentConfig {
  browserAgent: {
    enabled: boolean
    customPrompt: string
  }
  fileAgent: {
    enabled: boolean
    customPrompt: string
  }
  mcpTools: {
    [toolName: string]: {
      enabled: boolean
      config?: Record<string, any>
    }
  }
}
```

## Usage Examples

### Implementing Resizable Layout

```typescript
import { useState, useEffect } from 'react';

function ResizableLayout() {
  const [showDetail, setShowDetail] = useState(false);
  const [panelSizes, setPanelSizes] = useState({ browser: 75, sidebar: 25 });

  // Handle panel resize
  const handleResize = async (sizes: number[]) => {
    const [browserSize, sidebarSize] = sizes;
    setPanelSizes({ browser: browserSize, sidebar: sidebarSize });

    // Calculate detail view bounds
    const bounds = {
      x: (window.innerWidth * browserSize) / 100 + 16,
      y: 264,
      width: (window.innerWidth * sidebarSize) / 100 - 32,
      height: 560
    };

    // Update WebContentsView position
    try {
      await window.api.updateDetailViewBounds(bounds);
    } catch (error) {
      console.error('Failed to update detail view bounds:', error);
    }
  };

  // Handle detail view visibility
  useEffect(() => {
    const updateDetailView = async () => {
      try {
        await window.api.setDetailViewVisible(showDetail);
      } catch (error) {
        console.error('Failed to set detail view visibility:', error);
      }
    };

    updateDetailView();
  }, [showDetail]);

  return (
    // Your resizable layout JSX
  );
}
```

### Handling AI Task Execution

```typescript
async function executeAITask(prompt: string) {
  try {
    // Start AI task
    const task = await window.api.ekoRun(prompt);
    
    // Show detail view for browser automation
    await window.api.setDetailViewVisible(true);
    
    // Listen for streaming updates
    window.api.onEkoStreamMessage((message) => {
      // Update UI with task progress
      console.log('Task update:', message);
    });
    
    return task;
  } catch (error) {
    console.error('AI task execution failed:', error);
    // Hide detail view on error
    await window.api.setDetailViewVisible(false);
  }
}
```

## Error Handling

All API methods return Promises and should be wrapped in try-catch blocks for proper error handling:

```typescript
try {
  await window.api.setDetailViewVisible(true);
} catch (error) {
  console.error('API call failed:', error);
  // Handle error appropriately
}
```

## Security Notes

- All APIs are exposed through Electron's secure contextBridge
- Input validation is performed in the preload script
- Sensitive operations require proper error handling
- API keys are managed securely through the configuration system