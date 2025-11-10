/**
 * DualPanelLayout Component
 *
 * Main layout orchestrator for the dual sidepanel browser interface.
 * Manages 6 layout stages, panel transitions, and browser preview coordination.
 */

import React, { useEffect, useCallback, useRef, ReactNode } from 'react';
import { useLayoutStore } from '@/stores/layoutStore';
import NavigationBar from './NavigationBar';
import styles from './DualPanelLayout.module.css';

interface DualPanelLayoutProps {
  leftPanel?: ReactNode;
  rightPanel?: ReactNode;
  browserPreview?: ReactNode;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  onReload?: () => void;
  onNavigate?: (url: string) => void;
  className?: string;
}

export const DualPanelLayout: React.FC<DualPanelLayoutProps> = ({
  leftPanel,
  rightPanel,
  browserPreview,
  onNavigateBack,
  onNavigateForward,
  onReload,
  onNavigate,
  className
}) => {
  // Layout state from store
  const leftPanelState = useLayoutStore((state) => state.leftPanel);
  const rightPanelState = useLayoutStore((state) => state.rightPanel);
  const browserPreviewBounds = useLayoutStore((state) => state.browserPreview);
  const currentStage = useLayoutStore((state) => state.currentStage);
  const isTransitioning = useLayoutStore((state) => state.isTransitioning);
  const navigationBarHeight = useLayoutStore((state) => state.navigationBarHeight);

  // Layout actions
  const updateWindowSize = useLayoutStore((state) => state.updateWindowSize);
  const calculateBrowserBounds = useLayoutStore((state) => state.calculateBrowserBounds);
  const restoreState = useLayoutStore((state) => state.restoreState);

  // Refs
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const layoutContainerRef = useRef<HTMLDivElement>(null);

  /**
   * Initialize layout on mount
   */
  useEffect(() => {
    const initializeLayout = async () => {
      try {
        // Get window size
        if (typeof window !== 'undefined' && window.api?.view?.getWindowSize) {
          const { width, height } = await window.api.view.getWindowSize();
          updateWindowSize(width, height);
        }

        // Restore saved layout state
        if (typeof window !== 'undefined' && window.api?.layout?.getPanelState) {
          const savedState = await window.api.layout.getPanelState();
          if (savedState) {
            restoreState(savedState);
          }
        }

        // Calculate initial browser bounds
        calculateBrowserBounds();

        console.log('[DualPanelLayout] Layout initialized successfully');
      } catch (error) {
        console.error('[DualPanelLayout] Failed to initialize layout:', error);
      }
    };

    initializeLayout();
  }, [updateWindowSize, calculateBrowserBounds, restoreState]);

  /**
   * Handle window resize
   */
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        updateWindowSize(window.innerWidth, window.innerHeight);
      }
    };

    // Debounce resize events
    let resizeTimeout: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);

    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, [updateWindowSize]);

  /**
   * Observe layout container size changes
   */
  useEffect(() => {
    if (!layoutContainerRef.current) {
      return;
    }

    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        updateWindowSize(width, height);
      }
    });

    resizeObserverRef.current.observe(layoutContainerRef.current);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [updateWindowSize]);

  /**
   * Update browser preview bounds when layout changes
   */
  useEffect(() => {
    calculateBrowserBounds();
  }, [
    leftPanelState.isExpanded,
    leftPanelState.width,
    rightPanelState.isExpanded,
    rightPanelState.width,
    calculateBrowserBounds
  ]);

  /**
   * Calculate panel styles based on state
   */
  const leftPanelStyle: React.CSSProperties = {
    width: leftPanelState.isExpanded ? `${leftPanelState.width}px` : '0px',
    transform: leftPanelState.isExpanded ? 'translateX(0)' : 'translateX(-100%)',
    opacity: leftPanelState.isExpanded ? 1 : 0,
    pointerEvents: leftPanelState.isExpanded ? 'auto' : 'none'
  };

  const rightPanelStyle: React.CSSProperties = {
    width: rightPanelState.isExpanded ? `${rightPanelState.width}px` : '0px',
    transform: rightPanelState.isExpanded ? 'translateX(0)' : 'translateX(100%)',
    opacity: rightPanelState.isExpanded ? 1 : 0,
    pointerEvents: rightPanelState.isExpanded ? 'auto' : 'none'
  };

  const browserPreviewStyle: React.CSSProperties = {
    marginLeft: leftPanelState.isExpanded ? `${leftPanelState.width}px` : '0px',
    marginRight: rightPanelState.isExpanded ? `${rightPanelState.width}px` : '0px',
    width: `${browserPreviewBounds.width}px`,
    height: `${browserPreviewBounds.height}px`
  };

  return (
    <div
      ref={layoutContainerRef}
      className={`${styles.dualPanelLayout} ${className || ''}`}
      data-stage={currentStage}
      data-transitioning={isTransitioning}
    >
      {/* Navigation Bar */}
      <NavigationBar
        onNavigateBack={onNavigateBack}
        onNavigateForward={onNavigateForward}
        onReload={onReload}
        onNavigate={onNavigate}
        className={styles.navigationBar}
      />

      {/* Main Content Area */}
      <div className={styles.contentArea}>
        {/* Left Panel (Tabs & Workspaces) */}
        <aside
          className={`${styles.leftPanel} ${leftPanelState.isExpanded ? styles.expanded : styles.collapsed}`}
          style={leftPanelStyle}
          aria-hidden={!leftPanelState.isExpanded}
          aria-label="Left sidebar - Tabs and workspaces"
        >
          <div className={styles.panelContent}>
            {leftPanel || <div className={styles.panelPlaceholder}>Left Panel</div>}
          </div>
        </aside>

        {/* Browser Preview */}
        <main
          className={styles.browserPreview}
          style={browserPreviewStyle}
          aria-label="Browser preview"
        >
          {browserPreview || (
            <div className={styles.browserPlaceholder}>
              <div className={styles.placeholderContent}>
                <h2>Browser Preview</h2>
                <p>Stage: {currentStage}</p>
                <p>Width: {browserPreviewBounds.width}px</p>
                <p>Height: {browserPreviewBounds.height}px</p>
              </div>
            </div>
          )}
        </main>

        {/* Right Panel (AI Sidebar) */}
        <aside
          className={`${styles.rightPanel} ${rightPanelState.isExpanded ? styles.expanded : styles.collapsed}`}
          style={rightPanelStyle}
          aria-hidden={!rightPanelState.isExpanded}
          aria-label="Right sidebar - AI assistant"
        >
          <div className={styles.panelContent}>
            {rightPanel || <div className={styles.panelPlaceholder}>Right Panel</div>}
          </div>
        </aside>
      </div>

      {/* Debug info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className={styles.debugInfo}>
          <span>Stage: {currentStage}</span>
          <span>L: {leftPanelState.isExpanded ? leftPanelState.width : 0}px</span>
          <span>B: {browserPreviewBounds.width}px</span>
          <span>R: {rightPanelState.isExpanded ? rightPanelState.width : 0}px</span>
        </div>
      )}
    </div>
  );
};

export default DualPanelLayout;
