# Design Document: Advanced Browser Tools (Phase 1)

## Overview

This design document outlines the technical approach for implementing 25 advanced browser tools that extend the existing BrowserAgent with deep element analysis, JavaScript function management, and Chrome DevTools Protocol (CDP) access capabilities.

The implementation is organized into three main categories:
1. **Element Cloning & Deep Analysis** (12 tools) - Extract complete element information
2. **JavaScript Function Management** (10 tools) - Discover and execute page functions  
3. **Chrome DevTools Protocol** (3 tools) - Direct CDP command access

All tools follow the Eko Tool interface pattern and integrate seamlessly with the existing BrowserAgent infrastructure.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Eko Service (Main Process)                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              BrowserAgent (Existing)                  │  │
│  │  - navigate_to, click_element, input_text, etc.      │  │
│  └───────────────────────────────────────────────────────┘  │
│                            ↓                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Advanced Browser Tools (New)                  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Element Extraction Module                      │  │  │
│  │  │  - extract_element_styles                       │  │  │
│  │  │  - extract_element_structure                    │  │  │
│  │  │  - extract_element_events                       │  │  │
│  │  │  - extract_element_animations                   │  │  │
│  │  │  - extract_element_assets                       │  │  │
│  │  │  - extract_related_files                        │  │  │
│  │  │  - clone_element_complete                       │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  CDP Extraction Module                          │  │  │
│  │  │  - extract_element_styles_cdp                   │  │  │
│  │  │  - extract_complete_element_cdp                 │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  File Operations Module                         │  │  │
│  │  │  - clone_element_to_file                        │  │  │
│  │  │  - extract_complete_element_to_file             │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  JavaScript Function Module                     │  │  │
│  │  │  - discover_global_functions                    │  │  │
│  │  │  - discover_object_methods                      │  │  │
│  │  │  - call_javascript_function                     │  │  │
│  │  │  - inspect_function_signature                   │  │  │
│  │  │  - create_persistent_function                   │  │  │
│  │  │  - inject_and_execute_script                    │  │  │
│  │  │  - execute_function_sequence                    │  │  │
│  │  │  - get_execution_contexts                       │  │  │
│  │  │  - get_function_executor_info                   │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  CDP Command Module                             │  │  │
│  │  │  - execute_cdp_command                          │  │  │
│  │  │  - list_cdp_commands                            │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                            ↓                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Shared Utilities                              │  │
│  │  - Error handling                                     │  │
│  │  - Response formatting                                │  │
│  │  - File I/O operations                                │  │
│  │  - Security validation                                │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Electron WebContentsView                        │
│  - Execute JavaScript in page context                        │
│  - Access CDP via debugger protocol                          │
│  - Evaluate expressions and return results                   │
└─────────────────────────────────────────────────────────────┘
```

### Module Organization

```
electron/main/services/
├── browser-tools/                    # Existing tools
│   ├── browser-get-markdown.ts
│   ├── browser-scroll.ts
│   └── ... (18 existing tools)
├── advanced-browser-tools/           # New tools (Phase 1)
│   ├── element-extraction/
│   │   ├── extract-element-styles.ts
│   │   ├── extract-element-structure.ts
│   │   ├── extract-element-events.ts
│   │   ├── extract-element-animations.ts
│   │   ├── extract-element-assets.ts
│   │   ├── extract-related-files.ts
│   │   ├── clone-element-complete.ts
│   │   └── index.ts
│   ├── cdp-extraction/
│   │   ├── extract-element-styles-cdp.ts
│   │   ├── extract-complete-element-cdp.ts
│   │   └── index.ts
│   ├── file-operations/
│   │   ├── clone-element-to-file.ts
│   │   ├── extract-complete-element-to-file.ts
│   │   └── index.ts
│   ├── javascript-functions/
│   │   ├── discover-global-functions.ts
│   │   ├── discover-object-methods.ts
│   │   ├── call-javascript-function.ts
│   │   ├── inspect-function-signature.ts
│   │   ├── create-persistent-function.ts
│   │   ├── inject-and-execute-script.ts
│   │   ├── execute-function-sequence.ts
│   │   ├── get-execution-contexts.ts
│   │   ├── get-function-executor-info.ts
│   │   └── index.ts
│   ├── cdp-commands/
│   │   ├── execute-cdp-command.ts
│   │   ├── list-cdp-commands.ts
│   │   └── index.ts
│   ├── shared/
│   │   ├── types.ts
│   │   ├── error-handler.ts
│   │   ├── response-formatter.ts
│   │   ├── file-utils.ts
│   │   ├── security-validator.ts
│   │   └── index.ts
│   └── index.ts
└── eko-service.ts                    # Register new tools
```

## Components and Interfaces

### 1. Element Extraction Module

#### Core Extraction Functions

Each extraction function follows this pattern:

```typescript
// electron/main/services/advanced-browser-tools/element-extraction/extract-element-styles.ts
import { Tool } from '@jarvis-agent/core/types';
import { WebContentsView } from 'electron';

