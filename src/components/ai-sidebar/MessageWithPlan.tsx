/**
 * MessageWithPlan Component
 * 
 * Example component showing how to integrate agent plans into chat messages
 */

import React from 'react';
import { Avatar } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import AgentPlanEmbedded, { Task } from '@/components/ui/agent-plan-embedded';
import styles from './ConversationArea.module.css';

interface MessageWithPlanProps {
  id: string;
  content: string;
  timestamp: Date;
  plan?: Task[];
  onTaskStatusChange?: (taskId: string, newStatus: string) => void;
  onSubtaskStatusChange?: (taskId: string, subtaskId: string, newStatus: string) => void;
}

/**
 * Example message component that includes an agent plan
 * 
 * Usage:
 * ```tsx
 * <MessageWithPlan
 *   id="msg-1"
 *   content="I'll execute this plan to analyze the chart:"
 *   timestamp={new Date()}
 *   plan={agentTasks}
 * />
 * ```
 */
export const MessageWithPlan: React.FC<MessageWithPlanProps> = ({
  id,
  content,
  timestamp,
  plan,
  onTaskStatusChange,
  onSubtaskStatusChange,
}) => {
  return (
    <div className={`${styles.messageWrapper} ${styles.assistant}`}>
      <Avatar
        className={styles.avatar}
        icon={<RobotOutlined />}
        style={{ backgroundColor: '#10b981' }}
      />
      <div className={styles.messageContent}>
        <div className={styles.messageHeader}>
          <span className={styles.messageSender}>Loᥫ᭡li Agent</span>
          <span className={styles.messageTime}>
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        </div>
        
        {/* Message text */}
        <div className={styles.messageText}>
          {content}
        </div>

        {/* Agent plan (if provided) */}
        {plan && plan.length > 0 && (
          <div className="mt-3">
            <AgentPlanEmbedded
              tasks={plan}
              compact={true}
              onTaskStatusChange={onTaskStatusChange}
              onSubtaskStatusChange={onSubtaskStatusChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageWithPlan;
