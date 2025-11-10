/**
 * Layout Store
 *
 * Zustand store for managing dual sidepanel layout state.
 * Handles panel expansion/collapse, resizing, and browser preview bounds calculation.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { LayoutState, LayoutStage, PanelState, BrowserPreviewBounds } from '@/type';

// Constants
const NAV_BAR_HEIGHT = 60;
const LEFT_PANEL_MIN_WIDTH = 220;
const LEFT_PANEL_MAX_WIDTH = 320;
const LEFT_PANEL_DEFAULT_WIDTH = 280;
const LEFT_PANEL_COLLAPSED_WIDTH = 0;

const RIGHT_PANEL_MIN_WIDTH = 300;
const RIGHT_PANEL_MAX_WIDTH = 500;
const RIGHT_PANEL_DEFAULT_WIDTH = 400;
const RIGHT_PANEL_COLLAPSED_WIDTH = 0;

const MIN_BROWSER_WIDTH = 400;
const ANIMATION_DURATION = 300; // milliseconds

// Initial panel states
const createInitialLeftPanel = (): PanelState => ({
  isExpanded: false,
  width: LEFT_PANEL_DEFAULT_WIDTH,
  isDragging: false,
  minWidth: LEFT_PANEL_MIN_WIDTH,
  maxWidth: LEFT_PANEL_MAX_WIDTH,
  collapsedWidth: LEFT_PANEL_COLLAPSED_WIDTH
});

const createInitialRightPanel = (): PanelState => ({
  isExpanded: true,
  width: RIGHT_PANEL_DEFAULT_WIDTH,
  isDragging: false,
  minWidth: RIGHT_PANEL_MIN_WIDTH,
  maxWidth: RIGHT_PANEL_MAX_WIDTH,
  collapsedWidth: RIGHT_PANEL_COLLAPSED_WIDTH
});

interface LayoutActions {
  // Panel toggle actions
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;

  // Panel resize actions
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;

  // Drag state actions
  setLeftPanelDragging: (isDragging: boolean) => void;
  setRightPanelDragging: (isDragging: boolean) => void;

  // Window resize actions
  updateWindowSize: (width: number, height: number) => void;

  // Browser bounds calculation
  calculateBrowserBounds: () => void;

  // Stage calculation
  calculateCurrentStage: () => LayoutStage;

  // State persistence
  persistState: () => Promise<void>;
  restoreState: (state: Partial<LayoutState>) => void;

  // Animation state
  setTransitioning: (isTransitioning: boolean) => void;

  // Reset to defaults
  resetToDefaults: () => void;
}

type LayoutStore = LayoutState & LayoutActions;

/**
 * Calculate the current layout stage based on panel states
 */
function calculateStage(leftExpanded: boolean, rightExpanded: boolean): LayoutStage {
  if (!leftExpanded && !rightExpanded) return 1; // Both collapsed
  if (leftExpanded && !rightExpanded) return 2; // Left only
  if (!leftExpanded && rightExpanded) return 3; // Right only
  return 4; // Both expanded (stages 4, 5, 6 are all "both expanded" with different interactions)
}

/**
 * Calculate browser preview bounds based on panel states
 */
function calculateBounds(
  leftPanel: PanelState,
  rightPanel: PanelState,
  windowWidth: number,
  windowHeight: number,
  navBarHeight: number
): BrowserPreviewBounds {
  const leftWidth = leftPanel.isExpanded ? leftPanel.width : leftPanel.collapsedWidth;
  const rightWidth = rightPanel.isExpanded ? rightPanel.width : rightPanel.collapsedWidth;

  const browserWidth = windowWidth - leftWidth - rightWidth;
  const browserHeight = windowHeight - navBarHeight;

  return {
    x: leftWidth,
    y: navBarHeight,
    width: browserWidth,
    height: browserHeight,
    marginLeft: leftWidth,
    marginRight: rightWidth
  };
}

/**
 * Validate panel width against constraints
 */
function validateWidth(width: number, minWidth: number, maxWidth: number, windowWidth: number, otherPanelWidth: number): number {
  // Ensure minimum browser width
  const maxAllowedWidth = windowWidth - otherPanelWidth - MIN_BROWSER_WIDTH;

  // Clamp to min/max constraints
  let validatedWidth = Math.max(minWidth, Math.min(maxWidth, width));

  // Ensure browser has minimum width
  validatedWidth = Math.min(validatedWidth, maxAllowedWidth);

  return validatedWidth;
}

/**
 * Create the layout store
 */