interface ExtractStylesParams {
  selector: string;
  include_computed?: boolean;
  include_css_rules?: boolean;
  include_pseudo?: boolean;
  include_inheritance?: boolean;
}

interface StylesResult {
  computed_styles?: Record<string, string>;
  css_rules?: CSSRule[];
  pseudo_elements?: Record<string, Record<string, string>>;
  inheritance_chain?: InheritanceNode[];
}

export const extractElementStylesTool: Tool = {
  name: 'extract_element_styles',
  description: 'Extract complete CSS styling information from an element',
  parameters: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS selector for the element'
      },
      include_computed: {
        type: 'boolean',
        description: 'Include computed styles',
        default: true
      },
      include_css_rules: {
        type: 'boolean',
        description: 'Include matching CSS rules',
        default: true
      },
      include_pseudo: {
        type: 'boolean',
        description: 'Include pseudo-element styles',
        default: true
      },
      include_inheritance: {
        type: 'boolean',
        description: 'Include style inheritance chain',
        default: false
      }
    },
    required: ['selector']
  },
  execute: async (params: ExtractStylesParams, context: any) => {
    const webContents = context.webContents as WebContentsView;
    
    // Execute extraction script in page context
    const result = await webContents.executeJavaScript(`
      (function() {
        const element = document.querySelector('${params.selector}');
        if (!element) return { error: 'Element not found' };
        
        const result = {};
        
        // Extract computed styles
        if (${params.include_computed}) {
          const computed = window.getComputedStyle(element);
          result.computed_styles = {};
          for (let i = 0; i < computed.length; i++) {
            const prop = computed[i];
            result.computed_styles[prop] = computed.getPropertyValue(prop);
          }
        }
        
        // Extract CSS rules
        if (${params.include_css_rules}) {
          result.css_rules = extractMatchingRules(element);
        }
        
        // Extract pseudo-element styles
        if (${params.include_pseudo}) {
          result.pseudo_elements = {
            before: extractPseudoStyles(element, '::before'),
            after: extractPseudoStyles(element, '::after')
          };
        }
        
        // Extract inheritance chain
        if (${params.include_inheritance}) {
          result.inheritance_chain = extractInheritanceChain(element);
        }
        
        return result;
      })();
    `);
    
    return {
      success: true,
      data: result
    };
  }
};
```


### 2. CDP Extraction Module

CDP-based extraction avoids JavaScript evaluation issues by using Chrome DevTools Protocol directly:

```typescript
// electron/main/services/advanced-browser-tools/cdp-extraction/extract-element-styles-cdp.ts
import { Tool } from '@jarvis-agent/core/types';
import { WebContentsView } from 'electron';

