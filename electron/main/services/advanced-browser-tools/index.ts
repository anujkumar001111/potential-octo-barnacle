/**
 * Advanced Browser Tools - Main Export
 * 
 * This module provides 25 advanced browser automation tools organized into:
 * 1. Element Extraction (12 tools) - Extract complete element information
 * 2. JavaScript Function Management (10 tools) - Discover and execute page functions
 * 3. Chrome DevTools Protocol (3 tools) - Direct CDP command access
 * 
 * @see .kiro/specs/advanced-browser-tools/ for complete specification
 */

// Shared utilities
export * from './shared';

// Element extraction tools
export * from './element-extraction';

// CDP extraction tools
export * from './cdp-extraction';

// File operations tools
export * from './file-operations';

// JavaScript function management tools
export * from './javascript-functions';

// CDP command tools
export * from './cdp-commands';
