/**
 * Enhanced LeftSidebar Component
 *
 * Arc-style left sidebar with tabs, workspaces, and favorites.
 * Features vertical tab list, drag-reorder, workspace management, and pinned sites.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { PlusOutlined, FolderOutlined, StarOutlined, GlobalOutlined } from '@ant-design/icons';
import { Button, Dropdown, Menu, Tooltip } from 'antd';
import { BrowserTab, Workspace, Favorite } from '@/type';
import { tabsStorage, workspacesStorage, favoritesStorage } from '@/services/browserStorage';
import TabList from './tabs/TabList';
import WorkspaceSelector from './tabs/WorkspaceSelector';
import FavoritesSection from './tabs/FavoritesSection';
import styles from './LeftSidebar.module.css';

interface EnhancedLeftSidebarProps {
  className?: string;
  onTabSelect?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onNewTab?: () => void;
  onNavigate?: (url: string) => void;
}

export const EnhancedLeftSidebar: React.FC<EnhancedLeftSidebarProps> = ({
  className,
  onTabSelect,
  onTabClose,
  onNewTab,
  onNavigate
}) => {
  // State
  const [tabs, setTabs] = useState<BrowserTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Initialize sidebar data
   */
  useEffect(() => {
    const initializeSidebar = async () => {
      try {
        setIsLoading(true);

        // Load tabs, workspaces, and favorites from IndexedDB
        const [loadedTabs, loadedWorkspaces, loadedFavorites] = await Promise.all([
          tabsStorage.getAll(),
          workspacesStorage.getAll(),
          favoritesStorage.getAll()
        ]);

        setTabs(loadedTabs);
        setWorkspaces(loadedWorkspaces);
        setFavorites(loadedFavorites);

        // Find active workspace
        const active = loadedWorkspaces.find((w) => w.isActive);
        if (active) {
          setActiveWorkspace(active);
        } else if (loadedWorkspaces.length > 0) {
          // Set first workspace as active if none selected
          const firstWorkspace = loadedWorkspaces[0];
          firstWorkspace.isActive = true;
          await workspacesStorage.save(firstWorkspace);
          setActiveWorkspace(firstWorkspace);
        }

        // Set active tab (most recently accessed)
        if (loadedTabs.length > 0) {
          const mostRecent = loadedTabs.reduce((prev, current) =>
            current.lastAccessedAt > prev.lastAccessedAt ? current : prev
          );
          setActiveTabId(mostRecent.id);
        }

        console.log('[LeftSidebar] Initialized with', {
          tabs: loadedTabs.length,
          workspaces: loadedWorkspaces.length,
          favorites: loadedFavorites.length
        });
      } catch (error) {
        console.error('[LeftSidebar] Failed to initialize:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSidebar();
  }, []);

  /**
   * Filter tabs by active workspace
   */
  const workspaceTabs = activeWorkspace
    ? tabs.filter((tab) => tab.workspaceId === activeWorkspace.id)
    : tabs;

  /**
   * Handle tab selection
   */
  const handleTabSelect = useCallback(async (tabId: string) => {
    setActiveTabId(tabId);

    // Update last accessed time
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) {
      tab.lastAccessedAt = new Date();
      await tabsStorage.save(tab);
      setTabs([...tabs]);

      // Notify parent
      if (onTabSelect) {
        onTabSelect(tabId);
      }

      // Navigate to URL
      if (onNavigate && tab.url) {
        onNavigate(tab.url);
      }
    }
  }, [tabs, onTabSelect, onNavigate]);

  /**
   * Handle tab close
   */
  const handleTabClose = useCallback(async (tabId: string) => {
    await tabsStorage.delete(tabId);
    setTabs(tabs.filter((t) => t.id !== tabId));

    // Update active workspace tab list
    if (activeWorkspace) {
      activeWorkspace.tabIds = activeWorkspace.tabIds.filter((id) => id !== tabId);
      await workspacesStorage.save(activeWorkspace);
    }

    // Notify parent
    if (onTabClose) {
      onTabClose(tabId);
    }

    // Switch to next tab if active was closed
    if (activeTabId === tabId && tabs.length > 1) {
      const remainingTabs = tabs.filter((t) => t.id !== tabId);
      if (remainingTabs.length > 0) {
        handleTabSelect(remainingTabs[0].id);
      }
    }
  }, [tabs, activeTabId, activeWorkspace, onTabClose, handleTabSelect]);

  /**
   * Handle tab pin toggle
   */
  const handleTabPin = useCallback(async (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) {
      tab.isPinned = !tab.isPinned;
      await tabsStorage.save(tab);
      setTabs([...tabs]);
    }
  }, [tabs]);

  /**
   * Handle tab reorder
   */
  const handleTabReorder = useCallback(async (draggedTabId: string, targetTabId: string) => {
    const draggedIndex = tabs.findIndex((t) => t.id === draggedTabId);
    const targetIndex = tabs.findIndex((t) => t.id === targetTabId);

    if (draggedIndex === -1 || targetIndex === -1) {
      return;
    }

    const newTabs = [...tabs];
    const [draggedTab] = newTabs.splice(draggedIndex, 1);
    newTabs.splice(targetIndex, 0, draggedTab);

    setTabs(newTabs);

    // Save to storage
    await tabsStorage.saveAll(newTabs);
  }, [tabs]);

  /**
   * Handle new tab creation
   */
  const handleNewTab = useCallback(async () => {
    const newTab: BrowserTab = {
      id: `tab-${Date.now()}`,
      title: 'New Tab',
      url: '',
      isPinned: false,
      workspaceId: activeWorkspace?.id,
      createdAt: new Date(),
      lastAccessedAt: new Date()
    };

    await tabsStorage.save(newTab);
    setTabs([...tabs, newTab]);

    // Add to active workspace
    if (activeWorkspace) {
      activeWorkspace.tabIds.push(newTab.id);
      await workspacesStorage.save(activeWorkspace);
    }

    // Select new tab
    handleTabSelect(newTab.id);

    // Notify parent
    if (onNewTab) {
      onNewTab();
    }
  }, [tabs, activeWorkspace, onNewTab, handleTabSelect]);

  /**
   * Handle workspace switch
   */
  const handleWorkspaceSwitch = useCallback(async (workspaceId: string) => {
    // Deactivate current workspace
    if (activeWorkspace) {
      activeWorkspace.isActive = false;
      await workspacesStorage.save(activeWorkspace);
    }

    // Activate new workspace
    const newWorkspace = workspaces.find((w) => w.id === workspaceId);
    if (newWorkspace) {
      newWorkspace.isActive = true;
      newWorkspace.lastAccessedAt = new Date();
      await workspacesStorage.save(newWorkspace);
      setActiveWorkspace(newWorkspace);

      // Switch to first tab in workspace
      const workspaceTabs = tabs.filter((t) => t.workspaceId === workspaceId);
      if (workspaceTabs.length > 0) {
        handleTabSelect(workspaceTabs[0].id);
      }
    }
  }, [workspaces, activeWorkspace, tabs, handleTabSelect]);

  /**
   * Handle favorite click
   */
  const handleFavoriteClick = useCallback(async (favorite: Favorite) => {
    // Create new tab from favorite
    const newTab: BrowserTab = {
      id: `tab-${Date.now()}`,
      title: favorite.title,
      url: favorite.url,
      favicon: favorite.favicon,
      isPinned: false,
      workspaceId: activeWorkspace?.id,
      createdAt: new Date(),
      lastAccessedAt: new Date()
    };

    await tabsStorage.save(newTab);
    setTabs([...tabs, newTab]);

    // Add to active workspace
    if (activeWorkspace) {
      activeWorkspace.tabIds.push(newTab.id);
      await workspacesStorage.save(activeWorkspace);
    }

    // Select and navigate
    handleTabSelect(newTab.id);
  }, [tabs, activeWorkspace, handleTabSelect]);

  if (isLoading) {
    return (
      <div className={`${styles.leftSidebar} ${className || ''}`}>
        <div className={styles.loadingState}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={`${styles.leftSidebar} ${className || ''}`}>
      {/* Header with workspace selector */}
      <div className={styles.sidebarHeader}>
        <WorkspaceSelector
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          onWorkspaceSwitch={handleWorkspaceSwitch}
        />

        <Tooltip title="Toggle favorites" mouseEnterDelay={0.5}>
          <Button
            type={showFavorites ? "primary" : "text"}
            icon={<StarOutlined />}
            onClick={() => setShowFavorites(!showFavorites)}
            className={styles.headerButton}
            size="small"
          />
        </Tooltip>
      </div>

      {/* Favorites section (collapsible) */}
      {showFavorites && (
        <FavoritesSection
          favorites={favorites}
          onFavoriteClick={handleFavoriteClick}
        />
      )}

      {/* Tab list */}
      <div className={styles.tabListContainer}>
        <TabList
          tabs={workspaceTabs}
          activeTabId={activeTabId}
          onTabSelect={handleTabSelect}
          onTabClose={handleTabClose}
          onTabPin={handleTabPin}
          onTabReorder={handleTabReorder}
        />
      </div>

      {/* Footer with new tab button */}
      <div className={styles.sidebarFooter}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleNewTab}
          className={styles.newTabButton}
          block
        >
          New Tab
        </Button>
      </div>
    </div>
  );
};

export default EnhancedLeftSidebar;