export const extractElementStylesCdpTool: Tool = {
  name: 'extract_element_styles_cdp',
  description: 'Extract element styles using CDP (no JavaScript evaluation)',
  parameters: {
    type: 'object',
    properties: {
      selector: { type: 'string' },
      include_computed: { type: 'boolean', default: true },
      include_css_rules: { type: 'boolean', default: true },
      include_pseudo: { type: 'boolean', default: true },
      include_inheritance: { type: 'boolean', default: false }
    },
    required: ['selector']
  },
  execute: async (params, context) => {
    const webContents = context.webContents as WebContentsView;
    
    // Use CDP to get document node
    const { root } = await webContents.debugger.sendCommand('DOM.getDocument');
    
    // Query selector using CDP
    const { nodeId } = await webContents.debugger.sendCommand('DOM.querySelector', {
      nodeId: root.nodeId,
      selector: params.selector
    });
    
    if (!nodeId) {
      return { success: false, error: 'Element not found' };
    }
    
    const result: any = {};
    
    // Get computed styles via CDP
    if (params.include_computed) {
      const { computedStyle } = await webContents.debugger.sendCommand(
        'CSS.getComputedStyleForNode',
        { nodeId }
      );
      result.computed_styles = computedStyle.reduce((acc, style) => {
        acc[style.name] = style.value;
        return acc;
      }, {});
    }
    
    // Get matching CSS rules via CDP
    if (params.include_css_rules) {
      const { matchedCSSRules } = await webContents.debugger.sendCommand(
        'CSS.getMatchedStylesForNode',
        { nodeId }
      );
      result.css_rules = matchedCSSRules;
    }
    
    return { success: true, data: result };
  }
};
```

### 3. JavaScript Function Management Module

#### Function Discovery

```typescript
// electron/main/services/advanced-browser-tools/javascript-functions/discover-global-functions.ts
export const discoverGlobalFunctionsTool: Tool = {
  name: 'discover_global_functions',
  description: 'Discover all global JavaScript functions available in window',
  parameters: {
    type: 'object',
    properties: {
      include_built_in: {
        type: 'boolean',
        description: 'Include built-in browser functions',
        default: false
      },
      filter_pattern: {
        type: 'string',
        description: 'Regex pattern to filter function names'
      }
    }
  },
  execute: async (params, context) => {
    const webContents = context.webContents as WebContentsView;
    
    const result = await webContents.executeJavaScript(`
      (function() {
        const functions = [];
        const builtInFunctions = new Set([
          'alert', 'confirm', 'prompt', 'setTimeout', 'setInterval',
          'fetch', 'XMLHttpRequest', 'addEventListener', 'removeEventListener'
        ]);
        
        for (const key in window) {
          try {
            if (typeof window[key] === 'function') {
              // Skip built-in functions if requested
              if (!${params.include_built_in} && builtInFunctions.has(key)) {
                continue;
              }
              
              // Apply filter pattern if provided
              if (${params.filter_pattern ? `!'${params.filter_pattern}'.test(key)` : 'false'}) {
                continue;
              }
              
              functions.push({
                name: key,
                parameters: window[key].length,
                is_async: window[key].constructor.name === 'AsyncFunction',
                source: window[key].toString().substring(0, 200)
              });
            }
          } catch (e) {
            // Skip functions that throw on access
          }
        }
        
        return functions;
      })();
    `);
    
    return { success: true, data: result };
  }
};
```

#### Function Execution

```typescript
// electron/main/services/advanced-browser-tools/javascript-functions/call-javascript-function.ts
export const callJavaScriptFunctionTool: Tool = {
  name: 'call_javascript_function',
  description: 'Call an existing JavaScript function in the page context',
  parameters: {
    type: 'object',
    properties: {
      function_path: {
        type: 'string',
        description: 'Path to function (e.g., "window.myFunction" or "document.getElementById")'
      },
      args: {
        type: 'array',
        description: 'Arguments to pass to the function',
        items: { type: 'any' }
      },
      timeout: {
        type: 'number',
        description: 'Execution timeout in milliseconds',
        default: 30000
      }
    },
    required: ['function_path']
  },
  execute: async (params, context) => {
    const webContents = context.webContents as WebContentsView;
    
    // Validate function path
    if (!/^[\w.]+$/.test(params.function_path)) {
      return { success: false, error: 'Invalid function path' };
    }
    
    try {
      const result = await Promise.race([
        webContents.executeJavaScript(`
          (async function() {
            const fn = ${params.function_path};
            if (typeof fn !== 'function') {
              throw new Error('Not a function: ${params.function_path}');
            }
            
            const args = ${JSON.stringify(params.args || [])};
            const result = await fn(...args);
            return result;
          })();
        `),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Function execution timeout')), params.timeout)
        )
      ]);
      
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }
};
```

### 4. CDP Command Module

```typescript
// electron/main/services/advanced-browser-tools/cdp-commands/execute-cdp-command.ts
export const executeCdpCommandTool: Tool = {
  name: 'execute_cdp_command',
  description: 'Execute any Chrome DevTools Protocol command',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'CDP command name (e.g., "Page.navigate", "DOM.getDocument")'
      },
      params: {
        type: 'object',
        description: 'Command parameters'
      }
    },
    required: ['command']
  },
  execute: async (params, context) => {
    const webContents = context.webContents as WebContentsView;
    
    // Validate command format
    if (!/^[A-Z][a-z]+\.[a-z]+/.test(params.command)) {
      return { success: false, error: 'Invalid CDP command format' };
    }
    
    try {
      // Ensure debugger is attached
      if (!webContents.debugger.isAttached()) {
        webContents.debugger.attach('1.3');
      }
      
      const result = await webContents.debugger.sendCommand(
        params.command,
        params.params || {}
      );
      
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }
};
```

### 5. File Operations Module

```typescript
// electron/main/services/advanced-browser-tools/file-operations/clone-element-to-file.ts
import * as fs from 'fs/promises';
import * as path from 'path';

