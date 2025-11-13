// Supported providers
export type ProviderType = 'deepseek' | 'qwen' | 'google' | 'anthropic' | 'openrouter' | 'custom';

// Model configuration types
export interface UserModelConfigs {
  deepseek?: {
    apiKey?: string
    baseURL?: string
    model?: string
  }
  qwen?: {
    apiKey?: string
    model?: string
  }
  google?: {
    apiKey?: string
    model?: string
  }
  anthropic?: {
    apiKey?: string
    model?: string
  }
  openrouter?: {
    apiKey?: string
    model?: string
  }
  custom?: {
    apiKey?: string
    baseURL?: string
    model?: string
  }
  selectedProvider?: ProviderType
}

// Agent configuration types
export interface AgentConfig {
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

// MCP Tool types
export interface McpToolSchema {
  name: string
  description: string
  enabled: boolean
  inputSchema: {
    type: string
    properties: Record<string, any>
    required: string[]
  }
}

// Layout transformation types
export interface DetailViewBounds {
  x: number      // Horizontal offset from window left edge
  y: number      // Vertical offset from window top
  width: number  // Calculated from AI sidebar width
  height: number // Fixed height
}

export interface PanelLayoutState {
  browserPanelSize: number     // Percentage (40-85)
  aiSidebarSize: number        // Percentage (15-60)
  isCollapsed: boolean         // Sidebar collapsed state
  lastModified: number         // Timestamp for cache invalidation
}

// Layout mode types for progressive disclosure
export type LayoutMode = 'full-width' | 'split';

export interface LayoutTransitionConfig {
  duration: number;          // Animation duration in ms
  easing: string;           // CSS easing function
  showBrowserView: boolean; // Whether to show browser view
}

// Default configuration for layout transitions
export const DEFAULT_LAYOUT_TRANSITION: LayoutTransitionConfig = {
  duration: 300,
  easing: 'ease-in-out',
  showBrowserView: true
};

// Standard response types for consistent API handling
export interface StandardResponse<T = void> {
  success: boolean
  data?: T
  error?: string
}

export type SuccessResponse = StandardResponse<void>;

// Eko API specific types
export interface EkoTaskResult {
  success: boolean
  taskId: string
  message?: string
  error?: string
}

export interface EkoTaskStatus {
  taskId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress?: number
  result?: any
  error?: string
}

export interface EkoStreamMessage {
  type: 'status' | 'progress' | 'result' | 'error'
  taskId: string
  data: any
  timestamp: number
}

// Provider-specific model configuration types
export interface ProviderModelConfig {
  apiKey?: string
  baseURL?: string
  model?: string
  enabled: boolean
}

// ✅ NEW: Checkpoint system types for pause/resume capability
export interface CheckpointStatus {
  exists: boolean
  status?: 'in_progress' | 'paused' | 'failed' | 'completed'
  iteration?: number
  failurePoint?: string
  timestamp?: number
}

export interface CheckpointRecoverySummary {
  canRecover: boolean
  progress: number
  lastNode: string
  failureReason?: string
  estimatedTokensSaved: number
}

export interface CheckpointInfo {
  taskId: string
  status: string
  timestamp: number
  iteration: number
  totalIterations: number
  progress: number
}

// ✅ NEW: Phase 2 Agent Context Manager types for multi-agent coordination
export interface AgentContextState {
  agentName: string
  timestamp: number
  variables: Record<string, any>
  sessionState?: {
    cookies?: string[]
    headers?: Record<string, string>
    auth?: Record<string, any>
  }
}

export interface ContextTransfer {
  fromAgent: string
  toAgent: string
  timestamp: number
  context: Record<string, any>
  variables: Record<string, any>
  handoffReason?: string
}

export interface WindowContextSnapshot {
  windowId: number
  contextId: string
  createdAt: number
  updatedAt: number
  globalVariables: Record<string, any>
  agentStates: Record<string, AgentContextState>
  contextTransfers: ContextTransfer[]
}

// ✅ NEW: Phase 3 MCP Integration types for dynamic tool discovery
export interface MCPServer {
  id: string
  name: string
  url: string
  enabled: boolean
  connectionType: 'sse' | 'stdio' | 'websocket'
  timeout: number
  maxRetries: number
}

export interface MCPToolInfo {
  name: string
  description: string
  serverId: string
  serverName: string
  inputSchema: {
    type: string
    properties: Record<string, any>
    required: string[]
  }
  enabled: boolean
  lastDiscovered: number
}

export interface MCPClientStatus {
  serverId: string
  serverName: string
  isConnected: boolean
  lastConnected: number
  lastError?: string
  toolCount: number
}

// Namespaced API interfaces for better organization and maintainability
interface EkoAPI {
  run: (prompt: string) => Promise<EkoTaskResult>
  modify: (taskId: string, prompt: string) => Promise<EkoTaskResult>
  execute: (taskId: string) => Promise<EkoTaskResult>
  getTaskStatus: (taskId: string) => Promise<EkoTaskStatus>
  cancelTask: (taskId: string) => Promise<EkoTaskResult>
  onStreamMessage: (callback: (message: EkoStreamMessage) => void) => void

