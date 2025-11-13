import React, { useEffect, useState } from 'react'
import { Card, Spin, Tag, Empty, Switch, Space, Button, Tooltip } from 'antd'
import { ReloadOutlined, DisconnectOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import type { MCPServer, MCPToolInfo, MCPClientStatus } from '../type'

interface MCPToolSelectorProps {
  onToolsUpdate?: (tools: MCPToolInfo[]) => void
}

/**
 * MCP Tool Selector Component
 *
 * Provides UI for:
 * - Viewing registered MCP servers
 * - Managing tool availability
 * - Checking connection status
 * - Refreshing tools from servers
 */
export const MCPToolSelector: React.FC<MCPToolSelectorProps> = ({ onToolsUpdate }) => {
  const [servers, setServers] = useState<MCPServer[]>([])
  const [tools, setTools] = useState<MCPToolInfo[]>([])
  const [statuses, setStatuses] = useState<MCPClientStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Fetch all data on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [serversResp, toolsResp, statusResp] = await Promise.all([
        window.api.mcp.getServers(),
        window.api.mcp.getAvailableTools(),
        window.api.mcp.getConnectionStatus(),
      ])

      if (serversResp.success && serversResp.servers) {
        setServers(serversResp.servers)
      }

      if (toolsResp.success && toolsResp.tools) {
        setTools(toolsResp.tools)
        onToolsUpdate?.(toolsResp.tools)
      }

      if (statusResp.success && statusResp.statuses) {
        setStatuses(statusResp.statuses)
      }
    } catch (error) {
      console.error('Failed to load MCP data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshTools = async (serverId: string) => {
    setRefreshing(true)
    try {
      const resp = await window.api.mcp.refreshServerTools(serverId)
      if (resp.success) {
        await loadData()
      }
    } catch (error) {
      console.error('Failed to refresh tools:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleDisconnect = async (serverId: string) => {
    try {
      const resp = await window.api.mcp.disconnectServer(serverId)
      if (resp.success) {
        await loadData()
      }
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }

  const handleToggleTool = async (toolId: string, enabled: boolean) => {
    try {
      const resp = await window.api.mcp.setToolEnabled(toolId, !enabled)
      if (resp.success) {
        setTools(prev =>
          prev.map(t =>
            `${t.serverId}:${t.name}` === toolId ? { ...t, enabled: !enabled } : t
          )
        )
      }
    } catch (error) {
      console.error('Failed to toggle tool:', error)
    }
  }

  const getStatusIcon = (status: MCPClientStatus) => {
    if (status.isConnected) {
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />
    }
    return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin tip="Loading MCP tools..." />
      </div>
    )
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>MCP Tools Manager</h2>

      {/* Connection Status */}
      {statuses.length > 0 && (
        <Card title="Connection Status" style={{ marginBottom: '20px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {statuses.map(status => (
              <div key={status.serverId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  {getStatusIcon(status)}
                  <span>{status.serverName}</span>
                  <Tag color={status.isConnected ? 'green' : 'red'}>
                    {status.isConnected ? 'Connected' : 'Disconnected'}
                  </Tag>
                  <span style={{ fontSize: '12px', color: '#999' }}>
                    {status.toolCount} tools
                  </span>
                </Space>

                <Space>
                  {status.isConnected && (
                    <Tooltip title="Refresh tools from this server">
                      <Button
                        size="small"
                        icon={<ReloadOutlined />}
                        loading={refreshing}
                        onClick={() => handleRefreshTools(status.serverId)}
                      />
                    </Tooltip>
                  )}
                  <Tooltip title="Disconnect from server">
                    <Button
                      size="small"
                      danger
                      icon={<DisconnectOutlined />}
                      onClick={() => handleDisconnect(status.serverId)}
                    />
                  </Tooltip>
                </Space>
              </div>
            ))}
          </Space>
        </Card>
      )}

      {/* Tools List */}
      {tools.length > 0 ? (
        <Card title={`Available Tools (${tools.length})`}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {tools.map(tool => {
              const toolId = `${tool.serverId}:${tool.name}`
              return (
                <div
                  key={toolId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    padding: '12px',
                    border: '1px solid #f0f0f0',
                    borderRadius: '4px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold' }}>{tool.name}</div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      {tool.description}
                    </div>
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      <span>Server: {tool.serverName}</span>
                    </div>
                  </div>

                  <Switch
                    checked={tool.enabled}
                    onChange={() => handleToggleTool(toolId, tool.enabled)}
                  />
                </div>
              )
            })}
          </Space>
        </Card>
      ) : (
        <Empty description="No MCP tools available" />
      )}

      {/* Refresh All Button */}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={loadData}
        >
          Refresh All
        </Button>
      </div>
    </div>
  )
}

export default MCPToolSelector
