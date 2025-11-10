/**
 * Enhanced RightAISidebar Component
 *
 * AI assistant sidebar with:
 * - Sticky header that stays visible while scrolling
 * - Professional typography hierarchy
 * - Sticky input box at bottom for always-accessible conversation
 * - Enhanced UX with smooth scrolling and visual feedback
 * - Accessibility features (keyboard navigation, focus management)
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
  const conversationContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  /**
   * Auto-scroll to bottom when new messages arrive
   * Uses smooth scrolling behavior for better UX
   */
  useEffect(() => {
    if (isAtBottom && conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAtBottom]);

  /**
   * Handle scroll to detect if user is at bottom
   * Threshold: 50px from bottom
   */
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const threshold = 50; // pixels from bottom
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < threshold;
    setIsAtBottom(isNearBottom);
  };

  /**
   * Scroll to bottom programmatically
   */
  const scrollToBottom = () => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setIsAtBottom(true);
    }
  };

  return (
    <div className={`${styles.rightAISidebar} ${className || ''}`}>
      {/* Sticky Header - Stays visible on scroll */}
      <div className={styles.sidebarHeader}>
        <AISidebarHeader
          onClear={onClear}
          onMinimize={onMinimize}
        />
      </div>

      {/* Main scrollable wrapper containing conversation and input */}
      <div className={styles.mainWrapper}>
        {/* Conversation Area (scrollable) */}
        <div
          ref={conversationContainerRef}
          className={styles.conversationContainer}
          onScroll={handleScroll}
          role="log"
          aria-label="Conversation messages"
        >
          <ConversationArea
            messages={messages}
            isLoading={isLoading}
          />
          <div ref={conversationEndRef} />
        </div>

        {/* Suggestion Chips - Sticky between scroll and input */}
        <div className={styles.suggestionsContainer}>
          <SuggestionChips
            onSuggestionClick={onSuggestionClick}
          />
        </div>

        {/* Sticky Input Box - Always visible at bottom */}
        <div className={styles.inputContainer}>
          <StickyInputBox
            onSendMessage={onSendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Scroll to bottom button (shows when not at bottom) */}
      {!isAtBottom && messages.length > 0 && (
        <button
          className={styles.scrollToBottomButton}
          onClick={scrollToBottom}
          aria-label="Scroll to latest message"
          title="Jump to latest message"
        >
          ↓
        </button>
      )}
    </div>
  );
};

export default EnhancedRightAISidebar;
