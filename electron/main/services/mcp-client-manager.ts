/**
 * Phase 3: MCP Client Manager
 * Manages Model Context Protocol (MCP) client lifecycle and tool discovery
 *
 * Key Features:
 * - Initialize and maintain MCP client connections
 * - Discover available tools from MCP servers
 * - Register tools with Eko agents
 * - Monitor tool availability and health
 * - Handle connection failures and recovery
 * - Cache tool metadata for performance
 */

import { Log } from '@jarvis-agent/core';
import type { Agent } from '@jarvis-agent/eko';

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  connectionType: 'sse' | 'stdio' | 'websocket';
  timeout: number;
  maxRetries: number;
}

export interface MCPToolInfo {
  name: string;
  description: string;
  serverId: string;
  serverName: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
  enabled: boolean;
  lastDiscovered: number;
}

export interface MCPClientStatus {
  serverId: string;
  serverName: string;
  isConnected: boolean;
  lastConnected: number;
  lastError?: string;
  toolCount: number;
}

interface MCPClientInstance {
  client: any;
  serverId: string;
  serverName: string;
  tools: Map<string, MCPToolInfo>;
  isConnected: boolean;
  lastConnected: number;
  retryCount: number;
}

class MCPClientManagerService {
  private clients: Map<string, MCPClientInstance> = new Map();
  private servers: Map<string, MCPServer> = new Map();
  private toolRegistry: Map<string, MCPToolInfo> = new Map();
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly TOOL_CACHE_TTL = 60 * 60 * 1000; // 1 hour
  private readonly RECONNECT_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Register an MCP server configuration
   */
  async registerServer(server: MCPServer): Promise<void> {
    this.servers.set(server.id, server);
    Log.info(`[MCP] Registered server: ${server.name} (${server.url})`);

    if (server.enabled) {
      await this.connectToServer(server.id);
    }
  }

