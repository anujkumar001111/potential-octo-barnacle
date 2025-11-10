/**
 * TabList Component
 *
 * Vertical list of browser tabs with drag-and-drop reordering.
 */

import React, { useState, useCallback } from 'react';
import { BrowserTab } from '@/type';
import TabItem from './TabItem';
import styles from './TabList.module.css';

interface TabListProps {
  tabs: BrowserTab[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabPin: (tabId: string) => void;
  onTabReorder: (draggedTabId: string, targetTabId: string) => void;
}

export const TabList: React.FC<TabListProps> = ({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onTabPin,
  onTabReorder
}) => {
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);

  // Sort tabs: pinned first, then by last accessed
  const sortedTabs = [...tabs].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime();
  });

  /**
   * Handle drag start
   */
  const handleDragStart = useCallback((e: React.DragEvent, tabId: string) => {
    setDraggedTabId(tabId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tabId);

    // Add drag image
    const dragImage = (e.target as HTMLElement).cloneNode(true) as HTMLElement;
    dragImage.style.opacity = '0.5';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  }, []);

  /**
   * Handle drag over
   */
  const handleDragOver = useCallback((e: React.DragEvent, tabId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedTabId && draggedTabId !== tabId) {
      setDragOverTabId(tabId);
    }
  }, [draggedTabId]);

  /**
   * Handle drag leave
   */
  const handleDragLeave = useCallback(() => {
    setDragOverTabId(null);
  }, []);

  /**
   * Handle drop
   */
  const handleDrop = useCallback((e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();

    if (draggedTabId && draggedTabId !== targetTabId) {
      onTabReorder(draggedTabId, targetTabId);
    }

    setDraggedTabId(null);
    setDragOverTabId(null);
  }, [draggedTabId, onTabReorder]);

  /**
   * Handle drag end
   */
  const handleDragEnd = useCallback(() => {
    setDraggedTabId(null);
    setDragOverTabId(null);
  }, []);

  if (tabs.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateContent}>
          <span className={styles.emptyStateIcon}>🌐</span>
          <p>No tabs open</p>
          <p className={styles.emptyStateHint}>Create a new tab to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tabList}>
      {sortedTabs.map((tab) => (
        <TabItem
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          isDragging={tab.id === draggedTabId}
          isDragOver={tab.id === dragOverTabId}
          onSelect={() => onTabSelect(tab.id)}
          onClose={() => onTabClose(tab.id)}
          onPin={() => onTabPin(tab.id)}
          onDragStart={(e) => handleDragStart(e, tab.id)}
          onDragOver={(e) => handleDragOver(e, tab.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, tab.id)}
          onDragEnd={handleDragEnd}
        />
      ))}
    </div>
  );
};

export default TabList;