export const cloneElementToFileTool: Tool = {
  name: 'clone_element_to_file',
  description: 'Clone element completely and save to file',
  parameters: {
    type: 'object',
    properties: {
      selector: { type: 'string' },
      output_dir: {
        type: 'string',
        description: 'Output directory path',
        default: './element-clones'
      },
      extraction_options: {
        type: 'object',
        description: 'Options for each extraction type'
      }
    },
    required: ['selector']
  },
  execute: async (params, context) => {
    // Extract complete element data
    const elementData = await extractCompleteElement(
      context.webContents,
      params.selector,
      params.extraction_options
    );
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedSelector = params.selector.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `clone_${sanitizedSelector}_${timestamp}.json`;
    
    // Ensure output directory exists
    await fs.mkdir(params.output_dir, { recursive: true });
    
    // Write to file
    const filepath = path.join(params.output_dir, filename);
    await fs.writeFile(filepath, JSON.stringify(elementData, null, 2));
    
    // Get file stats
    const stats = await fs.stat(filepath);
    
    return {
      success: true,
      data: {
        file_path: filepath,
        file_size_kb: Math.round(stats.size / 1024),
        selector: params.selector,
        timestamp: new Date().toISOString()
      }
    };
  }
};
```

## Data Models

### Type Definitions

All type definitions are organized into logical sections with clear documentation:

```typescript
// electron/main/services/advanced-browser-tools/shared/types.ts

// ============================================================================
// Element Extraction Types
// ============================================================================

export interface ElementStyles {
  computed_styles?: Record<string, string>;
  css_rules?: CSSRule[];
  pseudo_elements?: Record<string, Record<string, string>>;
  inheritance_chain?: InheritanceNode[];
}

export interface CSSRule {
  selector: string;
  properties: Record<string, string>;
  source: string;
  specificity: number;
}

export interface InheritanceNode {
  element: string;
  inherited_properties: string[];
}

