import React, { useState } from 'react';
import { Typography, Button } from "antd";
import ReactMarkdown from "react-markdown";
import { Executing, Browser, Search, DataAnalysis, ExpandCollapse, DeepThinking, FinishStatus, RuningStatus, Atlas } from '../../icons/deepfundai-icons';
import { DisplayMessage, AgentGroupMessage, ToolAction, AgentMessage } from '../../models';
import { useTranslation } from 'react-i18next';
import { AgentContextTransfer, ContextTransferData } from './AgentContextTransfer';

const { Text } = Typography;

interface MessageDisplayProps {
  message: DisplayMessage;
  onToolClick?: (message: ToolAction) => void;
}

// Workflow display component
const WorkflowDisplay = ({ workflow }: { workflow: any }) => {
  const { t } = useTranslation('chat');
  if (!workflow) return null;

  // Check if thought is completed by whether agents field exists and has content
  const isThoughtCompleted = workflow.agents && workflow.agents.length > 0;

  return (
    <div className="workflow-display space-y-4" role="region" aria-label={t('workflow_region')}>
      <div className='flex items-center gap-2'>
        <Atlas />
        <span className="text-lg font-bold" aria-label={t('atlas_label')}>Atlas</span>
      </div>

      {/* Thinking process - dark theme style */}
      {workflow.thought && (
        <ThinkingDisplay content={workflow.thought} isCompleted={isThoughtCompleted} />
      )}

      {/* Agent list - STEP format */}
      {workflow.agents && workflow.agents.length > 0 && (
        <div className="space-y-3" role="list" aria-label={t('agent_list')}>
          {workflow.agents.map((agent: any, index: number) => (
            <StepAgentDisplay key={agent.id || index} agent={agent} stepNumber={index + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// Safely render node text
const renderNodeText = (node: any, t: any): string => {
  if (typeof node === 'string') {
    return node;
  }
  if (typeof node === 'object' && node !== null) {
    if (node.text && typeof node.text === 'string') {
      return node.text;
    }
    // If no text property or empty, return default text
    return t('step_description');
  }
  return String(node || t('step_description'));
};

// Thinking display component
const ThinkingDisplay = ({ content, isCompleted = false }: { content: string; isCompleted?: boolean }) => {
  const { t } = useTranslation('chat');
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-thinking rounded-lg p-4" role="region" aria-label={t('thinking_region')}>
      {/* Header */}
      <div
        className="flex items-center justify-start gap-1 cursor-pointer mb-3"
        onClick={() => setCollapsed(!collapsed)}
        role="button"
        aria-expanded={!collapsed}
        aria-label={collapsed ? t('expand_thinking') : t('collapse_thinking')}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setCollapsed(!collapsed);
          }
        }}
      >
        <div className="flex items-center space-x-2">
          {isCompleted ? (
            <FinishStatus />
          ) : (
            <DeepThinking />
          )}
          <span className="text-white font-medium text-sm">{t('thinking')}</span>
        </div>
        <Button
          type="text"
          size="small"
          icon={collapsed ? <ExpandCollapse className=' rotate-180' /> : <ExpandCollapse />}
          className="!text-gray-400 hover:!text-white"
          aria-label={collapsed ? t('expand') : t('collapse')}
        />
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="text-sm text-text-12-dark leading-relaxed" aria-live="polite">
          {content}
        </div>
      )}
    </div>
  );
};

// STEP format Agent display component
const StepAgentDisplay = ({ agent, stepNumber }: { agent: any; stepNumber: number }) => {
  const { t } = useTranslation('chat');

  return (
    <div className="step-agent-display text-base" role="listitem">
      {/* Agent information - status display removed */}
      <div className="px-2 border-l-2 border-text-05-dark mb-3">
        <div className="flex items-center gap-1 text-text-05-dark font-semibold " role="heading" aria-level={3}>
          <DeepThinking />
          {agent.name} {t('agent')}
        </div>
        <div className="mt-1" aria-label={t('agent_task', { task: agent.task })}>
          {agent.task}
        </div>
      </div>

      {/* Execution steps - STEP format */}
      {agent.nodes && agent.nodes.length > 0 && (
        <div className="space-y-2" role="list" aria-label={t('execution_steps')}>
          {agent.nodes.map((node: any, nodeIndex: number) => (
            <div key={nodeIndex} className="step-item flex items-center justify-start gap-2 mt-3" role="listitem">
              <span className="font-semibold w-5 h-5 bg-step rounded-full flex items-center justify-center" aria-label={t('step_number', { number: nodeIndex + 1 })}>
                {nodeIndex + 1}
              </span>
              <span className='line-clamp-1 flex-1' aria-label={t('step_description', { description: renderNodeText(node, t) })}>
                {renderNodeText(node, t)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Tool related components
const ToolDisplay = ({
  message,
  onToolClick
}: {
  message: ToolAction;
  onToolClick: (message: ToolAction) => void;
}) => {
  const { t } = useTranslation('chat');

  // Tool icon mapping (can do approximate matching based on common tool names)
  const getToolIcon = (toolName?: string) => {
    const name = (toolName || '').toLowerCase();
    if (name.includes('navigate') || name.includes('extract') || name.includes('browser')) return <Browser />;
    if (name.includes('search')) return <Search />;
    if (name.includes('analy') || name.includes('data')) return <DataAnalysis />;
    return <Executing />;
  };

  // Get status text for screen readers
  const getStatusText = () => {
    switch (message.status) {
      case 'running':
        return t('tool_running_status');
      case 'completed':
        return t('tool_completed_status');
      case 'error':
        return t('tool_error_status');
      default:
        return t('tool_unknown_status');
    }
  };

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-2 bg-tool-call rounded-md border text-xs border-border-message text-text-12-dark cursor-pointer hover:bg-opacity-80 transition-colors"
      onClick={() => onToolClick(message)}
      role="button"
      aria-label={t('tool_execution_label', { toolName: message.toolName || 'tool' })}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToolClick(message);
        }
      }}
    >
      {getToolIcon(message.toolName)}
      <span>{t('executing_tool', { toolName: message.toolName || 'tool' })}</span>
      <span className="sr-only">{getStatusText()}</span>
    </div>
  );
};

// Message content component
const MessageContent = ({ message, onToolClick }: { message: DisplayMessage, onToolClick }) => {
  // User message
  if (message.type === 'user') {
    return (
      <div className="px-4 py-3 rounded-lg bg-message border border-border-message" role="region" aria-label="User message">
        <span className="text-base">{message.content}</span>
      </div>
    );
  }

  if (message.type === 'workflow') {
    return <WorkflowDisplay workflow={message.workflow} />;
  }

  if (message.type === 'agent_group') {
    return <AgentGroupDisplay agentMessage={message} onToolClick={onToolClick} />
  }

  // Phase 4: Agent context transfer visualization
  if (message.type === 'context_transfer') {
    return (
      <AgentContextTransfer
        transfer={{
          fromAgent: message.fromAgent,
          toAgent: message.toAgent,
          timestamp: message.timestamp.getTime(),
          context: message.context,
          variables: message.variables,
          handoffReason: message.handoffReason,
          dataSize: message.dataSize,
        }}
      />
    );
  }

  return null;
};

// Message content component
const AgentMessageContent = ({ message, onToolClick }: { message: AgentMessage, onToolClick }) => {

  if (message.type === 'tool') {
    return <ToolDisplay message={message} onToolClick={onToolClick} />;
  }

  if (message.type === 'text') {
    const content = message.content || '';
    if (!content.trim()) {
      return null; // Don't display empty content messages
    }
    return (
      <div className="message-text text-text-12-dark markdown-container" role="region" aria-label="Agent message">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }

  return null;
};


// Single message component
const MessageItem = ({ message, onToolClick }: MessageDisplayProps) => {
  const isUser = message.type === 'user';

  // Get message content
  const messageContent = <MessageContent message={message} onToolClick={onToolClick} />;

  // If message content is empty, don't display the entire message item
  if (!messageContent) {
    return null;
  }

  return (
    <div className='message-item mb-4' role="listitem">
      {/* Outer container for left/right alignment */}
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className='text-text-01-dark w-full' role="region" aria-label={isUser ? "User message" : "Assistant message"}>
          {messageContent}
        </div>
      </div>
    </div>
  );
};

// Agent grouped message display component
const AgentGroupDisplay = ({
  agentMessage,
  onToolClick
}: {
  agentMessage: AgentGroupMessage;
  onToolClick?: (message: ToolAction) => void;
}) => {
  const { t } = useTranslation('chat');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Get status text for screen readers
  const getStatusText = () => {
    switch (agentMessage.status) {
      case 'completed':
        return t('agent_completed_status');
      case 'error':
        return t('agent_error_status');
      case 'running':
        return t('agent_running_status');
      default:
        return t('agent_unknown_status');
    }
  };

  // Get status icon for visual display
  const getStatusIcon = () => {
    switch (agentMessage.status) {
      case 'completed':
        return <FinishStatus />;
      case 'error':
        return (
          <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center" role="img" aria-label={t('error_icon')}>
            <span className="text-white text-xs">✕</span>
          </div>
        );
      case 'running':
        return <RuningStatus />;
      default:
        return <RuningStatus />;
    }
  };

  return (
    <div className="agent-group mb-4 mt-10" role="region" aria-label={t('agent_group_region')}>
      {/* Agent task title */}
      <div
        className="flex items-center cursor-pointer transition-colors mb-4"
        onClick={() => setIsCollapsed(!isCollapsed)}
        role="button"
        aria-expanded={!isCollapsed}
        aria-label={isCollapsed ? t('expand_agent_group') : t('collapse_agent_group')}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsCollapsed(!isCollapsed);
          }
        }}
      >
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-semibold">
            {agentMessage.agentNode?.task || agentMessage.agentName}
          </span>
          <span className="sr-only">{getStatusText()}</span>
        </div>
        <Button
          type="text"
          size="small"
          icon={isCollapsed ? <ExpandCollapse className=' rotate-180' /> : <ExpandCollapse />}
          aria-label={isCollapsed ? t('expand') : t('collapse')}
        />
      </div>

      {/* Agent execution steps */}
      {!isCollapsed && (
        <div className="agent-steps" role="region" aria-label={t('agent_steps_region')}>
          {agentMessage.messages.map((message) => {
            return (
              <div key={message.id} className="agent-step">
                <div className="pl-6 mb-3 text-sm">
                  <AgentMessageContent message={message} onToolClick={onToolClick} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Message list component
const MessageListComponent = ({
  messages,
  onToolClick
}: {
  messages: DisplayMessage[];
  onToolClick?: (message: ToolAction) => void;
}) => {

  return (
    <div className="message-list space-y-2" role="list" aria-label="Chat messages">
      {messages.map((message) => <MessageItem message={message} key={message.id} onToolClick={onToolClick} />)}
    </div>
  );
};


// Export components
export { MessageListComponent as MessageList, MessageItem };
export default MessageListComponent; 