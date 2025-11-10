# Design Document

## Overview

This design addresses TypeScript compilation errors across browser tools and advanced browser tools by correcting import paths, adding proper type definitions, fixing function signatures, and ensuring type safety throughout the codebase. The solution maintains compatibility with the @jarvis-agent/core framework while ensuring all code compiles without errors.

## Architecture

### Module Structure

```
electron/main/services/
├── browser-tools/              # Core browser automation tools
│   ├── browser-evaluate.ts     # Script execution tool
│   ├── browser-select.ts       # Dropdown selection tool
│   ├── browser-hover.ts        # Hover interaction tool
│   ├── browser-get-clickable-elements.ts
│   ├── browser-web-search.ts   # Web search tool
│   └── index.ts                # Tool exports
└── advanced-browser-tools/     # Advanced extraction tools
    ├── cdp-extraction/         # CDP-based extraction
    ├── element-extraction/     # Element analysis tools
    ├── file-operations/        # File I/O operations
    ├── javascript-functions/   # JS function discovery
    └── shared/                 # Shared utilities
```

### Type System Integration

The fix integrates with the @jarvis-agent/core type system:

```typescript
// Correct import structure
import { AgentContext } from '@jarvis-agent/core/core/context';
import type { Tool, ToolResult } from '@jarvis-agent/core/types';
import type { LanguageModelV2ToolCallPart } from '@ai-sdk/provider';

// Tool interface compliance
interface Tool {
  execute: (
    args: Record<string, unknown>,
    agentContext: AgentContext,
    toolCall: LanguageModelV2ToolCallPart
  ) => Promise<ToolResult>;
}
```

## Components and Interfaces

### 1. Import Path Corrections

**Component**: Import Statement Updater

**Purpose**: Update all incorrect AgentContext imports to use the correct module path

**Changes Required**:
- Replace `import { AgentContext } from '@jarvis-agent/core/types'`
- With `import { AgentContext } from '@jarvis-agent/core/core/context'`

**Affected Files** (23 files):
- `browser-tools/browser-evaluate.ts`
- `browser-tools/browser-select.ts`
- `browser-tools/browser-hover.ts`
- `browser-tools/browser-get-clickable-elements.ts`
- `browser-tools/browser-web-search.ts`
- `advanced-browser-tools/cdp-extraction/extract-complete-element-cdp.ts`
- `advanced-browser-tools/cdp-extraction/extract-element-styles-cdp.ts`
- `advanced-browser-tools/element-extraction/clone-element-complete.ts`
- `advanced-browser-tools/element-extraction/extract-element-animations.ts`
- `advanced-browser-tools/element-extraction/extract-element-assets.ts`
- `advanced-browser-tools/element-extraction/extract-element-events.ts`
- `advanced-browser-tools/element-extraction/extract-element-structure.ts`
- `advanced-browser-tools/element-extraction/extract-element-styles.ts`
- `advanced-browser-tools/file-operations/clone-element-to-file.ts`

### 2. Tool Execute Function Signature Fixes

**Component**: Execute Function Signature Standardizer

**Purpose**: Ensure all tool execute functions match the required interface

**Pattern**:
```typescript
// BEFORE (incorrect)
execute: async (args: SpecificArgsType, agentContext: AgentContext) => {
  // implementation
}

// AFTER (correct)
execute: async (
  args: Record<string, unknown>,
  agentContext: AgentContext,
  toolCall: LanguageModelV2ToolCallPart
) => {
  const typedArgs = args as SpecificArgsType;
  // implementation using typedArgs
}
```

**Affected Files**:
- `browser-tools/browser-evaluate.ts` - BrowserEvaluateArgs
- `browser-tools/browser-select.ts` - BrowserSelectArgs
- `browser-tools/browser-web-search.ts` - BrowserWebSearchArgs

### 3. DOM Type Handling

**Component**: Browser Context Type Handler

**Purpose**: Properly handle DOM types in browser execution contexts

**Strategy**: DOM types (document, window, Element, etc.) are available in browser execution contexts but not in Node.js. The code uses these types in string-based scripts that execute in the browser.

**Solution Approaches**:

**Option A: Type Assertions for Browser Scripts**
```typescript
// For inline browser scripts, use type assertions
const result = await view.webContents.executeJavaScript(`
  (() => {
    const element = document.querySelector('${selector}');
    return element ? element.textContent : null;
  })()
`);
```

**Option B: Extract Browser Scripts to Separate Functions**
```typescript
// Define browser-side functions with proper typing
function getBrowserScript() {
  return `
    (() => {
      const element = document.querySelector('${selector}');
      return element ? element.textContent : null;
    })()
  `;
}
```

**Option C: Add DOM lib to tsconfig for specific files**
- Not recommended as these are Node.js files, not browser files

**Recommended**: Option A - Keep inline scripts as strings, which naturally bypass TypeScript checking for browser-only code

### 4. Type-Only Import Fixes

**Component**: Import Syntax Corrector

**Purpose**: Use proper type-only import syntax for verbatimModuleSyntax compliance

**Pattern**:
```typescript
// BEFORE
import { FileOperationResult } from './types';

// AFTER (if only used as type)
import type { FileOperationResult } from './types';
```

