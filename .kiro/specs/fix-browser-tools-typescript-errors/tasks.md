# Implementation Plan

- [ ] 1. Fix Browser Tools Core Files
  - Fix AgentContext imports, execute function signatures, and type annotations in core browser tools
  - Update browser-evaluate.ts, browser-select.ts, browser-hover.ts, browser-get-clickable-elements.ts, browser-web-search.ts
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 4.1, 5.1_

- [ ] 1.1 Fix browser-evaluate.ts
  - Update AgentContext import from '@jarvis-agent/core/core/context'
  - Fix execute function signature to match Tool interface (args: Record<string, unknown>, agentContext, toolCall)
  - Cast args to BrowserEvaluateArgs within function
  - Remove or use warningMessage variable
  - _Requirements: 1.1, 1.3, 3.1, 3.2, 5.1, 5.2_

- [ ] 1.2 Fix browser-select.ts
  - Update AgentContext import from '@jarvis-agent/core/core/context'
  - Fix execute function signature to match Tool interface
  - Cast args to BrowserSelectArgs within function
  - Add explicit types for DOM element parameters in inline scripts
  - _Requirements: 1.1, 1.3, 3.1, 3.2, 4.1, 4.2_

- [ ] 1.3 Fix browser-hover.ts
  - Update AgentContext import from '@jarvis-agent/core/core/context'
  - Add explicit types for Element, HTMLElement, MouseEvent in inline scripts
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 4.1, 4.2_

- [ ] 1.4 Fix browser-get-clickable-elements.ts
  - Update AgentContext import from '@jarvis-agent/core/core/context'
  - Add explicit types for callback parameters (el, index, c, attr)
  - Add HTMLElement and HTMLInputElement type annotations
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 4.1, 4.2_

- [ ] 1.5 Fix browser-web-search.ts
  - Update AgentContext import from '@jarvis-agent/core/core/context'
  - Fix execute function signature to match Tool interface
  - Cast args to BrowserWebSearchArgs within function
  - Add explicit types for callback parameters (result, index)
  - _Requirements: 1.1, 1.3, 3.1, 3.2, 4.1, 4.2_

- [ ] 2. Fix Advanced Browser Tools - Element Extraction
  - Fix AgentContext imports and type annotations in element extraction tools
  - Update all 6 element extraction files with proper types
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 4.1, 4.2, 5.1, 5.2_

- [ ] 2.1 Fix extract-element-styles.ts
  - Update AgentContext import from '@jarvis-agent/core/core/context'
  - Add explicit Element type annotations for function parameters
  - Add CSSStyleRule and CSSRule type annotations
  - Handle 'sheet' type assertions for unknown types
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 4.1, 4.2_

- [ ] 2.2 Fix extract-element-structure.ts
  - Update AgentContext import from '@jarvis-agent/core/core/context'
  - Add explicit Element type annotations for function parameters
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 4.1, 4.2_

- [ ] 2.3 Fix extract-element-events.ts
  - Update AgentContext import from '@jarvis-agent/core/core/context'
  - Add explicit Element type annotations for function parameters
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 4.1, 4.2_

- [ ] 2.4 Fix extract-element-animations.ts
  - Update AgentContext import from '@jarvis-agent/core/core/context'
  - Add CSSRule, CSSKeyframesRule, CSSKeyframeRule type annotations
  - Handle 'sheet' type assertions for unknown types
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 4.1, 4.2_

- [ ] 2.5 Fix extract-element-assets.ts
  - Update AgentContext import from '@jarvis-agent/core/core/context'
  - Add explicit types for callback parameters (img, match, child, f, family)
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 4.1, 4.2_

- [ ] 2.6 Fix clone-element-complete.ts
  - Update AgentContext import from '@jarvis-agent/core/core/context'
  - Add explicit types for callback parameters (img, link)
  - Remove or prefix unused variables (options, computed)
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 4.1, 4.2, 5.1, 5.2_

- [ ] 3. Fix Advanced Browser Tools - CDP Extraction
  - Fix AgentContext imports and type annotations in CDP extraction tools
  - Update both CDP extraction files
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 5.1, 5.2_

- [ ] 3.1 Fix extract-element-styles-cdp.ts
  - Update AgentContext import from '@jarvis-agent/core/core/context'
  - Ensure DOM types are properly handled in browser execution context
  - _Requirements: 1.1, 1.3, 2.1, 2.2_

- [ ] 3.2 Fix extract-complete-element-cdp.ts
  - Update AgentContext import from '@jarvis-agent/core/core/context'
  - Remove or prefix unused includeChildren variable
  - Ensure DOM types are properly handled in browser execution context
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 5.1, 5.2_

- [ ] 4. Fix Advanced Browser Tools - File Operations and JavaScript Functions
  - Fix AgentContext imports in remaining advanced browser tools
  - Update file operations and JavaScript function discovery tools
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [ ] 4.1 Fix clone-element-to-file.ts
  - Update AgentContext import from '@jarvis-agent/core/core/context'
  - Ensure DOM types are properly handled in browser execution context
  - _Requirements: 1.1, 1.3, 2.1, 2.2_

- [ ] 5. Fix Shared Utilities Type Imports
  - Fix type-only import syntax in shared utilities
  - Update file-utils.ts with proper import type syntax
  - _Requirements: 6.1, 6.2_

- [ ] 5.1 Fix file-utils.ts type imports
  - Change FileOperationResult import to use 'import type' syntax
  - Remove unused SecurityValidator import
  - _Requirements: 5.1, 5.2, 6.1, 6.2_

- [ ] 6. Verify TypeScript Compilation
  - Run type-check to verify all errors are resolved
  - Confirm zero TypeScript errors
  - _Requirements: 1.3, 2.2, 3.3, 4.3, 5.2, 6.2_

- [ ] 6.1 Run TypeScript type checking
  - Execute `pnpm run type-check` command
  - Verify output shows 0 errors
  - Document any remaining warnings
  - _Requirements: 1.3, 2.2, 3.3, 4.3, 5.2, 6.2_

- [ ] 6.2 Run build to verify compilation
  - Execute `pnpm run build:deps` command
  - Verify successful compilation of all TypeScript files
  - Confirm JavaScript output is generated correctly
  - _Requirements: 1.3, 2.2, 3.3, 4.3, 5.2, 6.2_
