/**
 * SuggestionChips Component
 *
 * Action suggestion chips for quick AI interactions.
 */

import React from 'react';
import { GlobalOutlined, BulbOutlined, CodeOutlined, SearchOutlined } from '@ant-design/icons';
import styles from './SuggestionChips.module.css';

interface Suggestion {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
}

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  {
    id: 'web-search',
    label: 'Web Search',
    icon: <GlobalOutlined />,
    prompt: 'Search the web for:'
  },
  {
    id: 'deep-think',
    label: 'Deep Think',
    icon: <BulbOutlined />,
    prompt: 'Analyze and provide deep insights about:'
  },
  {
    id: 'code-help',
    label: 'Code Help',
    icon: <CodeOutlined />,
    prompt: 'Help me with this code:'
  },
  {
    id: 'quick-search',
    label: 'Quick Search',
    icon: <SearchOutlined />,
    prompt: 'Quickly find information about:'
  }
];

interface SuggestionChipsProps {
  suggestions?: Suggestion[];
  onSuggestionClick?: (suggestion: string) => void;
}

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({
  suggestions = DEFAULT_SUGGESTIONS,
  onSuggestionClick
}) => {
  const handleClick = (suggestion: Suggestion) => {
    if (onSuggestionClick) {
      onSuggestionClick(suggestion.prompt);
    }
  };

  return (
    <div className={styles.suggestionChips}>
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          className={styles.chip}
          onClick={() => handleClick(suggestion)}
          aria-label={suggestion.label}
        >
          <span className={styles.chipIcon}>{suggestion.icon}</span>
          <span className={styles.chipLabel}>{suggestion.label}</span>
        </button>
      ))}
    </div>
  );
};

export default SuggestionChips;
