import React, { useState } from 'react';
import { Collapse, Tag, Tooltip, Button, Drawer, Divider } from 'antd';
import { ArrowRightOutlined, ExpandOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

/**
 * Agent Context Transfer Indicator Component
 * Visualizes context transfers between agents in the chat stream
 * Shows handoff events with context data and transfer metadata
 */

export interface ContextTransferData {
  fromAgent: string;
  toAgent: string;
  timestamp: number;
  context: Record<string, any>;
  variables: Record<string, any>;
  handoffReason?: string;
  dataSize?: number;
}

interface AgentContextTransferProps {
  transfer: ContextTransferData;
}

interface ContextDataViewerProps {
  data: Record<string, any>;
}

/**
 * Helper component to display context data in structured format
 */
const ContextDataViewer: React.FC<ContextDataViewerProps> = ({ data }) => {
  const entries = Object.entries(data);

  if (entries.length === 0) {
    return <span className="text-gray-400 text-sm">No context data</span>;
  }

  return (
    <div className="space-y-2 bg-gray-50 rounded p-3">
      {entries.map(([key, value]) => (
        <div key={key} className="text-sm">
          <span className="font-mono bg-gray-200 px-2 py-1 rounded text-gray-800">
            {key}
          </span>
          <span className="ml-2 text-gray-700">
            {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * Main Agent Context Transfer visualization component
 */
export const AgentContextTransfer: React.FC<AgentContextTransferProps> = ({ transfer }) => {
  const { t } = useTranslation('chat');
  const [showDetails, setShowDetails] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['context']);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDataSize = (bytes?: number) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  };

  // Create details items for Collapse component
  const detailsItems = [
    {
      key: 'context',
      label: <span className="font-semibold">Context Data ({Object.keys(transfer.context).length} fields)</span>,
      children: <ContextDataViewer data={transfer.context} />,
      extra: transfer.context ? Object.keys(transfer.context).length : 0,
    },
    {
      key: 'variables',
      label: <span className="font-semibold">Variables ({Object.keys(transfer.variables).length} items)</span>,
      children: <ContextDataViewer data={transfer.variables} />,
      extra: transfer.variables ? Object.keys(transfer.variables).length : 0,
    },
  ];

  return (
    <>
      {/* Inline Context Transfer Indicator */}
      <div
        className="my-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setShowDetails(true)}
        role="region"
        aria-label={`Agent context transfer from ${transfer.fromAgent} to ${transfer.toAgent}`}
      >
        {/* Header with agent names and arrow */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 flex-1">
            {/* From Agent */}
            <Tag
              color="blue"
              className="text-sm font-semibold"
              aria-label={`From agent: ${transfer.fromAgent}`}
            >
              {transfer.fromAgent}
            </Tag>

            {/* Transfer Arrow */}
            <div className="flex items-center gap-1 text-blue-600">
              <ArrowRightOutlined className="text-lg" />
              <span className="text-xs font-medium">transfer</span>
            </div>

            {/* To Agent */}
            <Tag
              color="cyan"
              className="text-sm font-semibold"
              aria-label={`To agent: ${transfer.toAgent}`}
            >
              {transfer.toAgent}
            </Tag>
          </div>

          {/* Expand button */}
          <Tooltip title="View details">
            <Button
              type="text"
              size="small"
              icon={<ExpandOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(true);
              }}
              className="!text-blue-600 hover:!text-blue-700"
              aria-label="Expand context transfer details"
            />
          </Tooltip>
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <span className="font-mono">{formatTimestamp(transfer.timestamp)}</span>
          {transfer.handoffReason && (
            <span className="italic text-gray-700">Reason: {transfer.handoffReason}</span>
          )}
          {transfer.dataSize && (
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
              {formatDataSize(transfer.dataSize)}
            </span>
          )}
        </div>

        {/* Summary preview */}
        <div className="mt-2 text-xs text-gray-600">
          <span>
            Context: {Object.keys(transfer.context).length} fields
            {transfer.variables && Object.keys(transfer.variables).length > 0 && (
              <> • Variables: {Object.keys(transfer.variables).length} items</>
            )}
          </span>
        </div>
      </div>

      {/* Detailed View Drawer */}
      <Drawer
        title={`Context Transfer: ${transfer.fromAgent} → ${transfer.toAgent}`}
        placement="right"
        onClose={() => setShowDetails(false)}
        open={showDetails}
        width={600}
        className="context-transfer-drawer"
      >
        {/* Header Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">From Agent</label>
              <Tag color="blue" className="mt-1">
                {transfer.fromAgent}
              </Tag>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">To Agent</label>
              <Tag color="cyan" className="mt-1">
                {transfer.toAgent}
              </Tag>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Timestamp</label>
              <p className="text-sm font-mono mt-1">{formatTimestamp(transfer.timestamp)}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Data Size</label>
              <p className="text-sm font-mono mt-1">
                {formatDataSize(transfer.dataSize) || 'N/A'}
              </p>
            </div>
          </div>

          {transfer.handoffReason && (
            <>
              <Divider className="my-3" />
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Handoff Reason</label>
                <p className="text-sm mt-1 text-gray-700">{transfer.handoffReason}</p>
              </div>
            </>
          )}
        </div>

        <Divider />

        {/* Collapsible Details */}
        <Collapse
          items={detailsItems}
          activeKey={expandedSections}
          onChange={(keys) => setExpandedSections(keys as string[])}
          accordion={false}
        />

        {/* Summary Footer */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-gray-600">
            <strong>Summary:</strong> Context transfer completed successfully with{' '}
            {Object.keys(transfer.context).length} context fields and{' '}
            {Object.keys(transfer.variables).length} variables transferred from {transfer.fromAgent} to{' '}
            {transfer.toAgent}.
          </p>
        </div>
      </Drawer>
    </>
  );
};

export default AgentContextTransfer;