  // ✅ NEW: Checkpoint-aware execution for pause/resume
  ekoRunCheckpoint: (prompt: string, options?: { checkpointInterval?: number; agents?: string[] }) => Promise<{ id: string; promise: Promise<any> }>
  ekoPauseTask: (taskId: string) => Promise<{ success: boolean; message: string }>
  ekoResumeTask: (taskId: string) => Promise<{ id: string; promise: Promise<any> }>
  ekoCheckpointStatus: (taskId: string) => Promise<{ status: CheckpointStatus; summary: CheckpointRecoverySummary | null }>
  ekoListCheckpoints: () => Promise<CheckpointInfo[]>
  ekoDeleteCheckpoint: (taskId: string) => Promise<{ success: boolean; message: string }>
  onEkoStreamMessage: (callback: (event: any, message: any) => void) => void

  // ✅ NEW: Phase 2 Agent Context Manager APIs for multi-agent coordination
  agentContextSaveState: (windowId: number, agentName: string, variables: Record<string, any>, sessionState?: any) => Promise<{ success: boolean; agentState?: AgentContextState }>
  agentContextGetState: (windowId: number, agentName: string) => Promise<{ success: boolean; agentState: AgentContextState | null }>
  agentContextTransfer: (windowId: number, fromAgent: string, toAgent: string, contextData: Record<string, any>, reason?: string) => Promise<{ success: boolean; transfer?: ContextTransfer }>
  agentContextSetGlobalVar: (windowId: number, key: string, value: any) => Promise<{ success: boolean }>
  agentContextGetGlobalVar: (windowId: number, key: string) => Promise<{ success: boolean; value: any }>
  agentContextGetAgentVariables: (windowId: number, agentName: string) => Promise<{ success: boolean; variables: Record<string, any> }>
  agentContextGetTransferHistory: (windowId: number, fromAgent?: string, toAgent?: string) => Promise<{ success: boolean; history: ContextTransfer[] }>
  agentContextGetAllStates: (windowId: number) => Promise<{ success: boolean; states: Record<string, AgentContextState> }>
  agentContextExport: (windowId: number) => Promise<{ success: boolean; context: WindowContextSnapshot | null }>
  agentContextImport: (windowId: number, data: Record<string, any>) => Promise<{ success: boolean; context?: WindowContextSnapshot }>
  agentContextClear: (windowId: number) => Promise<{ success: boolean }>

