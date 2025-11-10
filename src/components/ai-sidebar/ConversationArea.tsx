/**
 * ConversationArea Component
 *
 * Scrollable message display area for AI conversation.
 */

import React from 'react';
import { Avatar } from 'antd';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';
import styles from './ConversationArea.module.css';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ConversationAreaProps {
  messages: Message[];
  isLoading?: boolean;
}

export const ConversationArea: React.FC<ConversationAreaProps> = ({
  messages,
  isLoading
}) => {
  if (messages.length === 0 && !isLoading) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>💬</div>
        <h3>Start a conversation</h3>
        <p>Type a message or click a suggestion below to get started</p>
      </div>
    );
  }

  return (
    <div className={styles.conversationArea}>
      {messages.map((message) => (
        <div
          key={message.id}
          className={`${styles.messageWrapper} ${styles[message.role]}`}
        >
          <Avatar
            className={styles.avatar}
            icon={message.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
            style={{
              backgroundColor: message.role === 'user' ? '#6366f1' : '#10b981'
            }}
          />
          <div className={styles.messageContent}>
            <div className={styles.messageHeader}>
              <span className={styles.messageSender}>
                {message.role === 'user' ? 'You' : 'Loᥫ᭡li Agent'}
              </span>
              <span className={styles.messageTime}>
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className={styles.messageText}>
              {message.content}
              {message.isStreaming && <span className={styles.cursor}>▋</span>}
            </div>
          </div>
        </div>
      ))}

      {isLoading && (
        <div className={`${styles.messageWrapper} ${styles.assistant}`}>
          <Avatar
            className={styles.avatar}
            icon={<RobotOutlined />}
            style={{ backgroundColor: '#10b981' }}
          />
          <div className={styles.messageContent}>
            <div className={styles.loadingIndicator}>
              <span className={styles.dot}></span>
              <span className={styles.dot}></span>
              <span className={styles.dot}></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationArea;
