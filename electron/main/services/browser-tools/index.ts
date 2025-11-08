/**
 * Browser Tools - Phase 1, 2 & 3 Implementation
 *
 * This module exports browser tools that extend the existing BrowserAgent
 * with additional capabilities from the MCP browser toolset.
 *
 * Phase 1 Tools (6):
 * 1. browser_get_markdown - Extract page content as markdown
 * 2. browser_read_links - Read all links from the page
 * 3. browser_go_forward - Navigate forward in history
 * 4. browser_get_text - Get text from specific element
 * 5. browser_press_key - Simulate keyboard input
 * 6. browser_scroll - Scroll the page (with horizontal support)
 *
 * Phase 2 Tools (3) - Tab Management:
 * 7. browser_new_tab - Navigate to a new URL
 * 8. browser_close_tab - Close current tab
 * 9. browser_switch_tab - Switch to specific tab by ID
 *
 * Phase 3 Tools (2) - Core Interaction:
 * 10. browser_paste_text - Instant text injection into inputs
 * 11. browser_wait_for_element - Wait for element with timeout
 *
 * @see project_status.md for complete implementation details
 */

// Phase 1 tools
export { browserGetMarkdownTool } from './browser-get-markdown';
export { browserReadLinksTool } from './browser-read-links';
export { browserGoForwardTool } from './browser-go-forward';
export { browserGetTextTool } from './browser-get-text';
export { browserPressKeyTool } from './browser-press-key';
export { browserScrollTool } from './browser-scroll';

// Phase 2 tools - Tab management
export { browserNewTabTool } from './browser-new-tab';
export { browserCloseTabTool } from './browser-close-tab';
export { browserSwitchTabTool } from './browser-switch-tab';

// Phase 3 tools - Core interaction
export { browserPasteTextTool } from './browser-paste-text';
export { browserWaitForElementTool } from './browser-wait-for-element';

// Phase 5 tools - Advanced Gestures & Interactions
export { browserDragAndDropTool } from './browser-drag-and-drop';
export { browserSetZoomTool } from './browser-set-zoom';
export { browserPinchZoomTool } from './browser-pinch-zoom';
export { browserKeyboardMouseComboTool } from './browser-keyboard-mouse-combo';
export { browserScrollHorizontalTool } from './browser-scroll-horizontal';

// Shared utilities
export * from './shared/error-codes';
export * from './shared/types';