export const useLayoutStore = create<LayoutStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      leftPanel: createInitialLeftPanel(),
      rightPanel: createInitialRightPanel(),
      browserPreview: {
        x: 0,
        y: NAV_BAR_HEIGHT,
        width: 0,
        height: 0,
        marginLeft: 0,
        marginRight: RIGHT_PANEL_DEFAULT_WIDTH
      },
      currentStage: 3, // Right panel open by default
      navigationBarHeight: NAV_BAR_HEIGHT,
      windowWidth: typeof window !== 'undefined' ? window.innerWidth : 1920,
      windowHeight: typeof window !== 'undefined' ? window.innerHeight : 1080,
      animationDuration: ANIMATION_DURATION,
      isTransitioning: false,

      // Actions
      toggleLeftPanel: () => {
        const state = get();
        const newExpanded = !state.leftPanel.isExpanded;

        set({
          leftPanel: { ...state.leftPanel, isExpanded: newExpanded },
          isTransitioning: true
        });

        // Recalculate bounds
        get().calculateBrowserBounds();

        // End transition after animation
        setTimeout(() => {
          set({ isTransitioning: false });
        }, ANIMATION_DURATION);

        // Persist state
        get().persistState();
      },

      toggleRightPanel: () => {
        const state = get();
        const newExpanded = !state.rightPanel.isExpanded;

        set({
          rightPanel: { ...state.rightPanel, isExpanded: newExpanded },
          isTransitioning: true
        });

        // Recalculate bounds
        get().calculateBrowserBounds();

        // End transition after animation
        setTimeout(() => {
          set({ isTransitioning: false });
        }, ANIMATION_DURATION);

        // Persist state
        get().persistState();
      },

      setLeftPanelWidth: (width: number) => {
        const state = get();
        const validatedWidth = validateWidth(
          width,
          LEFT_PANEL_MIN_WIDTH,
          LEFT_PANEL_MAX_WIDTH,
          state.windowWidth,
          state.rightPanel.isExpanded ? state.rightPanel.width : 0
        );

        set({
          leftPanel: { ...state.leftPanel, width: validatedWidth }
        });

        // Recalculate bounds
        get().calculateBrowserBounds();

        // Persist state (debounced in actual implementation)
        if (!state.leftPanel.isDragging) {
          get().persistState();
        }
      },

      setRightPanelWidth: (width: number) => {
        const state = get();
        const validatedWidth = validateWidth(
          width,
          RIGHT_PANEL_MIN_WIDTH,
          RIGHT_PANEL_MAX_WIDTH,
          state.windowWidth,
          state.leftPanel.isExpanded ? state.leftPanel.width : 0
        );

        set({
          rightPanel: { ...state.rightPanel, width: validatedWidth }
        });

        // Recalculate bounds
        get().calculateBrowserBounds();

        // Persist state (debounced in actual implementation)
        if (!state.rightPanel.isDragging) {
          get().persistState();
        }
      },

      setLeftPanelDragging: (isDragging: boolean) => {
        const state = get();
        set({
          leftPanel: { ...state.leftPanel, isDragging }
        });

        // Persist when drag ends
        if (!isDragging) {
          get().persistState();
        }
      },

      setRightPanelDragging: (isDragging: boolean) => {
        const state = get();
        set({
          rightPanel: { ...state.rightPanel, isDragging }
        });

        // Persist when drag ends
        if (!isDragging) {
          get().persistState();
        }
      },

      updateWindowSize: (width: number, height: number) => {
        set({
          windowWidth: width,
          windowHeight: height
        });

        // Recalculate bounds
        get().calculateBrowserBounds();
      },

      calculateBrowserBounds: () => {
        const state = get();
        const bounds = calculateBounds(
          state.leftPanel,
          state.rightPanel,
          state.windowWidth,
          state.windowHeight,
          state.navigationBarHeight
        );

        const currentStage = calculateStage(
          state.leftPanel.isExpanded,
          state.rightPanel.isExpanded
        );

        set({
          browserPreview: bounds,
          currentStage
        });

        // Notify Electron to update WebContentsView bounds
        if (typeof window !== 'undefined' && window.api?.view?.updateBrowserPreviewBounds) {
          window.api.view.updateBrowserPreviewBounds(bounds).catch((error) => {
            console.error('[LayoutStore] Failed to update browser bounds:', error);
          });
        }
      },

      calculateCurrentStage: () => {
        const state = get();
        return calculateStage(state.leftPanel.isExpanded, state.rightPanel.isExpanded);
      },

      persistState: async () => {
        const state = get();

        if (typeof window === 'undefined' || !window.api?.layout?.savePanelState) {
          return;
        }

        try {
          await window.api.layout.savePanelState({
            leftPanel: state.leftPanel,
            rightPanel: state.rightPanel,
            browserPreview: state.browserPreview,
            currentStage: state.currentStage,
            navigationBarHeight: state.navigationBarHeight,
            windowWidth: state.windowWidth,
            windowHeight: state.windowHeight,
            animationDuration: state.animationDuration,
            isTransitioning: state.isTransitioning
          });
        } catch (error) {
          console.error('[LayoutStore] Failed to persist state:', error);
        }
      },

      restoreState: (partialState: Partial<LayoutState>) => {
        set((state) => ({
          ...state,
          ...partialState
        }));

        // Recalculate bounds after restoration
        get().calculateBrowserBounds();
      },

      setTransitioning: (isTransitioning: boolean) => {
        set({ isTransitioning });
      },

      resetToDefaults: () => {
        set({
          leftPanel: createInitialLeftPanel(),
          rightPanel: createInitialRightPanel(),
          isTransitioning: true
        });

        get().calculateBrowserBounds();

        setTimeout(() => {
          set({ isTransitioning: false });
        }, ANIMATION_DURATION);

        get().persistState();
      }
    }),
    {
      name: 'layout-store',
      enabled: process.env.NODE_ENV === 'development'
    }
  )
);

// Selectors for optimized re-renders
export const selectLeftPanel = (state: LayoutStore) => state.leftPanel;
export const selectRightPanel = (state: LayoutStore) => state.rightPanel;
export const selectBrowserPreview = (state: LayoutStore) => state.browserPreview;
export const selectCurrentStage = (state: LayoutStore) => state.currentStage;
export const selectIsTransitioning = (state: LayoutStore) => state.isTransitioning;