export interface ElementStructure {
  tag_name: string;
  id?: string;
  classes: string[];
  attributes: Record<string, string>;
  data_attributes: Record<string, string>;
  position: BoundingBox;
  children?: ElementStructure[];
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ElementEvents {
  inline_handlers: Record<string, string>;
  event_listeners: EventListener[];
  framework_handlers: FrameworkHandler[];
}

export interface EventListener {
  type: string;
  handler: string;
  capture: boolean;
  passive: boolean;
  once: boolean;
}

export interface FrameworkHandler {
  framework: 'react' | 'vue' | 'angular' | 'svelte' | 'other';
  event_type: string;
  handler_name?: string;
}

export interface ElementAnimations {
  css_animations: CSSAnimation[];
  transitions: CSSTransition[];
  transforms: CSSTransform[];
  keyframes: Keyframe[];
}

export interface CSSAnimation {
  name: string;
  duration: string;
  timing_function: string;
  delay: string;
  iteration_count: string;
  direction: string;
  fill_mode: string;
}

export interface CSSTransition {
  property: string;
  duration: string;
  timing_function: string;
  delay: string;
}

export interface CSSTransform {
  type: 'translate' | 'rotate' | 'scale' | 'skew' | 'matrix';
  values: number[];
}

export interface Keyframe {
  name: string;
  rules: KeyframeRule[];
}

export interface KeyframeRule {
  offset: string;
  properties: Record<string, string>;
}

export interface ElementAssets {
  images: ImageAsset[];
  background_images: string[];
  fonts: FontInfo[];
}

export interface ImageAsset {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  is_data_url: boolean;
}

export interface FontInfo {
  family: string;
  weight: string;
  style: string;
  url?: string;
}

export interface RelatedFiles {
  stylesheets: Stylesheet[];
  scripts: Script[];
  imports: string[];
  frameworks: string[];
}

export interface Stylesheet {
  href: string;
  media?: string;
  disabled: boolean;
}

export interface Script {
  src?: string;
  type?: string;
  async: boolean;
  defer: boolean;
  is_module: boolean;
}

export interface CompleteElementClone {
  selector: string;
  url: string;
  timestamp: string;
  styles: ElementStyles;
  structure: ElementStructure;
  events: ElementEvents;
  animations: ElementAnimations;
  assets: ElementAssets;
  related_files: RelatedFiles;
}

// ============================================================================
// JavaScript Function Management Types
// ============================================================================

export interface FunctionInfo {
  name: string;
  parameters: number;
  is_async: boolean;
  source: string;
  signature?: string;
  documentation?: string;
}

export interface FunctionExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  stack?: string;
  execution_time_ms?: number;
}

export interface ExecutionContext {
  id: string;
  type: 'main' | 'iframe' | 'worker';
  url?: string;
  name?: string;
  is_active: boolean;
}

export interface CDPCommand {
  domain: string;
  name: string;
  parameters?: CDPParameter[];
  returns?: CDPParameter[];
}

export interface CDPParameter {
  name: string;
  type: string;
  optional?: boolean;
  description?: string;
}

// ============================================================================
// Tool Response Types
// ============================================================================

export interface ToolSuccessResponse<T = any> {
  success: true;
  data: T;
  metadata?: ToolMetadata;
}

export interface ToolErrorResponse {
  success: false;
  error: string;
  error_code: string;
  details?: any;
}

export type ToolResponse<T = any> = ToolSuccessResponse<T> | ToolErrorResponse;

export interface ToolMetadata {
  selector?: string;
  url?: string;
  timestamp?: string;
  execution_time_ms?: number;
  [key: string]: any;
}

// ============================================================================
// File Operation Types
// ============================================================================

export interface FileOperationResult {
  file_path: string;
  file_size_kb: number;
  filename: string;
  timestamp: string;
}

// ============================================================================
// Extraction Options Types
// ============================================================================

export interface StyleExtractionOptions {
  include_computed?: boolean;
  include_css_rules?: boolean;
  include_pseudo?: boolean;
  include_inheritance?: boolean;
}

export interface StructureExtractionOptions {
  include_children?: boolean;
  include_attributes?: boolean;
  include_data_attributes?: boolean;
  max_depth?: number;
}

export interface EventExtractionOptions {
  include_inline?: boolean;
  include_listeners?: boolean;
  include_framework?: boolean;
  analyze_handlers?: boolean;
}

export interface AnimationExtractionOptions {
  include_css_animations?: boolean;
  include_transitions?: boolean;
  include_transforms?: boolean;
  analyze_keyframes?: boolean;
}

export interface AssetExtractionOptions {
  include_images?: boolean;
  include_backgrounds?: boolean;
  include_fonts?: boolean;
  fetch_external?: boolean;
}

export interface RelatedFilesOptions {
  analyze_css?: boolean;
  analyze_js?: boolean;
  follow_imports?: boolean;
  max_depth?: number;
}

