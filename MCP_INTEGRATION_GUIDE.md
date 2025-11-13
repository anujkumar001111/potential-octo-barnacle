/**
 * Phase 3: MCP Tool Integration Guide
 *
 * This guide documents how to integrate the MCP Tool Selector component
 * and use the MCP API in your React application.
 */

// ============================================================================
// 1. BASIC USAGE IN REACT COMPONENTS
// ============================================================================

import MCPToolSelector from '@/components/MCPToolSelector'

export function MyDashboard() {
  const handleToolsUpdate = (tools: MCPToolInfo[]) => {
    console.log('Available tools updated:', tools)
    // Use tools for agent configuration, etc.
  }

  return (
    <div>
      <MCPToolSelector onToolsUpdate={handleToolsUpdate} />
    </div>
  )
}

// ============================================================================
// 2. DIRECT API USAGE
// ============================================================================

// Get all registered MCP servers
const serversResp = await window.api.mcp.getServers()
if (serversResp.success) {
  console.log('Available servers:', serversResp.servers)
}

// Register a new server
const server = {
  id: 'my-server',
  name: 'My MCP Server',
  url: 'http://localhost:8080',
  enabled: true,
  connectionType: 'sse' as const,
  timeout: 5000,
  maxRetries: 3,
}

const registerResp = await window.api.mcp.registerServer(server)
if (registerResp.success) {
  console.log('Server registered')
}

// ============================================================================
// 3. TOOL MANAGEMENT
// ============================================================================

// Get all available tools (enabled only)
const toolsResp = await window.api.mcp.getAvailableTools()
if (toolsResp.success) {
  const tools = toolsResp.tools || []
  console.log(`Found ${tools.length} available tools`)
}

// Get tools from specific server
const serverToolsResp = await window.api.mcp.getServerTools('my-server')
if (serverToolsResp.success) {
  const tools = serverToolsResp.tools || []
  console.log(`Server has ${tools.length} tools`)
}

// Enable/disable a tool
const toolId = 'my-server:my-tool'
const enableResp = await window.api.mcp.setToolEnabled(toolId, true)
if (enableResp.success) {
  console.log('Tool enabled')
}

// Execute a tool
const executeResp = await window.api.mcp.executeTool(toolId, {
  param1: 'value1',
  param2: 'value2',
})
if (executeResp.success) {
  console.log('Tool execution result:', executeResp.data)
}

// ============================================================================
// 4. CONNECTION MANAGEMENT
// ============================================================================

// Get connection status for all servers
const statusResp = await window.api.mcp.getConnectionStatus()
if (statusResp.success) {
  statusResp.statuses?.forEach(status => {
    console.log(`${status.serverName}: ${status.isConnected ? 'Connected' : 'Disconnected'}`)
  })
}

// Connect to a server
const connectResp = await window.api.mcp.connectServer('my-server')
if (connectResp.success) {
  console.log('Connected to server')
}

// Disconnect from a server
const disconnectResp = await window.api.mcp.disconnectServer('my-server')
if (disconnectResp.success) {
  console.log('Disconnected from server')
}

// Refresh tools from a server
const refreshResp = await window.api.mcp.refreshServerTools('my-server')
if (refreshResp.success) {
  console.log(`Refreshed ${refreshResp.toolCount} tools`)
}

// ============================================================================
// 5. HEALTH MONITORING
// ============================================================================

// Health check on all servers
const healthResp = await window.api.mcp.healthCheck()
if (healthResp.success) {
  const health = healthResp.health
  console.log(`Health: ${health?.healthy}/${health?.total} servers healthy`)
}

// ============================================================================
// 6. INTEGRATION WITH AGENT SYSTEM
// ============================================================================

import { useEffect, useState } from 'react'
import type { MCPToolInfo } from '@/type'

export function AgentConfigPanel() {
  const [availableTools, setAvailableTools] = useState<MCPToolInfo[]>([])

  useEffect(() => {
    loadTools()
  }, [])

  const loadTools = async () => {
    const resp = await window.api.mcp.getAvailableTools()
    if (resp.success && resp.tools) {
      setAvailableTools(resp.tools)
    }
  }

  // Use availableTools to configure agent capabilities
  const configureAgent = (agentName: string) => {
    const toolsForAgent = availableTools.filter(t =>
      // Your custom filtering logic
      t.enabled
    )

    // Pass to agent configuration
    window.api.agent.saveAgentConfig({
      name: agentName,
      tools: toolsForAgent.map(t => t.name),
      // ... other config
    })
  }

  return (
    <div>
      <h3>Available MCP Tools: {availableTools.length}</h3>
      {/* Render tool list */}
    </div>
  )
}

// ============================================================================
// 7. ERROR HANDLING
// ============================================================================

async function safeToolExecution(toolId: string, args: Record<string, any>) {
  try {
    const resp = await window.api.mcp.executeTool(toolId, args)

    if (!resp.success) {
      console.error('Tool execution failed:', resp.error)
      return null
    }

    return resp.data
  } catch (error) {
    console.error('Error executing tool:', error)
    return null
  }
}

// ============================================================================
// 8. TYPE DEFINITIONS
// ============================================================================

// From src/type.d.ts:
interface MCPServer {
  id: string
  name: string
  url: string
  enabled: boolean
  connectionType: 'sse' | 'stdio' | 'websocket'
  timeout: number
  maxRetries: number
}

interface MCPToolInfo {
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

interface MCPClientStatus {
  serverId: string
  serverName: string
  isConnected: boolean
  lastConnected: number
  lastError?: string
  toolCount: number
}
