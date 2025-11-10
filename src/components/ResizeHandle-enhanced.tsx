/**
 * ResizeHandle Component
 *
 * Draggable resize handle for panel width adjustment.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useLayoutStore } from '@/stores/layoutStore';
import styles from './ResizeHandle.module.css';

interface ResizeHandleProps {
  side: 'left' | 'right';
  className?: string;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({ side, className }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // Get store actions based on side
  const panelState = useLayoutStore((state) =>
    side === 'left' ? state.leftPanel : state.rightPanel
  );
  const setPanelWidth = useLayoutStore((state) =>
    side === 'left' ? state.setLeftPanelWidth : state.setRightPanelWidth
  );
  const setPanelDragging = useLayoutStore((state) =>
    side === 'left' ? state.setLeftPanelDragging : state.setRightPanelDragging
  );

  /**
   * Handle mouse down - start dragging
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      setPanelDragging(true);
      startXRef.current = e.clientX;
      startWidthRef.current = panelState.width;

      // Add cursor style to body
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    },
    [panelState.width, setPanelDragging]
  );

  /**
   * Handle mouse move - update width
   */
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startXRef.current;
      const newWidth =
        side === 'left'
          ? startWidthRef.current + deltaX
          : startWidthRef.current - deltaX;

      setPanelWidth(newWidth);
    },
    [isDragging, side, setPanelWidth]
  );

  /**
   * Handle mouse up - stop dragging
   */
  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    setPanelDragging(false);

    // Remove cursor style from body
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [isDragging, setPanelDragging]);

  /**
   * Attach/detach global mouse event listeners
   */
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      className={`${styles.resizeHandle} ${styles[side]} ${isDragging ? styles.dragging : ''} ${className || ''}`}
      onMouseDown={handleMouseDown}
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${side} panel`}
      tabIndex={0}
      onKeyDown={(e) => {
        // Keyboard resize support
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const newWidth = side === 'left' ? panelState.width - 10 : panelState.width + 10;
          setPanelWidth(newWidth);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          const newWidth = side === 'left' ? panelState.width + 10 : panelState.width - 10;
          setPanelWidth(newWidth);
        }
      }}
    >
      <div className={styles.handleLine} />
    </div>
  );
};

export default ResizeHandle;
