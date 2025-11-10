/**
 * Layout IPC Handlers
 *
 * Handles IPC communication for dual sidepanel layout state persistence
 * and browser tab/workspace/favorites management.
 */

import { ipcMain } from 'electron';
import { store } from '../utils/store';
import type { LayoutState, BrowserTabState, Workspace, Favorite, BrowserPreviewBounds } from '../../../src/type';

// Storage keys
const LAYOUT_STATE_KEY = 'layout.panelState';
const TABS_STATE_KEY = 'layout.tabsState';
const WORKSPACES_KEY = 'layout.workspaces';
const FAVORITES_KEY = 'layout.favorites';
const LAYOUT_VERSION_KEY = 'layout.version';

const CURRENT_VERSION = 1;

/**
 * Get default layout state
 */
function getDefaultLayoutState(windowWidth: number = 1920, windowHeight: number = 1080): LayoutState {
  const NAV_BAR_HEIGHT = 60;
  const RIGHT_PANEL_DEFAULT_WIDTH = 400;

  return {
    leftPanel: {
      isExpanded: false,
      width: 280,
      isDragging: false,
      minWidth: 220,
      maxWidth: 320,
      collapsedWidth: 0
    },
    rightPanel: {
      isExpanded: true,
      width: RIGHT_PANEL_DEFAULT_WIDTH,
      isDragging: false,
      minWidth: 300,
      maxWidth: 500,
      collapsedWidth: 0
    },
    browserPreview: {
      x: 0,
      y: NAV_BAR_HEIGHT,
      width: windowWidth - RIGHT_PANEL_DEFAULT_WIDTH,
      height: windowHeight - NAV_BAR_HEIGHT,
      marginLeft: 0,
      marginRight: RIGHT_PANEL_DEFAULT_WIDTH
    },
    currentStage: 3, // Right panel open
    navigationBarHeight: NAV_BAR_HEIGHT,
    windowWidth,
    windowHeight,
    animationDuration: 300,
    isTransitioning: false
  };
}

/**
 * Get default tabs state
 */
function getDefaultTabsState(): BrowserTabState {
  return {
    tabs: [],
    activeTabId: '',
    tabHistory: []
  };
}

/**
 * Validate layout state
 */
function validateLayoutState(state: any): state is LayoutState {
  return (
    state &&
    typeof state === 'object' &&
    'leftPanel' in state &&
    'rightPanel' in state &&
    'browserPreview' in state &&
    'currentStage' in state
  );
}

/**
 * Register layout IPC handlers
 */
export function registerLayoutHandlers() {
  console.log('[IPC] Registering layout handlers...');

  // Get panel state
  ipcMain.handle('layout:get-panel-state', async (event) => {
    try {
      const version = store.get(LAYOUT_VERSION_KEY, 0);

      // Check version for migration
      if (version < CURRENT_VERSION) {
        console.log(`[IPC] Layout version outdated (${version}), using defaults`);
        const defaultState = getDefaultLayoutState();
        store.set(LAYOUT_STATE_KEY, defaultState);
        store.set(LAYOUT_VERSION_KEY, CURRENT_VERSION);
        return defaultState;
      }

      const state = store.get(LAYOUT_STATE_KEY);

      if (!state || !validateLayoutState(state)) {
        console.log('[IPC] No valid layout state found, returning defaults');
        return getDefaultLayoutState();
      }

      console.log('[IPC] Layout state retrieved successfully');
      return state;
    } catch (error) {
      console.error('[IPC] Failed to get layout state:', error);
      return getDefaultLayoutState();
    }
  });

  // Save panel state
  ipcMain.handle('layout:save-panel-state', async (event, state: LayoutState) => {
    try {
      if (!validateLayoutState(state)) {
        throw new Error('Invalid layout state provided');
      }

      store.set(LAYOUT_STATE_KEY, state);
      store.set(LAYOUT_VERSION_KEY, CURRENT_VERSION);

      console.log('[IPC] Layout state saved successfully');
      return { success: true };
    } catch (error) {
      console.error('[IPC] Failed to save layout state:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get tabs state
  ipcMain.handle('layout:get-tabs-state', async (event) => {
    try {
      const state = store.get(TABS_STATE_KEY);

      if (!state) {
        console.log('[IPC] No tabs state found, returning defaults');
        return getDefaultTabsState();
      }

      console.log('[IPC] Tabs state retrieved successfully');
      return state as BrowserTabState;
    } catch (error) {
      console.error('[IPC] Failed to get tabs state:', error);
      return getDefaultTabsState();
    }
  });

  // Save tabs state
  ipcMain.handle('layout:save-tabs-state', async (event, state: BrowserTabState) => {
    try {
      store.set(TABS_STATE_KEY, state);
      console.log('[IPC] Tabs state saved successfully');
      return { success: true };
    } catch (error) {
      console.error('[IPC] Failed to save tabs state:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get workspaces
  ipcMain.handle('layout:get-workspaces', async (event) => {
    try {
      const workspaces = store.get(WORKSPACES_KEY, []);
      console.log('[IPC] Workspaces retrieved successfully');
      return workspaces as Workspace[];
    } catch (error) {
      console.error('[IPC] Failed to get workspaces:', error);
      return [];
    }
  });

  // Save workspaces
  ipcMain.handle('layout:save-workspaces', async (event, workspaces: Workspace[]) => {
    try {
      store.set(WORKSPACES_KEY, workspaces);
      console.log('[IPC] Workspaces saved successfully');
      return { success: true };
    } catch (error) {
      console.error('[IPC] Failed to save workspaces:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get favorites
  ipcMain.handle('layout:get-favorites', async (event) => {
    try {
      const favorites = store.get(FAVORITES_KEY, []);
      console.log('[IPC] Favorites retrieved successfully');
      return favorites as Favorite[];
    } catch (error) {
      console.error('[IPC] Failed to get favorites:', error);
      return [];
    }
  });

  // Save favorites
  ipcMain.handle('layout:save-favorites', async (event, favorites: Favorite[]) => {
    try {
      store.set(FAVORITES_KEY, favorites);
      console.log('[IPC] Favorites saved successfully');
      return { success: true };
    } catch (error) {
      console.error('[IPC] Failed to save favorites:', error);
      return { success: false, error: String(error) };
    }
  });

  console.log('[IPC] Layout handlers registered successfully');
}