export interface CompleteExtractionOptions {
  styles?: StyleExtractionOptions;
  structure?: StructureExtractionOptions;
  events?: EventExtractionOptions;
  animations?: AnimationExtractionOptions;
  assets?: AssetExtractionOptions;
  related_files?: RelatedFilesOptions;
}
```

## Error Handling

### Error Codes and Messages

```typescript
// electron/main/services/advanced-browser-tools/shared/error-handler.ts

export enum AdvancedToolErrorCode {
  ELEMENT_NOT_FOUND = 'ELEMENT_NOT_FOUND',
  INVALID_SELECTOR = 'INVALID_SELECTOR',
  EXECUTION_TIMEOUT = 'EXECUTION_TIMEOUT',
  FUNCTION_NOT_FOUND = 'FUNCTION_NOT_FOUND',
  INVALID_FUNCTION_PATH = 'INVALID_FUNCTION_PATH',
  CDP_COMMAND_FAILED = 'CDP_COMMAND_FAILED',
  CDP_NOT_AVAILABLE = 'CDP_NOT_AVAILABLE',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS'
}

export class AdvancedToolError extends Error {
  constructor(
    public code: AdvancedToolErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AdvancedToolError';
  }
}

export function handleToolError(error: any): ToolErrorResponse {
  if (error instanceof AdvancedToolError) {
    return {
      success: false,
      error: error.message,
      error_code: error.code,
      details: error.details
    };
  }
  
  return {
    success: false,
    error: error.message || 'Unknown error',
    error_code: 'UNKNOWN_ERROR'
  };
}
```

### Security Validation

```typescript
// electron/main/services/advanced-browser-tools/shared/security-validator.ts

export class SecurityValidator {
  private static DANGEROUS_PATTERNS = [
    /eval\s*\(/,
    /Function\s*\(/,
    /setTimeout\s*\(\s*["'`]/,
    /setInterval\s*\(\s*["'`]/,
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i  // inline event handlers
  ];
  
  static validateJavaScriptCode(code: string): void {
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(code)) {
        throw new AdvancedToolError(
          AdvancedToolErrorCode.SECURITY_VIOLATION,
          `Dangerous pattern detected: ${pattern}`,
          { pattern: pattern.toString() }
        );
      }
    }
  }
  
  static validateSelector(selector: string): void {
    // Basic validation - can be expanded
    if (!selector || selector.trim().length === 0) {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.INVALID_SELECTOR,
        'Selector cannot be empty'
      );
    }
    
    if (selector.length > 1000) {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.INVALID_SELECTOR,
        'Selector too long (max 1000 characters)'
      );
    }
  }
  
  static validateFunctionPath(path: string): void {
    if (!/^[\w.]+$/.test(path)) {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.INVALID_FUNCTION_PATH,
        'Function path must contain only alphanumeric characters, underscores, and dots'
      );
    }
  }
}
```

## Testing Strategy

### Unit Tests

```typescript
// electron/main/services/advanced-browser-tools/__tests__/extract-element-styles.test.ts
import { extractElementStylesTool } from '../element-extraction/extract-element-styles';

describe('extractElementStylesTool', () => {
  let mockWebContents: any;
  
  beforeEach(() => {
    mockWebContents = {
      executeJavaScript: jest.fn()
    };
  });
  
  it('should extract computed styles', async () => {
    mockWebContents.executeJavaScript.mockResolvedValue({
      computed_styles: {
        color: 'rgb(0, 0, 0)',
        'font-size': '16px'
      }
    });
    
    const result = await extractElementStylesTool.execute(
      { selector: '.test', include_computed: true },
      { webContents: mockWebContents }
    );
    
    expect(result.success).toBe(true);
    expect(result.data.computed_styles).toBeDefined();
  });
  
  it('should handle element not found', async () => {
    mockWebContents.executeJavaScript.mockResolvedValue({
      error: 'Element not found'
    });
    
    const result = await extractElementStylesTool.execute(
      { selector: '.nonexistent' },
      { webContents: mockWebContents }
    );
    
    expect(result.success).toBe(false);
  });
});
```

### Integration Tests

```typescript
// electron/main/services/advanced-browser-tools/__tests__/integration/element-cloning.test.ts
describe('Element Cloning Integration', () => {
  let browser: any;
  let page: any;
  
  beforeAll(async () => {
    // Set up test browser
    browser = await setupTestBrowser();
    page = await browser.newPage();
  });
  
  it('should clone a complete button element', async () => {
    await page.setContent(`
      <button class="test-btn" style="color: red;">
        Click me
      </button>
    `);
    
    const result = await cloneElementCompleteTool.execute(
      { selector: '.test-btn' },
      { webContents: page }
    );
    
    expect(result.success).toBe(true);
    expect(result.data.structure.tag_name).toBe('button');
    expect(result.data.styles.computed_styles.color).toBeDefined();
  });
});
```

## Performance Considerations

### Timeout Management

```typescript
// All tools implement timeout protection
const EXECUTION_TIMEOUT = 30000; // 30 seconds

async function executeWithTimeout<T>(
  promise: Promise<T>,
  timeout: number = EXECUTION_TIMEOUT
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Execution timeout')), timeout)
    )
  ]);
}
```

### Response Size Management

```typescript
// Automatically save large responses to files
const MAX_RESPONSE_SIZE = 1024 * 1024; // 1MB

