/**
 * TabItem Component
 *
 * Individual tab item with favicon, title, close button, and drag support.
 */

import React from 'react';
import { CloseOutlined, PushpinOutlined, PushpinFilled } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { BrowserTab } from '@/type';
import styles from './TabItem.module.css';

interface TabItemProps {
  tab: BrowserTab;
  isActive: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onSelect: () => void;
  onClose: () => void;
  onPin: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export const TabItem: React.FC<TabItemProps> = ({
  tab,
  isActive,
  isDragging,
  isDragOver,
  onSelect,
  onClose,
  onPin,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPin();
  };

  return (
    <div
      className={`
        ${styles.tabItem}
        ${isActive ? styles.active : ''}
        ${isDragging ? styles.dragging : ''}
        ${isDragOver ? styles.dragOver : ''}
        ${tab.isPinned ? styles.pinned : ''}
      `}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Tab: ${tab.title || 'Untitled'}`}
      aria-selected={isActive}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {/* Favicon */}
      <div className={styles.tabFavicon}>
        {tab.favicon ? (
          <img src={tab.favicon} alt="" width={16} height={16} />
        ) : (
          <div className={styles.faviconPlaceholder}>🌐</div>
        )}
      </div>

      {/* Title */}
      <div className={styles.tabTitle}>
        {tab.title || tab.url || 'New Tab'}
      </div>

      {/* Actions */}
      <div className={styles.tabActions}>
        {/* Pin button */}
        <Tooltip title={tab.isPinned ? "Unpin" : "Pin"} mouseEnterDelay={0.5}>
          <button
            className={styles.actionButton}
            onClick={handlePinClick}
            aria-label={tab.isPinned ? "Unpin tab" : "Pin tab"}
          >
            {tab.isPinned ? (
              <PushpinFilled className={styles.pinIconFilled} />
            ) : (
              <PushpinOutlined className={styles.pinIcon} />
            )}
          </button>
        </Tooltip>

        {/* Close button */}
        <Tooltip title="Close" mouseEnterDelay={0.5}>
          <button
            className={styles.actionButton}
            onClick={handleCloseClick}
            aria-label="Close tab"
          >
            <CloseOutlined />
          </button>
        </Tooltip>
      </div>

      {/* Pin indicator badge */}
      {tab.isPinned && <div className={styles.pinnedBadge} />}
    </div>
  );
};

export default TabItem;
