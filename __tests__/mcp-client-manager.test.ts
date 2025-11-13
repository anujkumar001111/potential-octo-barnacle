import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'

// Mock the jarvis-agent modules before importing the manager
jest.mock('@jarvis-agent/core', () => ({
  Log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}), { virtual: true })

// Mock SimpleSseMcpClient to prevent actual network calls
class MockSimpleSseMcpClient {
  constructor() {}
  async close() {}
}

jest.mock('@jarvis-agent/eko', () => ({
  SimpleSseMcpClient: MockSimpleSseMcpClient,
}), { virtual: true })

// Now import the manager class
import type { MCPServer, MCPToolInfo } from '../electron/main/services/mcp-client-manager'
import { MCPClientManagerService } from '../electron/main/services/mcp-client-manager'

describe('MCPClientManager', () => {
  let manager: MCPClientManagerService

  beforeEach(() => {
    manager = new MCPClientManagerService()
  })

  afterEach(() => {
    // Clear internal state by resetting maps
    ;(manager as any).clients.clear()
    ;(manager as any).toolRegistry.clear()
    ;(manager as any).servers.clear()
  })

  describe('Server Registration', () => {
    it('should register an MCP server', async () => {
      const server: MCPServer = {
        id: 'test-server-1',
        name: 'Test Server',
        url: 'http://localhost:8080',
        enabled: false,
        connectionType: 'sse',
        timeout: 5000,
        maxRetries: 3,
      }

      await manager.registerServer(server)
      const registered = manager.getServer('test-server-1')

      expect(registered).toBeDefined()
      expect(registered?.name).toBe('Test Server')
      expect(registered?.url).toBe('http://localhost:8080')
    })

    it('should get all registered servers', async () => {
      const server1: MCPServer = {
        id: 'server-1',
        name: 'Server 1',
        url: 'http://localhost:8080',
        enabled: false,
        connectionType: 'sse',
        timeout: 5000,
        maxRetries: 3,
      }

      const server2: MCPServer = {
        id: 'server-2',
        name: 'Server 2',
        url: 'http://localhost:8081',
        enabled: false,
        connectionType: 'websocket',
        timeout: 5000,
        maxRetries: 3,
      }

      await manager.registerServer(server1)
      await manager.registerServer(server2)

      const servers = manager.getServers()

      expect(servers.length).toBe(2)
      expect(servers.some(s => s.id === 'server-1')).toBe(true)
      expect(servers.some(s => s.id === 'server-2')).toBe(true)
    })

    it('should get a specific server by ID', async () => {
      const server: MCPServer = {
        id: 'unique-server',
        name: 'Unique Server',
        url: 'http://localhost:9999',
        enabled: false,
        connectionType: 'sse',
        timeout: 5000,
        maxRetries: 3,
      }

      await manager.registerServer(server)
      const retrieved = manager.getServer('unique-server')

      expect(retrieved).toBeDefined()
      expect(retrieved?.name).toBe('Unique Server')
      expect(retrieved?.url).toBe('http://localhost:9999')
    })

    it('should return undefined for non-existent server', () => {
      const server = manager.getServer('non-existent')
      expect(server).toBeUndefined()
    })
  })

  describe('Tool Management', () => {
    it('should enable/disable tools', () => {
      const toolId = 'server-1:tool-1'

      ;(manager as any).toolRegistry.set(toolId, {
        name: 'tool-1',
        description: 'Test tool',
        serverId: 'server-1',
        serverName: 'Test Server',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
        enabled: true,
        lastDiscovered: Date.now(),
      })

      manager.setToolEnabled(toolId, false)
      let tool = (manager as any).toolRegistry.get(toolId)
      expect(tool.enabled).toBe(false)

      manager.setToolEnabled(toolId, true)
      tool = (manager as any).toolRegistry.get(toolId)
      expect(tool.enabled).toBe(true)
    })

    it('should get available tools (only enabled ones)', () => {
      const tools: MCPToolInfo[] = [
        {
          name: 'tool-1',
          description: 'Enabled tool',
          serverId: 'server-1',
          serverName: 'Server 1',
          inputSchema: { type: 'object', properties: {}, required: [] },
          enabled: true,
          lastDiscovered: Date.now(),
        },
        {
          name: 'tool-2',
          description: 'Disabled tool',
          serverId: 'server-1',
          serverName: 'Server 1',
          inputSchema: { type: 'object', properties: {}, required: [] },
          enabled: false,
          lastDiscovered: Date.now(),
        },
        {
          name: 'tool-3',
          description: 'Another enabled tool',
          serverId: 'server-2',
          serverName: 'Server 2',
          inputSchema: { type: 'object', properties: {}, required: [] },
          enabled: true,
          lastDiscovered: Date.now(),
        },
      ]

      // Directly set tools in registry
      const registry = (manager as any).toolRegistry
      tools.forEach(tool => {
        const key = `${tool.serverId}:${tool.name}`
        registry.set(key, tool)
      })

      // Verify tools were added
      expect(registry.size).toBe(3)

      // Now test getAvailableTools
      const available = manager.getAvailableTools()

      expect(available).toHaveLength(2)
      expect(available.every(t => t.enabled)).toBe(true)
      expect(available.some(t => t.name === 'tool-1')).toBe(true)
      expect(available.some(t => t.name === 'tool-3')).toBe(true)
    })

    it('should get tools from specific server', () => {
      const tools: MCPToolInfo[] = [
        {
          name: 'tool-1',
          description: 'Server 1 tool',
          serverId: 'server-1',
          serverName: 'Server 1',
          inputSchema: { type: 'object', properties: {}, required: [] },
          enabled: true,
          lastDiscovered: Date.now(),
        },
        {
          name: 'tool-2',
          description: 'Server 2 tool',
          serverId: 'server-2',
          serverName: 'Server 2',
          inputSchema: { type: 'object', properties: {}, required: [] },
          enabled: true,
          lastDiscovered: Date.now(),
        },
      ]

      const clientInstance = {
        client: {},
        serverId: 'server-1',
        serverName: 'Server 1',
        tools: new Map([['tool-1', tools[0]]]),
        isConnected: true,
        lastConnected: Date.now(),
        retryCount: 0,
      }

      ;(manager as any).clients.set('server-1', clientInstance)

      const serverTools = manager.getServerTools('server-1')

      expect(serverTools.length).toBe(1)
      expect(serverTools[0].name).toBe('tool-1')
      expect(serverTools[0].serverId).toBe('server-1')
    })

    it('should return empty array for non-existent server', () => {
      const tools = manager.getServerTools('non-existent')
      expect(tools).toEqual([])
    })
  })

  describe('Connection Status', () => {
    it('should get connection status for all servers', () => {
      const tool1: MCPToolInfo = {
        name: 'tool-1',
        description: 'Tool 1',
        serverId: 'server-1',
        serverName: 'Server 1',
        inputSchema: { type: 'object', properties: {}, required: [] },
        enabled: true,
        lastDiscovered: Date.now(),
      }

      const tool2: MCPToolInfo = {
        name: 'tool-2',
        description: 'Tool 2',
        serverId: 'server-2',
        serverName: 'Server 2',
        inputSchema: { type: 'object', properties: {}, required: [] },
        enabled: true,
        lastDiscovered: Date.now(),
      }

      const clientInstance1 = {
        client: {},
        serverId: 'server-1',
        serverName: 'Server 1',
        tools: new Map([['tool-1', tool1]]),
        isConnected: true,
        lastConnected: Date.now() - 10000,
        retryCount: 0,
      }

      const clientInstance2 = {
        client: {},
        serverId: 'server-2',
        serverName: 'Server 2',
        tools: new Map([['tool-2', tool2]]),
        isConnected: false,
        lastConnected: Date.now() - 20000,
        retryCount: 2,
      }

      ;(manager as any).clients.set('server-1', clientInstance1)
      ;(manager as any).clients.set('server-2', clientInstance2)

      const statuses = manager.getConnectionStatus()

      expect(statuses).toHaveLength(2)
      expect(statuses[0].serverId).toBe('server-1')
      expect(statuses[0].isConnected).toBe(true)
      expect(statuses[0].toolCount).toBe(1)
      expect(statuses[1].serverId).toBe('server-2')
      expect(statuses[1].isConnected).toBe(false)
      expect(statuses[1].toolCount).toBe(1)
    })

    it('should provide correct connection status details', () => {
      const now = Date.now()
      const clientInstance = {
        client: {},
        serverId: 'test-server',
        serverName: 'Test Server',
        tools: new Map(),
        isConnected: true,
        lastConnected: now,
        retryCount: 0,
      }

      ;(manager as any).clients.set('test-server', clientInstance)

      const statuses = manager.getConnectionStatus()
      const status = statuses[0]

      expect(status).toBeDefined()
      expect(status.serverName).toBe('Test Server')
      expect(status.isConnected).toBe(true)
      expect(status.lastConnected).toBe(now)
      expect(status.toolCount).toBe(0)
    })
  })

  describe('Health Check', () => {
    it('should perform health check on all servers', async () => {
      const server1: MCPServer = {
        id: 'server-1',
        name: 'Server 1',
        url: 'http://localhost:8080',
        enabled: true,
        connectionType: 'sse',
        timeout: 5000,
        maxRetries: 3,
      }

      const server2: MCPServer = {
        id: 'server-2',
        name: 'Server 2',
        url: 'http://localhost:8081',
        enabled: true,
        connectionType: 'sse',
        timeout: 5000,
        maxRetries: 3,
      }

      await manager.registerServer(server1)
      await manager.registerServer(server2)

      const clientInstance1 = {
        client: {},
        serverId: 'server-1',
        serverName: 'Server 1',
        tools: new Map(),
        isConnected: true,
        lastConnected: Date.now(),
        retryCount: 0,
      }

      const clientInstance2 = {
        client: {},
        serverId: 'server-2',
        serverName: 'Server 2',
        tools: new Map(),
        isConnected: false,
        lastConnected: Date.now(),
        retryCount: 3,
      }

      ;(manager as any).clients.set('server-1', clientInstance1)
      ;(manager as any).clients.set('server-2', clientInstance2)

      const health = await manager.healthCheck()

      expect(health.healthy).toBe(1)
      expect(health.unhealthy).toBe(1)
      expect(health.total).toBe(2)
    })

    it('should report zero healthy servers when none are connected', async () => {
      const server: MCPServer = {
        id: 'server-1',
        name: 'Server 1',
        url: 'http://localhost:8080',
        enabled: true,
        connectionType: 'sse',
        timeout: 5000,
        maxRetries: 3,
      }

      await manager.registerServer(server)

      const clientInstance = {
        client: {},
        serverId: 'server-1',
        serverName: 'Server 1',
        tools: new Map(),
        isConnected: false,
        lastConnected: Date.now(),
        retryCount: 3,
      }

      ;(manager as any).clients.set('server-1', clientInstance)

      const health = await manager.healthCheck()

      expect(health.healthy).toBe(0)
      expect(health.unhealthy).toBe(1)
      expect(health.total).toBe(1)
    })
  })

  describe('Disconnect Operations', () => {
    it('should disconnect from a specific server', async () => {
      const clientInstance = {
        client: {
          close: jest.fn().mockResolvedValue(undefined),
        },
        serverId: 'server-1',
        serverName: 'Server 1',
        tools: new Map([
          [
            'tool-1',
            {
              name: 'tool-1',
              description: 'Tool 1',
              serverId: 'server-1',
              serverName: 'Server 1',
              inputSchema: { type: 'object', properties: {}, required: [] },
              enabled: true,
              lastDiscovered: Date.now(),
            },
          ],
        ]),
        isConnected: true,
        lastConnected: Date.now(),
        retryCount: 0,
      }

      ;(manager as any).clients.set('server-1', clientInstance)
      ;(manager as any).toolRegistry.set('server-1:tool-1', clientInstance.tools.get('tool-1'))

      await manager.disconnectFromServer('server-1')

      expect((manager as any).clients.has('server-1')).toBe(false)
      expect((manager as any).toolRegistry.has('server-1:tool-1')).toBe(false)
    })

    it('should disconnect all servers', async () => {
      const clientInstance1 = {
        client: {
          close: jest.fn().mockResolvedValue(undefined),
        },
        serverId: 'server-1',
        serverName: 'Server 1',
        tools: new Map(),
        isConnected: true,
        lastConnected: Date.now(),
        retryCount: 0,
      }

      const clientInstance2 = {
        client: {
          close: jest.fn().mockResolvedValue(undefined),
        },
        serverId: 'server-2',
        serverName: 'Server 2',
        tools: new Map(),
        isConnected: true,
        lastConnected: Date.now(),
        retryCount: 0,
      }

      ;(manager as any).clients.set('server-1', clientInstance1)
      ;(manager as any).clients.set('server-2', clientInstance2)

      await manager.disconnectAll()

      expect((manager as any).clients.size).toBe(0)
    })

    it('should handle disconnect when client does not exist', async () => {
      await expect(manager.disconnectFromServer('non-existent')).resolves.not.toThrow()
    })
  })

  describe('Multiple Servers and Tools', () => {
    it('should manage tools from multiple servers', () => {
      const tools = [
        {
          name: 'tool-1',
          description: 'Server 1 Tool 1',
          serverId: 'server-1',
          serverName: 'Server 1',
          inputSchema: { type: 'object', properties: {}, required: [] },
          enabled: true,
          lastDiscovered: Date.now(),
        },
        {
          name: 'tool-2',
          description: 'Server 1 Tool 2',
          serverId: 'server-1',
          serverName: 'Server 1',
          inputSchema: { type: 'object', properties: {}, required: [] },
          enabled: true,
          lastDiscovered: Date.now(),
        },
        {
          name: 'tool-3',
          description: 'Server 2 Tool 1',
          serverId: 'server-2',
          serverName: 'Server 2',
          inputSchema: { type: 'object', properties: {}, required: [] },
          enabled: true,
          lastDiscovered: Date.now(),
        },
      ]

      tools.forEach(tool => {
        ;(manager as any).toolRegistry.set(`${tool.serverId}:${tool.name}`, tool)
      })

      const clientInstance1 = {
        client: {},
        serverId: 'server-1',
        serverName: 'Server 1',
        tools: new Map([
          ['tool-1', tools[0]],
          ['tool-2', tools[1]],
        ]),
        isConnected: true,
        lastConnected: Date.now(),
        retryCount: 0,
      }

      const clientInstance2 = {
        client: {},
        serverId: 'server-2',
        serverName: 'Server 2',
        tools: new Map([['tool-3', tools[2]]]),
        isConnected: true,
        lastConnected: Date.now(),
        retryCount: 0,
      }

      ;(manager as any).clients.set('server-1', clientInstance1)
      ;(manager as any).clients.set('server-2', clientInstance2)

      const server1Tools = manager.getServerTools('server-1')
      const server2Tools = manager.getServerTools('server-2')
      const allTools = manager.getAvailableTools()

      expect(server1Tools.length).toBe(2)
      expect(server2Tools.length).toBe(1)
      expect(allTools.length).toBe(3)
    })
  })

  describe('Tool Registry', () => {
    it('should maintain tool registry with correct format', () => {
      const tool: MCPToolInfo = {
        name: 'test-tool',
        description: 'A test tool',
        serverId: 'server-1',
        serverName: 'Server 1',
        inputSchema: {
          type: 'object',
          properties: {
            param1: { type: 'string' },
          },
          required: ['param1'],
        },
        enabled: true,
        lastDiscovered: Date.now(),
      }

      ;(manager as any).toolRegistry.set('server-1:test-tool', tool)

      const retrieved = (manager as any).toolRegistry.get('server-1:test-tool')

      expect(retrieved).toBeDefined()
      expect(retrieved.name).toBe('test-tool')
      expect(retrieved.serverId).toBe('server-1')
      expect(retrieved.inputSchema.properties.param1.type).toBe('string')
      expect(retrieved.inputSchema.required).toContain('param1')
    })
  })

  describe('Empty States', () => {
    it('should handle empty server list', () => {
      const servers = manager.getServers()
      expect(servers).toEqual([])
    })

    it('should handle empty tools list', () => {
      const tools = manager.getAvailableTools()
      expect(tools).toEqual([])
    })

    it('should handle empty connection status', () => {
      const statuses = manager.getConnectionStatus()
      expect(statuses).toEqual([])
    })

    it('should handle health check with no servers', async () => {
      const health = await manager.healthCheck()
      expect(health.healthy).toBe(0)
      expect(health.unhealthy).toBe(0)
      expect(health.total).toBe(0)
    })
  })
})