async function handleLargeResponse(data: any, context: any): Promise<any> {
  const jsonString = JSON.stringify(data);
  
  if (jsonString.length > MAX_RESPONSE_SIZE) {
    // Save to file instead
    const filepath = await saveToFile(data, context);
    return {
      success: true,
      saved_to_file: true,
      file_path: filepath,
      file_size_kb: Math.round(jsonString.length / 1024)
    };
  }
  
  return { success: true, data };
}
```

## Integration with Existing Tools

### Tool Registration

```typescript
// electron/main/services/eko-service.ts
import * as advancedTools from './advanced-browser-tools';

// Register all advanced tools
Object.values(advancedTools).forEach(tool => {
  if (tool && typeof tool === 'object' && 'name' in tool) {
    this.agent.registerTool(tool);
  }
});
```

### Shared Context

All tools receive the same context object:

```typescript
interface ToolContext {
  webContents: WebContentsView;
  browserAgent: BrowserAgent;
  sessionId: string;
  timestamp: number;
}
```

## Migration Path

### Phase 1: Core Infrastructure (Week 1)
1. Create module structure
2. Implement shared utilities (error handling, security, file I/O)
3. Set up testing infrastructure

### Phase 2: Element Extraction (Week 2)
1. Implement basic extraction tools (styles, structure, events)
2. Implement advanced extraction tools (animations, assets, related files)
3. Implement complete cloning tool

### Phase 3: CDP & Functions (Week 3)
1. Implement CDP extraction tools
2. Implement JavaScript function management tools
3. Implement CDP command tools

### Phase 4: File Operations & Polish (Week 4)
1. Implement file-based operations
2. Add comprehensive error handling
3. Complete documentation and examples
4. Performance optimization

## Documentation

Each tool includes comprehensive JSDoc comments:

```typescript
/**
 * Extract complete CSS styling information from an element
 * 
 * @example
 * ```typescript
 * const result = await agent.executeTool('extract_element_styles', {
 *   selector: '.my-button',
 *   include_computed: true,
 *   include_css_rules: true,
 *   include_pseudo: true
 * });
 * ```
 * 
 * @param selector - CSS selector for the element
 * @param include_computed - Include computed styles (default: true)
 * @param include_css_rules - Include matching CSS rules (default: true)
 * @param include_pseudo - Include pseudo-element styles (default: true)
 * @param include_inheritance - Include style inheritance chain (default: false)
 * 
 * @returns ElementStyles object with requested style information
 * 
 * @throws {AdvancedToolError} ELEMENT_NOT_FOUND if selector doesn't match any element
 * @throws {AdvancedToolError} INVALID_SELECTOR if selector is malformed
 * @throws {AdvancedToolError} EXECUTION_TIMEOUT if extraction takes too long
 */
```

---

**Design Status**: Complete
**Next Step**: Create implementation tasks