  // ✅ NEW: Phase 3 MCP Tool Discovery and Execution APIs
  mcpRegisterServer: (server: MCPServer) => Promise<{ success: boolean; error?: string }>
  mcpUnregisterServer: (serverId: string) => Promise<{ success: boolean; error?: string }>
  mcpGetServers: () => Promise<{ success: boolean; servers?: MCPServer[]; error?: string }>
  mcpGetServer: (serverId: string) => Promise<{ success: boolean; server?: MCPServer; error?: string }>
  mcpConnectServer: (serverId: string) => Promise<{ success: boolean; error?: string }>
  mcpDisconnectServer: (serverId: string) => Promise<{ success: boolean; error?: string }>
  mcpGetAvailableTools: () => Promise<{ success: boolean; tools?: MCPToolInfo[]; error?: string }>
  mcpGetServerTools: (serverId: string) => Promise<{ success: boolean; tools?: MCPToolInfo[]; error?: string }>
  mcpSetToolEnabled: (toolId: string, enabled: boolean) => Promise<{ success: boolean; error?: string }>
  mcpExecuteTool: (toolId: string, args: Record<string, any>) => Promise<{ success: boolean; data?: any; error?: string }>
  mcpGetConnectionStatus: () => Promise<{ success: boolean; statuses?: MCPClientStatus[]; error?: string }>
  mcpRefreshServerTools: (serverId: string) => Promise<{ success: boolean; toolCount?: number; error?: string }>
  mcpHealthCheck: () => Promise<{ success: boolean; health?: { healthy: number; unhealthy: number; total: number }; error?: string }>
}

interface ViewAPI {
  setDetailViewVisible: (visible: boolean) => Promise<void>
  updateDetailViewBounds: (bounds: DetailViewBounds) => Promise<void>
  showViewWindow: () => Promise<void>
  hideViewWindow: () => Promise<void>
  getMainViewSize: () => Promise<{ width: number; height: number }>
  getMainViewScreenshot: () => Promise<{ imageBase64: string; imageType: "image/jpeg" | "image/png" }>
  getMainViewUrlAndTitle: () => Promise<{ url: string; title: string }>
  sendToMainViewExecuteCode: (func: string, args: any[]) => Promise<unknown>
  navigateTo: (url: string) => Promise<{ success: boolean; error?: string }>
  getCurrentUrl: () => Promise<string>
  onUrlChange: (callback: (url: string) => void) => void
  getMainViewWindowNumber: () => Promise<number>
  captureWindow: (winNo: number, scale?: number) => Promise<{ width: number; height: number; stride: number; data: Buffer; error?: string }>
  captureWindowSync: (winNo: number, scale?: number) => { width: number; height: number; stride: number; data: Buffer; error?: string }
  requestCapturePermission: () => Promise<boolean>
  getHiddenWindowSourceId: () => Promise<string>
  goBack: () => Promise<{ success: boolean; error?: string }>
  goForward: () => Promise<{ success: boolean; error?: string }>
  reload: () => Promise<{ success: boolean; error?: string }>
  getNavigationState: () => Promise<{ canGoBack: boolean; canGoForward: boolean }>
}

interface ConfigAPI {
  getUserModelConfigs: () => Promise<UserModelConfigs>
  saveUserModelConfigs: (configs: UserModelConfigs) => Promise<SuccessResponse>
  getModelConfig: (provider: ProviderType) => Promise<ProviderModelConfig>
  getApiKeySource: (provider: ProviderType) => Promise<'user' | 'env' | 'none'>
  getSelectedProvider: () => Promise<ProviderType>
  setSelectedProvider: (provider: ProviderType) => Promise<SuccessResponse>
  getEnvVar: (key: string) => Promise<string>
}

interface AgentAPI {
  getAgentConfig: () => Promise<StandardResponse<AgentConfig>>
  saveAgentConfig: (config: AgentConfig) => Promise<SuccessResponse>
  getMcpTools: () => Promise<StandardResponse<McpToolSchema[]>>
  setMcpToolEnabled: (toolName: string, enabled: boolean) => Promise<SuccessResponse>
  reloadAgentConfig: () => Promise<StandardResponse<AgentConfig>>
}

interface MCPToolAPI {
  registerServer: (server: MCPServer) => Promise<{ success: boolean; error?: string }>
  unregisterServer: (serverId: string) => Promise<{ success: boolean; error?: string }>
  getServers: () => Promise<{ success: boolean; servers?: MCPServer[]; error?: string }>
  getServer: (serverId: string) => Promise<{ success: boolean; server?: MCPServer; error?: string }>
  connectServer: (serverId: string) => Promise<{ success: boolean; error?: string }>
  disconnectServer: (serverId: string) => Promise<{ success: boolean; error?: string }>
  getAvailableTools: () => Promise<{ success: boolean; tools?: MCPToolInfo[]; error?: string }>
  getServerTools: (serverId: string) => Promise<{ success: boolean; tools?: MCPToolInfo[]; error?: string }>
  setToolEnabled: (toolId: string, enabled: boolean) => Promise<{ success: boolean; error?: string }>
  executeTool: (toolId: string, args: Record<string, any>) => Promise<{ success: boolean; data?: any; error?: string }>
  getConnectionStatus: () => Promise<{ success: boolean; statuses?: MCPClientStatus[]; error?: string }>
  refreshServerTools: (serverId: string) => Promise<{ success: boolean; toolCount?: number; error?: string }>
  healthCheck: () => Promise<{ success: boolean; health?: { healthy: number; unhealthy: number; total: number }; error?: string }>
}

interface HistoryAPI {
  showHistoryView: (screenshotBase64: string) => Promise<void>
  hideHistoryView: () => Promise<void>
}

interface VoiceAPI {
  sendVoiceTextToChat: (text: string) => Promise<void>
  onVoiceTextReceived: (callback: (text: string) => void) => void
  sendTTSSubtitle: (text: string, isStart: boolean) => Promise<boolean>
  onTTSSubtitleReceived: (callback: (text: string, isStart: boolean) => void) => void
}

interface UtilityAPI {
  removeAllListeners: (channel: string) => void
  invoke: (channel: string, ...args: any[]) => Promise<any>
  onTaskExecutionComplete: (callback: (event: any) => void) => void
  onOpenHistoryPanel: (callback: (event: any) => void) => void
  onTaskAbortedBySystem: (callback: (event: any) => void) => void
}

declare global {
  interface Window {
    // New namespaced API structure
    api: {
      eko: EkoAPI
      view: ViewAPI
      config: ConfigAPI
      agent: AgentAPI
      mcp: MCPToolAPI
      history: HistoryAPI
      voice: VoiceAPI
      util: UtilityAPI

      // DEPRECATED: Legacy flat API for backward compatibility
      // These will be removed in a future version
      /** @deprecated Use api.view.sendToMainViewExecuteCode instead */
      sendToMainViewExecuteCode: (func: string, args: any[]) => Promise<any>
      /** @deprecated Use api.view.navigateTo instead */
      navigateTo: (url: string) => Promise<{ url: string; title: string }>
      /** @deprecated Use api.view.getMainViewSize instead */
      getMainViewSize: () => Promise<{ width: number; height: number }>
      /** @deprecated Use api.view.getMainViewScreenshot instead */
      getMainViewScreenshot: () => Promise<{ imageBase64: string; imageType: "image/jpeg" | "image/png" }>
      /** @deprecated Use api.view.getMainViewUrlAndTitle instead */
      getMainViewUrlAndTitle: () => Promise<{ url: string; title: string }>
      /** @deprecated Use api.view.getHiddenWindowSourceId instead */
      getHiddenWindowSourceId: () => Promise<string>
      /** @deprecated Use api.view.showViewWindow instead */
      showViewWindow: () => Promise<void>
      /** @deprecated Use api.view.hideViewWindow instead */
      hideViewWindow: () => Promise<void>
      /** @deprecated Use api.voice.sendVoiceTextToChat instead */
      sendVoiceTextToChat: (text: string) => Promise<void>
      /** @deprecated Use api.voice.onVoiceTextReceived instead */
      onVoiceTextReceived: (callback: (text: string) => void) => void
      /** @deprecated Use api.voice.sendTTSSubtitle instead */
      sendTTSSubtitle: (text: string, isStart: boolean) => Promise<boolean>
      /** @deprecated Use api.voice.onTTSSubtitleReceived instead */
      onTTSSubtitleReceived: (callback: (text: string, isStart: boolean) => void) => void
      /** @deprecated Use api.util.removeAllListeners instead */
      removeAllListeners: (channel: string) => void
      /** @deprecated Use api.view.getMainViewWindowNumber instead */
      getMainViewWindowNumber: () => Promise<number>
      /** @deprecated Use api.view.captureWindow instead */
      captureWindow: (winNo: number, scale?: number) => Promise<{ width: number; height: number; stride: number; data: Buffer; error?: string }>
      /** @deprecated Use api.view.captureWindowSync instead */
      captureWindowSync: (winNo: number, scale?: number) => { width: number; height: number; stride: number; data: Buffer; error?: string }
      /** @deprecated Use api.view.requestCapturePermission instead */
      requestCapturePermission: () => Promise<boolean>
      /** @deprecated Use api.eko.run instead */
      ekoRun: (prompt: string) => Promise<any>
      /** @deprecated Use api.eko.modify instead */
      ekoModify: (taskId: string, prompt: string) => Promise<any>
      /** @deprecated Use api.eko.execute instead */
      ekoExecute: (taskId: string) => Promise<any>
      /** @deprecated Use api.eko.onStreamMessage instead */
      onEkoStreamMessage: (callback: (message: any) => void) => void
      /** @deprecated Use api.eko.getTaskStatus instead */
      ekoGetTaskStatus: (taskId: string) => Promise<any>
      /** @deprecated Use api.eko.cancelTask instead */
      ekoCancelTask: (taskId: string) => Promise<any>
      /** @deprecated Use api.config.getUserModelConfigs instead */
      getUserModelConfigs: () => Promise<UserModelConfigs>
      /** @deprecated Use api.config.saveUserModelConfigs instead */
      saveUserModelConfigs: (configs: UserModelConfigs) => Promise<{ success: boolean }>
      /** @deprecated Use api.config.getModelConfig instead */
      getModelConfig: (provider: ProviderType) => Promise<any>
      /** @deprecated Use api.config.getApiKeySource instead */
      getApiKeySource: (provider: ProviderType) => Promise<'user' | 'env' | 'none'>
      /** @deprecated Use api.config.getSelectedProvider instead */
      getSelectedProvider: () => Promise<ProviderType>
      /** @deprecated Use api.config.setSelectedProvider instead */
      setSelectedProvider: (provider: ProviderType) => Promise<{ success: boolean }>
      /** @deprecated Use api.config.getEnvVar instead */
      getEnvVar: (key: string) => Promise<string>
      /** @deprecated Use api.agent.getAgentConfig instead */
      getAgentConfig: () => Promise<{ success: boolean; data: AgentConfig }>
      /** @deprecated Use api.agent.saveAgentConfig instead */
      saveAgentConfig: (config: AgentConfig) => Promise<{ success: boolean }>
      /** @deprecated Use api.agent.getMcpTools instead */
      getMcpTools: () => Promise<{ success: boolean; data: McpToolSchema[] }>
      /** @deprecated Use api.agent.setMcpToolEnabled instead */
      setMcpToolEnabled: (toolName: string, enabled: boolean) => Promise<{ success: boolean }>
      /** @deprecated Use api.agent.reloadAgentConfig instead */
      reloadAgentConfig: () => Promise<{ success: boolean; data: AgentConfig }>
      /** @deprecated Use api.view.setDetailViewVisible instead */
      setDetailViewVisible: (visible: boolean) => Promise<void>
      /** @deprecated Use api.view.updateDetailViewBounds instead */
      updateDetailViewBounds: (bounds: DetailViewBounds) => Promise<void>
      /** @deprecated Use api.history.showHistoryView instead */
      showHistoryView: (screenshotBase64: string) => Promise<void>
      /** @deprecated Use api.history.hideHistoryView instead */
      hideHistoryView: () => Promise<void>
      /** @deprecated Use api.view.getCurrentUrl instead */
      getCurrentUrl: () => Promise<string>
      /** @deprecated Use api.view.onUrlChange instead */
      onUrlChange: (callback: (url: string) => void) => void
      /** @deprecated Use api.util.invoke instead */
      invoke: (channel: string, ...args: any[]) => Promise<any>
      /** @deprecated Use api.util.onTaskExecutionComplete instead */
      onTaskExecutionComplete: (callback: (event: any) => void) => void
      /** @deprecated Use api.util.onOpenHistoryPanel instead */
      onOpenHistoryPanel: (callback: (event: any) => void) => void
      /** @deprecated Use api.util.onTaskAbortedBySystem instead */
      onTaskAbortedBySystem: (callback: (event: any) => void) => void
      /** @deprecated Use api.eko.mcpRegisterServer instead */
      mcpRegisterServer: (server: MCPServer) => Promise<{ success: boolean; error?: string }>
      /** @deprecated Use api.eko.mcpGetServers instead */
      mcpGetServers: () => Promise<{ success: boolean; servers?: MCPServer[]; error?: string }>
      /** @deprecated Use api.eko.mcpGetServer instead */
      mcpGetServer: (serverId: string) => Promise<{ success: boolean; server?: MCPServer; error?: string }>
      /** @deprecated Use api.eko.mcpConnectServer instead */
      mcpConnectServer: (serverId: string) => Promise<{ success: boolean; error?: string }>
      /** @deprecated Use api.eko.mcpDisconnectServer instead */
      mcpDisconnectServer: (serverId: string) => Promise<{ success: boolean; error?: string }>
      /** @deprecated Use api.eko.mcpGetAvailableTools instead */
      mcpGetAvailableTools: () => Promise<{ success: boolean; tools?: MCPToolInfo[]; error?: string }>
      /** @deprecated Use api.eko.mcpGetServerTools instead */
      mcpGetServerTools: (serverId: string) => Promise<{ success: boolean; tools?: MCPToolInfo[]; error?: string }>
      /** @deprecated Use api.eko.mcpSetToolEnabled instead */
      mcpSetToolEnabled: (toolId: string, enabled: boolean) => Promise<{ success: boolean; error?: string }>
      /** @deprecated Use api.eko.mcpExecuteTool instead */
      mcpExecuteTool: (toolId: string, args: Record<string, any>) => Promise<{ success: boolean; data?: any; error?: string }>
      /** @deprecated Use api.eko.mcpGetConnectionStatus instead */
      mcpGetConnectionStatus: () => Promise<{ success: boolean; statuses?: MCPClientStatus[]; error?: string }>
      /** @deprecated Use api.eko.mcpRefreshServerTools instead */
      mcpRefreshServerTools: (serverId: string) => Promise<{ success: boolean; toolCount?: number; error?: string }>
      /** @deprecated Use api.eko.mcpHealthCheck instead */
      mcpHealthCheck: () => Promise<{ success: boolean; health?: { healthy: number; unhealthy: number; total: number }; error?: string }>
    }
    // PDF.js type declarations
    pdfjsLib?: {
      GlobalWorkerOptions: {
        workerSrc: string;
      };
      getDocument: (params: any) => {
        promise: Promise<{
          numPages: number;
          getPage: (pageNum: number) => Promise<{
            getTextContent: () => Promise<{
              items: Array<{ str: string; [key: string]: any }>;
            }>;
          }>;
        }>;
      };
    };
  }
}

export {} 