**Affected Files**:
- `advanced-browser-tools/shared/file-utils.ts`

### 5. Implicit Any Type Fixes

**Component**: Type Annotation Adder

**Purpose**: Add explicit type annotations to all function parameters

**Patterns**:

**Array callbacks**:
```typescript
// BEFORE
.map((img) => img.src)

// AFTER
.map((img: HTMLImageElement) => img.src)
```

**DOM element parameters**:
```typescript
// BEFORE
function processElement(el) { }

// AFTER
function processElement(el: Element) { }
```

**Affected Files**: Multiple files with callback functions and DOM manipulation

### 6. Unused Variable Cleanup

**Component**: Variable Usage Optimizer

**Purpose**: Remove or properly handle unused variables

**Strategies**:
1. **Remove if truly unused**: Delete the variable declaration
2. **Prefix with underscore**: `_variable` to indicate intentional non-use
3. **Use the variable**: Implement the intended functionality

**Affected Variables**:
- `warningMessage` in browser-evaluate.ts
- `includeChildren` in extract-complete-element-cdp.ts
- `options` in clone-element-complete.ts
- `computed` in clone-element-complete.ts
- `SecurityValidator` import in file-utils.ts

## Data Models

### Tool Argument Types

All tool argument interfaces remain unchanged but are cast within execute functions:

```typescript
interface BrowserEvaluateArgs {
  script: string;
  timeout?: number;
}

interface BrowserSelectArgs {
  selector: string;
  value: string;
}

interface BrowserWebSearchArgs {
  query: string;
  engine?: 'google' | 'bing' | 'duckduckgo';
}
```

### Tool Result Type

Standard ToolResult from @jarvis-agent/core:

```typescript
type ToolResult = {
  content: [{ type: "text"; text: string }] | 
           [{ type: "image"; data: string; mimeType?: string }] |
           [{ type: "text"; text: string }, { type: "image"; data: string; mimeType?: string }];
  isError?: boolean;
  extInfo?: Record<string, unknown>;
};
```

## Error Handling

### Compilation Error Categories

1. **Import Errors (2305)**: Wrong module path for AgentContext
   - **Fix**: Update import path to '@jarvis-agent/core/core/context'

2. **DOM Type Errors (2304, 2584)**: DOM types not available in Node.js context
   - **Fix**: Keep browser scripts as strings (no TypeScript checking needed)

3. **Type Mismatch Errors (2322)**: Execute function signature mismatch
   - **Fix**: Update signature and cast args internally

4. **Implicit Any Errors (7006)**: Missing type annotations
   - **Fix**: Add explicit type annotations

5. **Unused Variable Warnings (6133)**: Variables declared but not used
   - **Fix**: Remove, prefix with underscore, or use the variable

6. **Import Syntax Errors (1484)**: Type imports without 'type' keyword
   - **Fix**: Use 'import type' for type-only imports

### Error Prevention

- Use strict TypeScript configuration
- Validate tool signatures against framework interface
- Ensure all browser scripts are properly encapsulated as strings
- Add type annotations for all function parameters

## Testing Strategy

### Compilation Testing

1. **TypeScript Compilation**
   ```bash
   pnpm run type-check
   ```
   - Should complete with 0 errors
   - Should complete with 0 warnings (or only acceptable warnings)

2. **Build Testing**
   ```bash
   pnpm run build:deps
   ```
   - Should compile all TypeScript files successfully
   - Should generate valid JavaScript output

### Runtime Testing

1. **Tool Execution Testing**
   - Test each browser tool with sample inputs
   - Verify tools execute without runtime errors
   - Confirm tool results match expected format

2. **Integration Testing**
   - Test tools within agent execution context
   - Verify AgentContext is properly passed and used
   - Confirm tool results are properly returned to agent

### Validation Checklist

- [ ] All AgentContext imports use correct path
- [ ] All tool execute functions match required signature
- [ ] All function parameters have explicit types
- [ ] No unused variables remain (or are prefixed with _)
- [ ] Type-only imports use 'import type' syntax
- [ ] TypeScript compilation succeeds with 0 errors
- [ ] Application builds successfully
- [ ] All tools execute correctly at runtime

## Implementation Notes

### File-by-File Approach

Fix errors systematically by file category:

1. **Phase 1**: Browser Tools (5 files)
   - Core tools with simpler structure
   - Establish patterns for advanced tools

2. **Phase 2**: Advanced Browser Tools - Element Extraction (6 files)
   - Most complex DOM manipulation
   - Establish DOM type handling patterns

3. **Phase 3**: Advanced Browser Tools - CDP Extraction (2 files)
   - CDP-specific patterns
   - Similar to element extraction

4. **Phase 4**: Advanced Browser Tools - Other (3 files)
   - File operations
   - JavaScript function discovery

5. **Phase 5**: Shared Utilities (1 file)
   - Type import fixes

### Minimal Changes Principle

- Only fix what's broken
- Don't refactor working code
- Maintain existing functionality
- Preserve code structure and patterns

### Testing After Each Phase

- Run type-check after each file fix
- Verify error count decreases
- Ensure no new errors are introduced
