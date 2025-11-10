/**
 * NavigationBar Component
 *
 * Top navigation bar with back/forward/refresh controls, address bar,
 * and panel toggle buttons for the dual sidepanel layout.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeftOutlined, ArrowRightOutlined, ReloadOutlined, MenuOutlined, MessageOutlined } from '@ant-design/icons';
import { Button, Input, Tooltip } from 'antd';
import { useLayoutStore } from '@/stores/layoutStore';
import styles from './NavigationBar.module.css';

interface NavigationBarProps {
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  onReload?: () => void;
  onNavigate?: (url: string) => void;
  className?: string;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  onNavigateBack,
  onNavigateForward,
  onReload,
  onNavigate,
  className
}) => {
  const [addressValue, setAddressValue] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const addressInputRef = useRef<any>(null);

  // Get panel toggle functions from layout store
  const toggleLeftPanel = useLayoutStore((state) => state.toggleLeftPanel);
  const toggleRightPanel = useLayoutStore((state) => state.toggleRightPanel);
  const leftPanelExpanded = useLayoutStore((state) => state.leftPanel.isExpanded);
  const rightPanelExpanded = useLayoutStore((state) => state.rightPanel.isExpanded);

  // Listen for URL changes from Electron
  useEffect(() => {
    if (typeof window === 'undefined' || !window.api?.view?.onUrlChange) {
      return;
    }

    window.api.view.onUrlChange((url: string) => {
      setCurrentUrl(url);
      setAddressValue(url);
    });

    // Get initial URL
    window.api.view.getCurrentUrl().then((url) => {
      setCurrentUrl(url);
      setAddressValue(url);
    }).catch((error) => {
      console.error('[NavigationBar] Failed to get current URL:', error);
    });

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Listen for navigation events from Electron menu
  useEffect(() => {
    if (typeof window === 'undefined' || !window.api) {
      return;
    }

    const handleNavigateBack = () => {
      handleBackClick();
    };

    const handleNavigateForward = () => {
      handleForwardClick();
    };

    const handleReload = () => {
      handleReloadClick();
    };

    if (window.api.onNavigateBack) {
      window.api.onNavigateBack(handleNavigateBack);
    }

    if (window.api.onNavigateForward) {
      window.api.onNavigateForward(handleNavigateForward);
    }

    if (window.api.onReloadPage) {
      window.api.onReloadPage(handleReload);
    }

    return () => {
      // Cleanup if needed
    };
  }, []);

  /**
   * Handle back button click
   */
  const handleBackClick = useCallback(() => {
    if (onNavigateBack) {
      onNavigateBack();
    }
    // Update button states (in a real implementation, this would check history)
    setCanGoBack(false);
  }, [onNavigateBack]);

  /**
   * Handle forward button click
   */
  const handleForwardClick = useCallback(() => {
    if (onNavigateForward) {
      onNavigateForward();
    }
    setCanGoForward(false);
  }, [onNavigateForward]);

  /**
   * Handle reload button click
   */
  const handleReloadClick = useCallback(() => {
    if (onReload) {
      setIsLoading(true);
      onReload();
      // Reset loading state after a delay
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  }, [onReload]);

  /**
   * Determine if input is a URL or search query
   */
  const isUrl = (input: string): boolean => {
    // Check if it's a valid URL
    try {
      new URL(input);
      return true;
    } catch {
      // Check if it looks like a domain
      const domainRegex = /^[a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+/;
      return domainRegex.test(input);
    }
  };

  /**
   * Handle address bar submission
   */
  const handleAddressSubmit = useCallback(() => {
    const trimmedValue = addressValue.trim();

    if (!trimmedValue) {
      return;
    }

    let targetUrl: string;

    if (isUrl(trimmedValue)) {
      // Add protocol if missing
      targetUrl = trimmedValue.startsWith('http://') || trimmedValue.startsWith('https://')
        ? trimmedValue
        : `https://${trimmedValue}`;
    } else {
      // Treat as search query
      targetUrl = `https://www.google.com/search?q=${encodeURIComponent(trimmedValue)}`;
    }

    if (onNavigate) {
      setIsLoading(true);
      onNavigate(targetUrl);

      // Navigate via IPC if available
      if (typeof window !== 'undefined' && window.api?.view?.navigateTo) {
        window.api.view.navigateTo(targetUrl)
          .then((result) => {
            setCurrentUrl(result.url);
            setAddressValue(result.url);
            setCanGoBack(true);
          })
          .catch((error) => {
            console.error('[NavigationBar] Navigation failed:', error);
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    }
  }, [addressValue, onNavigate]);

  /**
   * Handle address input change
   */
  const handleAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAddressValue(e.target.value);
  }, []);

  /**
   * Handle address input key press (Enter to submit)
   */
  const handleAddressKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddressSubmit();
    }
  }, [handleAddressSubmit]);

  /**
   * Handle address input focus (select all text)
   */
  const handleAddressFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  }, []);

  return (
    <div className={`${styles.navigationBar} ${className || ''}`}>
      {/* Left section: Navigation controls */}
      <div className={styles.leftSection}>
        <Tooltip title="Back" mouseEnterDelay={0.5}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={handleBackClick}
            disabled={!canGoBack}
            className={styles.navButton}
            aria-label="Navigate back"
          />
        </Tooltip>

        <Tooltip title="Forward" mouseEnterDelay={0.5}>
          <Button
            type="text"
            icon={<ArrowRightOutlined />}
            onClick={handleForwardClick}
            disabled={!canGoForward}
            className={styles.navButton}
            aria-label="Navigate forward"
          />
        </Tooltip>

        <Tooltip title="Reload" mouseEnterDelay={0.5}>
          <Button
            type="text"
            icon={<ReloadOutlined spin={isLoading} />}
            onClick={handleReloadClick}
            className={styles.navButton}
            aria-label="Reload page"
          />
        </Tooltip>
      </div>

      {/* Center section: Address bar */}
      <div className={styles.centerSection}>
        <Input
          ref={addressInputRef}
          value={addressValue}
          onChange={handleAddressChange}
          onKeyPress={handleAddressKeyPress}
          onFocus={handleAddressFocus}
          onPressEnter={handleAddressSubmit}
          placeholder="Search or type URL..."
          className={styles.addressBar}
          aria-label="Address bar"
        />
      </div>

      {/* Right section: Panel toggles */}
      <div className={styles.rightSection}>
        <Tooltip title={leftPanelExpanded ? "Hide tabs" : "Show tabs"} mouseEnterDelay={0.5}>
          <Button
            type={leftPanelExpanded ? "primary" : "text"}
            icon={<MenuOutlined />}
            onClick={toggleLeftPanel}
            className={styles.toggleButton}
            aria-label="Toggle left panel"
            aria-pressed={leftPanelExpanded}
          />
        </Tooltip>

        <Tooltip title={rightPanelExpanded ? "Hide AI sidebar" : "Show AI sidebar"} mouseEnterDelay={0.5}>
          <Button
            type={rightPanelExpanded ? "primary" : "text"}
            icon={<MessageOutlined />}
            onClick={toggleRightPanel}
            className={styles.toggleButton}
            aria-label="Toggle right panel"
            aria-pressed={rightPanelExpanded}
          />
        </Tooltip>
      </div>
    </div>
  );
};

export default NavigationBar;
