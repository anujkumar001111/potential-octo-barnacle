/**
 * Enhanced RightAISidebar Component
 *
 * AI assistant sidebar with conversation area, sticky input box, and suggestion chips.
 */

import React, { useRef, useEffect, useState } from 'react';
import AISidebarHeader from './AISidebarHeader';
import ConversationArea from './ai-sidebar/ConversationArea';
import StickyInputBox from './ai-sidebar/StickyInputBox';
import SuggestionChips from './ai-sidebar/SuggestionChips';
import styles from './RightAISidebar.module.css';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface EnhancedRightAISidebarProps {
  messages?: Message[];
  isLoading?: boolean;
  onSendMessage?: (message: string, attachments?: File[]) => void;
  onSuggestionClick?: (suggestion: string) => void;
  onClear?: () => void;
  onMinimize?: () => void;
  className?: string;
}

export const EnhancedRightAISidebar: React.FC<EnhancedRightAISidebarProps> = ({
  messages = [],
  isLoading = false,
  onSendMessage,
  onSuggestionClick,
  onClear,
  onMinimize,
  className
}) => {
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  useEffect(() => {
    if (isAtBottom && conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAtBottom]);

  /**
   * Handle scroll to detect if user is at bottom
   */
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const threshold = 50; // pixels from bottom
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < threshold;
    setIsAtBottom(isNearBottom);
  };

  return (
    <div className={`${styles.rightAISidebar} ${className || ''}`}>
      {/* Header */}
      <AISidebarHeader
        onClear={onClear}
        onMinimize={onMinimize}
      />

      {/* Conversation Area (scrollable) */}
      <div
        className={styles.conversationContainer}
        onScroll={handleScroll}
      >
        <ConversationArea
          messages={messages}
          isLoading={isLoading}
        />
        <div ref={conversationEndRef} />
      </div>

      {/* Suggestion Chips */}
      <div className={styles.suggestionsContainer}>
        <SuggestionChips
          onSuggestionClick={onSuggestionClick}
        />
      </div>

      {/* Sticky Input Box */}
      <div className={styles.inputContainer}>
        <StickyInputBox
          onSendMessage={onSendMessage}
          isLoading={isLoading}
        />
      </div>

      {/* Scroll to bottom button (shows when not at bottom) */}
      {!isAtBottom && messages.length > 0 && (
        <button
          className={styles.scrollToBottomButton}
          onClick={() => {
            conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            setIsAtBottom(true);
          }}
          aria-label="Scroll to bottom"
        >
          ↓
        </button>
      )}
    </div>
  );
};

export default EnhancedRightAISidebar;