  /**
   * Get all registered servers
   */
  getServers(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get server by ID
   */
  getServer(serverId: string): MCPServer | undefined {
    return this.servers.get(serverId);
  }

  /**
   * Connect to MCP server and discover tools
   */
  async connectToServer(serverId: string): Promise<boolean> {
    const server = this.servers.get(serverId);
    if (!server) {
      Log.warn(`[MCP] Server not found: ${serverId}`);
      return false;
    }

    try {
      // Initialize MCP client based on connection type
      const client = await this.initializeClient(server);

      if (!client) {
        throw new Error(`Failed to initialize client for ${server.name}`);
      }

      // Discover tools from server
      const tools = await this.discoverTools(client, server);

      // Store client instance
      const clientInstance: MCPClientInstance = {
        client,
        serverId: server.id,
        serverName: server.name,
        tools: new Map(tools.map(t => [t.name, t])),
        isConnected: true,
        lastConnected: Date.now(),
        retryCount: 0,
      };

      this.clients.set(serverId, clientInstance);

      // Register tools in tool registry
      for (const tool of tools) {
        this.toolRegistry.set(`${serverId}:${tool.name}`, tool);
      }

      Log.info(`[MCP] Connected to ${server.name}, discovered ${tools.length} tools`);

      // Clear retry timer if exists
      const timer = this.reconnectTimers.get(serverId);
      if (timer) {
        clearTimeout(timer);
        this.reconnectTimers.delete(serverId);
      }

      return true;
    } catch (error: any) {
      Log.error(`[MCP] Failed to connect to ${server.name}:`, error);

      const clientInstance = this.clients.get(serverId);
      if (clientInstance) {
        clientInstance.isConnected = false;
        clientInstance.retryCount++;
        clientInstance.lastConnected = Date.now();
      }

      // Schedule reconnection attempt
      this.scheduleReconnect(serverId);

      return false;
    }
  }

  /**
   * Schedule automatic reconnection
   */
  private scheduleReconnect(serverId: string): void {
    const server = this.servers.get(serverId);
    if (!server) return;

    const clientInstance = this.clients.get(serverId);
    if (clientInstance && clientInstance.retryCount >= this.MAX_RETRY_ATTEMPTS) {
      Log.warn(`[MCP] Max retries reached for ${server.name}, will retry in ${this.RECONNECT_INTERVAL}ms`);
    }

    // Clear existing timer if any
    const existingTimer = this.reconnectTimers.get(serverId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new reconnection
    const timer = setTimeout(() => {
      this.connectToServer(serverId).catch(error => {
        Log.error(`[MCP] Reconnection failed for ${server.name}:`, error);
      });
    }, this.RECONNECT_INTERVAL);

    this.reconnectTimers.set(serverId, timer);
  }

  /**
   * Initialize MCP client based on connection type
   */
  private async initializeClient(server: MCPServer): Promise<any> {
    try {
      if (server.connectionType === 'sse') {
        // Server-Sent Events (HTTP-based)
        const { SimpleSseMcpClient } = await import('@eko-ai/eko');
        return new SimpleSseMcpClient(server.url, {
          timeout: server.timeout,
        });
      } else if (server.connectionType === 'stdio') {
        // Standard Input/Output (process-based)
        // Would require spawning subprocess and managing lifecycle
        Log.warn(`[MCP] STDIO connections not yet implemented: ${server.name}`);
        return null;
      } else if (server.connectionType === 'websocket') {
        // WebSocket (bidirectional)
        // Would require WebSocket client implementation
        Log.warn(`[MCP] WebSocket connections not yet implemented: ${server.name}`);
        return null;
      }

      return null;
    } catch (error: any) {
      Log.error(`[MCP] Error initializing client for ${server.name}:`, error);
      return null;
    }
  }

  /**
   * Discover available tools from MCP server
   */
  private async discoverTools(client: any, server: MCPServer): Promise<MCPToolInfo[]> {
    try {
      // Query server for available tools
      // This depends on the MCP server's API
      const response = await client.callTool('list_tools', {});

      if (!response || !Array.isArray(response.tools)) {
        Log.warn(`[MCP] Invalid tool list response from ${server.name}`);
        return [];
      }

      const tools: MCPToolInfo[] = response.tools.map((toolDef: any) => ({
        name: toolDef.name,
        description: toolDef.description || '',
        serverId: server.id,
        serverName: server.name,
        inputSchema: toolDef.inputSchema || {
          type: 'object',
          properties: {},
          required: [],
        },
        enabled: true,
        lastDiscovered: Date.now(),
      }));

      return tools;
    } catch (error: any) {
      Log.error(`[MCP] Error discovering tools from ${server.name}:`, error);
      return [];
    }
  }

  /**
   * Get all available tools across all servers
   */
  getAvailableTools(): MCPToolInfo[] {
    const tools: MCPToolInfo[] = [];

    for (const tool of this.toolRegistry.values()) {
      if (tool.enabled) {
        tools.push(tool);
      }
    }

    return tools;
  }

  /**
   * Get tools from specific server
   */
  getServerTools(serverId: string): MCPToolInfo[] {
    const clientInstance = this.clients.get(serverId);
    if (!clientInstance) {
      return [];
    }

    return Array.from(clientInstance.tools.values()).filter(t => t.enabled);
  }

  /**
   * Enable/disable tool
   */
  setToolEnabled(toolId: string, enabled: boolean): void {
    const tool = this.toolRegistry.get(toolId);
    if (tool) {
      tool.enabled = enabled;
      Log.info(`[MCP] Tool ${tool.name} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Register MCP tools with an agent
   */
  async registerToolsWithAgent(agent: Agent, serverIds?: string[]): Promise<number> {
    let toolsRegistered = 0;

    try {
      const tools = serverIds
        ? serverIds.flatMap(id => this.getServerTools(id))
        : this.getAvailableTools();

      for (const tool of tools) {
        // Convert MCPToolInfo to Agent tool format
        const agentTool = {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
          execute: async (args: any) => {
            // Route execution to appropriate MCP server
            const clientInstance = this.clients.get(tool.serverId);
            if (!clientInstance || !clientInstance.isConnected) {
              throw new Error(`MCP server ${tool.serverName} is not connected`);
            }

            try {
              const result = await clientInstance.client.callTool(tool.name, args);
              return {
                success: true,
                content: result,
                metadata: {
                  serverId: tool.serverId,
                  serverName: tool.serverName,
                  toolName: tool.name,
                },
              };
            } catch (error: any) {
              return {
                success: false,
                error: error.message,
                metadata: {
                  serverId: tool.serverId,
                  serverName: tool.serverName,
                  toolName: tool.name,
                },
              };
            }
          },
        };

        // Add tool to agent if not duplicate
        if (!agent.tools.find(t => t.name === agentTool.name)) {
          agent.tools.push(agentTool as any);
          toolsRegistered++;
        }
      }

      Log.info(`[MCP] Registered ${toolsRegistered} tools with agent ${agent.name}`);
      return toolsRegistered;
    } catch (error: any) {
      Log.error(`[MCP] Error registering tools with agent:`, error);
      return 0;
    }
  }

  /**
   * Get connection status for all servers
   */
  getConnectionStatus(): MCPClientStatus[] {
    const statuses: MCPClientStatus[] = [];

    for (const [serverId, clientInstance] of this.clients.entries()) {
      statuses.push({
        serverId: clientInstance.serverId,
        serverName: clientInstance.serverName,
        isConnected: clientInstance.isConnected,
        lastConnected: clientInstance.lastConnected,
        toolCount: clientInstance.tools.size,
      });
    }

    return statuses;
  }

  /**
   * Refresh tools from specific server
   */
  async refreshServerTools(serverId: string): Promise<number> {
    const server = this.servers.get(serverId);
    if (!server) {
      return 0;
    }

    // Disconnect and reconnect
    await this.disconnectFromServer(serverId);
    const connected = await this.connectToServer(serverId);

    if (connected) {
      const clientInstance = this.clients.get(serverId);
      return clientInstance?.tools.size || 0;
    }

    return 0;
  }

  /**
   * Disconnect from MCP server
   */
  async disconnectFromServer(serverId: string): Promise<void> {
    const clientInstance = this.clients.get(serverId);
    if (!clientInstance) {
      return;
    }

    try {
      if (clientInstance.client && typeof clientInstance.client.close === 'function') {
        await clientInstance.client.close();
      }

      // Remove from registry
      for (const tool of clientInstance.tools.values()) {
        this.toolRegistry.delete(`${serverId}:${tool.name}`);
      }

      this.clients.delete(serverId);
      Log.info(`[MCP] Disconnected from ${clientInstance.serverName}`);
    } catch (error: any) {
      Log.error(`[MCP] Error disconnecting from ${clientInstance.serverName}:`, error);
    }

    // Clear retry timer
    const timer = this.reconnectTimers.get(serverId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(serverId);
    }
  }

  /**
   * Disconnect all servers
   */
  async disconnectAll(): Promise<void> {
    const serverIds = Array.from(this.clients.keys());
    for (const serverId of serverIds) {
      await this.disconnectFromServer(serverId);
    }
  }

  /**
   * Execute tool on MCP server (direct call)
   */
  async executeTool(toolId: string, args: Record<string, any>): Promise<any> {
    const tool = this.toolRegistry.get(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    const clientInstance = this.clients.get(tool.serverId);
    if (!clientInstance || !clientInstance.isConnected) {
      throw new Error(`MCP server ${tool.serverName} is not connected`);
    }

    try {
      const result = await clientInstance.client.callTool(tool.name, args);
      return {
        success: true,
        data: result,
        metadata: {
          serverId: tool.serverId,
          serverName: tool.serverName,
          toolName: tool.name,
          executedAt: Date.now(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          serverId: tool.serverId,
          serverName: tool.serverName,
          toolName: tool.name,
          executedAt: Date.now(),
        },
      };
    }
  }

  /**
   * Health check - verify all connected servers
   */
  async healthCheck(): Promise<{ healthy: number; unhealthy: number; total: number }> {
    let healthy = 0;
    let unhealthy = 0;

    for (const [serverId] of this.servers.entries()) {
      const clientInstance = this.clients.get(serverId);
      if (clientInstance && clientInstance.isConnected) {
        healthy++;
      } else {
        unhealthy++;
      }
    }

    const total = healthy + unhealthy;
    Log.info(`[MCP] Health check: ${healthy}/${total} servers healthy`);

    return { healthy, unhealthy, total };
  }
}

// Export singleton instance
export const mcpClientManager = new MCPClientManagerService();
export { MCPClientManagerService };
