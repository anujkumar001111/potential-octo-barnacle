# Requirements Document: Advanced Browser Tools (Phase 1)

## Introduction

This feature extends the existing BrowserAgent with 25 advanced tools that enable deep element analysis, JavaScript function management, and Chrome DevTools Protocol (CDP) access. These tools unlock entirely new capabilities for UI cloning, competitor analysis, advanced automation, and low-level browser control.

The implementation focuses on three high-value categories:
1. **Element Cloning & Deep Analysis** (12 tools) - Extract complete element information
2. **JavaScript Function Management** (10 tools) - Discover and execute page functions
3. **Chrome DevTools Protocol** (3 tools) - Direct CDP command access

## Glossary

- **BrowserAgent**: The Eko-based browser automation agent in the Electron main process
- **Element Cloning**: Extracting complete element information (HTML, CSS, events, animations, assets) for recreation or analysis
- **CDP**: Chrome DevTools Protocol - Low-level browser control protocol
- **Progressive Extraction**: Incremental data extraction to avoid overwhelming responses
- **Function Discovery**: Automatically finding available JavaScript functions in page context
- **Computed Styles**: Final CSS styles applied to an element after cascade resolution
- **Pseudo-elements**: CSS pseudo-elements like ::before and ::after
- **Event Listeners**: JavaScript functions attached to DOM events
- **Eko Tool**: A tool definition following the @jarvis-agent/core Tool interface
- **WebContentsView**: Electron's browser view component used for rendering web pages

## Requirements

### Requirement 1: Element Style Extraction

**User Story:** As a developer, I want to extract complete CSS styling information from any element, so that I can recreate the element's appearance exactly.

#### Acceptance Criteria

1.1 WHEN I call extract_element_styles with a selector, THE BrowserAgent SHALL return computed styles for the element

1.2 WHEN I request CSS rules, THE BrowserAgent SHALL return all matching CSS rules from stylesheets

1.3 WHEN I request pseudo-element styles, THE BrowserAgent SHALL return styles for ::before, ::after, and other pseudo-elements

1.4 WHEN I request style inheritance, THE BrowserAgent SHALL return the inheritance chain showing which styles come from which ancestors

1.5 WHERE CDP-based extraction is requested, THE BrowserAgent SHALL extract styles using CDP commands without JavaScript evaluation

### Requirement 2: Element Structure Extraction

**User Story:** As a developer, I want to extract complete HTML structure and DOM information from any element, so that I can understand and recreate the element's markup.

#### Acceptance Criteria

2.1 WHEN I call extract_element_structure with a selector, THE BrowserAgent SHALL return the element's HTML structure with all attributes

2.2 WHEN I request children extraction, THE BrowserAgent SHALL return child elements up to the specified max_depth

2.3 WHEN I request data attributes, THE BrowserAgent SHALL return all data-* attributes separately

2.4 WHEN I request position information, THE BrowserAgent SHALL return bounding box coordinates and viewport position

2.5 WHILE extracting structure, THE BrowserAgent SHALL include element tag name, classes, id, and custom attributes

### Requirement 3: Element Event Extraction

**User Story:** As a developer, I want to extract all event listeners attached to an element, so that I can understand the element's interactive behavior.

#### Acceptance Criteria

3.1 WHEN I call extract_element_events with a selector, THE BrowserAgent SHALL return all inline event handlers (onclick, onchange, etc.)

3.2 WHEN I request addEventListener listeners, THE BrowserAgent SHALL return all programmatically attached event listeners

3.3 WHEN I request framework detection, THE BrowserAgent SHALL detect and return React, Vue, Angular, or other framework-specific event handlers

3.4 WHEN I request handler analysis, THE BrowserAgent SHALL return the source code of event handler functions

3.5 WHERE multiple event types exist, THE BrowserAgent SHALL categorize events by type (click, input, submit, etc.)

### Requirement 4: Element Animation Extraction

**User Story:** As a developer, I want to extract CSS animations, transitions, and transforms from any element, so that I can recreate the element's motion and effects.

#### Acceptance Criteria

4.1 WHEN I call extract_element_animations with a selector, THE BrowserAgent SHALL return all CSS animation properties

4.2 WHEN I request keyframe analysis, THE BrowserAgent SHALL return @keyframes rule definitions

4.3 WHEN I request transitions, THE BrowserAgent SHALL return all CSS transition properties

4.4 WHEN I request transforms, THE BrowserAgent SHALL return all CSS transform properties (translate, rotate, scale, etc.)

4.5 WHILE extracting animations, THE BrowserAgent SHALL include timing functions, durations, and delays

### Requirement 5: Element Asset Extraction

**User Story:** As a developer, I want to extract all assets (images, fonts, backgrounds) related to an element, so that I can gather all resources needed to recreate the element.

#### Acceptance Criteria

5.1 WHEN I call extract_element_assets with a selector, THE BrowserAgent SHALL return all img src URLs within the element

5.2 WHEN I request background images, THE BrowserAgent SHALL return all CSS background-image URLs

5.3 WHEN I request font information, THE BrowserAgent SHALL return font-family, font-weight, and font URLs

5.4 WHEN I request external asset fetching, THE BrowserAgent SHALL download and analyze external assets

5.5 WHERE assets are data URLs, THE BrowserAgent SHALL include the complete data URL in the response

### Requirement 6: Related Files Discovery

**User Story:** As a developer, I want to discover all CSS and JavaScript files related to the current page, so that I can understand the page's dependencies.

#### Acceptance Criteria

6.1 WHEN I call extract_related_files, THE BrowserAgent SHALL return all linked CSS files with their URLs

6.2 WHEN I request JavaScript analysis, THE BrowserAgent SHALL return all script tags with their sources

6.3 WHEN I request import following, THE BrowserAgent SHALL follow @import statements in CSS up to max_depth

6.4 WHEN I request module analysis, THE BrowserAgent SHALL detect ES6 module imports

6.5 WHILE analyzing files, THE BrowserAgent SHALL detect framework usage (React, Vue, Angular, etc.)

### Requirement 7: Complete Element Cloning

**User Story:** As a developer, I want to extract ALL element data in one call, so that I can get complete element fidelity without multiple requests.

#### Acceptance Criteria

7.1 WHEN I call clone_element_complete with a selector, THE BrowserAgent SHALL extract styles, structure, events, animations, and assets

7.2 WHEN I provide extraction options, THE BrowserAgent SHALL respect the options for each extraction category

7.3 WHERE the response is too large, THE BrowserAgent SHALL automatically save to file and return the file path

7.4 WHEN extraction completes, THE BrowserAgent SHALL return metadata including selector, URL, and timestamp

7.5 IF any extraction fails, THE BrowserAgent SHALL include partial results and error information

### Requirement 8: CDP-Based Extraction

**User Story:** As a developer, I want to extract element data using CDP commands, so that I can avoid JavaScript evaluation issues and get more reliable results.

#### Acceptance Criteria

8.1 WHEN I call extract_element_styles_cdp, THE BrowserAgent SHALL use CDP DOM.getComputedStyleForNode instead of JavaScript

8.2 WHEN I call extract_complete_element_cdp, THE BrowserAgent SHALL use CDP commands for all extraction operations

8.3 WHERE CDP extraction is used, THE BrowserAgent SHALL not execute any JavaScript in the page context

8.4 WHEN CDP commands fail, THE BrowserAgent SHALL return detailed error information

8.5 WHILE using CDP, THE BrowserAgent SHALL maintain the same response format as JavaScript-based extraction

### Requirement 9: File-Based Element Cloning

**User Story:** As a developer, I want to save large element extractions to files, so that I don't overwhelm the response with massive JSON objects.

#### Acceptance Criteria

9.1 WHEN I call clone_element_to_file, THE BrowserAgent SHALL save the complete clone to a JSON file

9.2 WHEN I call extract_complete_element_to_file, THE BrowserAgent SHALL save the extraction to a file and return the file path

9.3 WHERE file saving is used, THE BrowserAgent SHALL return file metadata (path, size, timestamp)

9.4 WHEN multiple files are created, THE BrowserAgent SHALL use unique filenames with timestamps

9.5 WHILE saving files, THE BrowserAgent SHALL create the output directory if it doesn't exist

### Requirement 10: JavaScript Function Discovery

**User Story:** As a developer, I want to discover available JavaScript functions in the page context, so that I can call existing page APIs without knowing them in advance.

#### Acceptance Criteria

10.1 WHEN I call discover_global_functions, THE BrowserAgent SHALL return all global functions available in window

10.2 WHEN I call discover_object_methods with an object path, THE BrowserAgent SHALL return all methods on that object

10.3 WHERE functions are discovered, THE BrowserAgent SHALL include function names and parameter counts

10.4 WHEN framework functions are present, THE BrowserAgent SHALL detect and categorize framework-specific functions

10.5 WHILE discovering functions, THE BrowserAgent SHALL exclude built-in browser functions unless requested

### Requirement 11: JavaScript Function Execution

**User Story:** As a developer, I want to call existing JavaScript functions in the page context, so that I can use page APIs for automation.

#### Acceptance Criteria

11.1 WHEN I call call_javascript_function with a function path, THE BrowserAgent SHALL execute the function and return the result

11.2 WHEN I provide arguments, THE BrowserAgent SHALL pass them to the function correctly

11.3 WHERE the function returns a Promise, THE BrowserAgent SHALL await the result

11.4 WHEN the function throws an error, THE BrowserAgent SHALL return the error message and stack trace

11.5 IF the function modifies the DOM, THE BrowserAgent SHALL wait for DOM updates before returning

### Requirement 12: Function Signature Inspection

**User Story:** As a developer, I want to inspect JavaScript function signatures, so that I know what parameters to pass when calling them.

#### Acceptance Criteria

12.1 WHEN I call inspect_function_signature with a function path, THE BrowserAgent SHALL return the function's parameter names

12.2 WHEN the function has default parameters, THE BrowserAgent SHALL return the default values

12.3 WHERE the function is async, THE BrowserAgent SHALL indicate that in the signature

12.4 WHEN the function has JSDoc comments, THE BrowserAgent SHALL return the documentation

12.5 WHILE inspecting signatures, THE BrowserAgent SHALL return the function's source code if available

### Requirement 13: Persistent Function Creation

**User Story:** As a developer, I want to create persistent functions in the page context, so that I can reuse custom utilities across multiple operations.

#### Acceptance Criteria

13.1 WHEN I call create_persistent_function with function code, THE BrowserAgent SHALL inject the function into the page context

13.2 WHEN I provide a function name, THE BrowserAgent SHALL make the function available globally

13.3 WHERE the function already exists, THE BrowserAgent SHALL overwrite it with a warning

13.4 WHEN the function is created, THE BrowserAgent SHALL verify it's callable

13.5 IF the function code is invalid, THE BrowserAgent SHALL return a syntax error

### Requirement 14: Script Injection and Execution

**User Story:** As a developer, I want to inject and execute JavaScript code in the page context, so that I can run custom logic without creating persistent functions.

#### Acceptance Criteria

14.1 WHEN I call inject_and_execute_script with script code, THE BrowserAgent SHALL execute the script and return the result

14.2 WHEN I provide a context ID, THE BrowserAgent SHALL execute in that specific context

14.3 WHERE the script modifies global state, THE BrowserAgent SHALL ensure changes persist

14.4 WHEN the script returns a value, THE BrowserAgent SHALL serialize it correctly

14.5 IF the script execution times out, THE BrowserAgent SHALL terminate it and return an error

### Requirement 15: Function Sequence Execution

**User Story:** As a developer, I want to execute multiple JavaScript functions in sequence, so that I can perform complex multi-step operations atomically.

#### Acceptance Criteria

15.1 WHEN I call execute_function_sequence with a list of function calls, THE BrowserAgent SHALL execute them in order

15.2 WHEN a function in the sequence fails, THE BrowserAgent SHALL stop execution and return the error

15.3 WHERE functions depend on previous results, THE BrowserAgent SHALL pass results between functions

15.4 WHEN all functions succeed, THE BrowserAgent SHALL return all results in order

15.5 WHILE executing sequences, THE BrowserAgent SHALL maintain transaction-like behavior (all or nothing)

### Requirement 16: Execution Context Management

**User Story:** As a developer, I want to get available execution contexts, so that I can execute code in specific frames or workers.

#### Acceptance Criteria

16.1 WHEN I call get_execution_contexts, THE BrowserAgent SHALL return all available contexts (main, iframes, workers)

16.2 WHEN contexts are returned, THE BrowserAgent SHALL include context IDs and types

16.3 WHERE iframes exist, THE BrowserAgent SHALL return iframe URLs and names

16.4 WHEN workers are present, THE BrowserAgent SHALL return worker types (dedicated, shared, service)

16.5 WHILE listing contexts, THE BrowserAgent SHALL indicate which context is currently active

### Requirement 17: CDP Command Execution

**User Story:** As a developer, I want to execute any Chrome DevTools Protocol command, so that I have complete low-level browser control.

#### Acceptance Criteria

17.1 WHEN I call execute_cdp_command with a command name and parameters, THE BrowserAgent SHALL execute the CDP command

17.2 WHEN the command succeeds, THE BrowserAgent SHALL return the CDP response

17.3 WHERE the command requires specific parameters, THE BrowserAgent SHALL validate them before execution

17.4 WHEN the command fails, THE BrowserAgent SHALL return the CDP error message

17.5 IF the command is not supported, THE BrowserAgent SHALL return a clear error message

### Requirement 18: CDP Command Discovery

**User Story:** As a developer, I want to list available CDP commands, so that I know what low-level operations are possible.

#### Acceptance Criteria

18.1 WHEN I call list_cdp_commands, THE BrowserAgent SHALL return all available CDP domains (Page, DOM, Network, etc.)

18.2 WHEN domains are returned, THE BrowserAgent SHALL include command names within each domain

18.3 WHERE commands have parameters, THE BrowserAgent SHALL include parameter names and types

18.4 WHEN commands have return values, THE BrowserAgent SHALL include return type information

18.5 WHILE listing commands, THE BrowserAgent SHALL categorize commands by domain

### Requirement 19: Function Executor Information

**User Story:** As a developer, I want to get information about the function executor system, so that I can understand its capabilities and limitations.

#### Acceptance Criteria

19.1 WHEN I call get_function_executor_info, THE BrowserAgent SHALL return executor system status

19.2 WHEN an instance ID is provided, THE BrowserAgent SHALL return instance-specific executor information

19.3 WHERE execution contexts exist, THE BrowserAgent SHALL return context information

19.4 WHEN persistent functions exist, THE BrowserAgent SHALL list them

19.5 WHILE returning info, THE BrowserAgent SHALL include executor version and capabilities

### Requirement 20: Error Handling and Security

**User Story:** As a developer, I want comprehensive error handling and security validation, so that tool failures are clear and malicious code is prevented.

#### Acceptance Criteria

20.1 WHEN any tool encounters an error, THE BrowserAgent SHALL return a structured error with code and message

20.2 WHEN JavaScript code is provided, THE BrowserAgent SHALL validate for dangerous patterns (eval, Function constructor, etc.)

20.3 WHERE execution times out, THE BrowserAgent SHALL terminate the operation and return a timeout error

20.4 WHEN selectors are invalid, THE BrowserAgent SHALL return a clear validation error

20.5 IF the browser instance is not found, THE BrowserAgent SHALL return an instance-not-found error

### Requirement 21: Performance and Optimization

**User Story:** As a developer, I want tools to execute efficiently, so that automation doesn't slow down significantly.

#### Acceptance Criteria

21.1 WHEN extracting large elements, THE BrowserAgent SHALL complete within 30 seconds or return a timeout error

21.2 WHEN multiple extractions are requested, THE BrowserAgent SHALL batch operations where possible

21.3 WHERE CDP is available, THE BrowserAgent SHALL prefer CDP over JavaScript evaluation for better performance

21.4 WHEN file-based extraction is used, THE BrowserAgent SHALL stream data to files instead of loading into memory

21.5 WHILE executing functions, THE BrowserAgent SHALL cache function signatures to avoid repeated introspection

### Requirement 22: Response Format Consistency

**User Story:** As a developer, I want consistent response formats across all tools, so that I can process results uniformly.

#### Acceptance Criteria

22.1 WHEN any tool succeeds, THE BrowserAgent SHALL return a success indicator and result data

22.2 WHEN any tool fails, THE BrowserAgent SHALL return an error indicator, error code, and error message

22.3 WHERE metadata is relevant, THE BrowserAgent SHALL include timestamp, selector, and URL

22.4 WHEN file paths are returned, THE BrowserAgent SHALL use absolute paths

22.5 WHILE returning data, THE BrowserAgent SHALL use consistent property names across tools

### Requirement 23: Integration with Existing Tools

**User Story:** As a developer, I want new tools to integrate seamlessly with existing BrowserAgent tools, so that I can combine them in workflows.

#### Acceptance Criteria

23.1 WHEN using new tools, THE BrowserAgent SHALL use the same browser instance as existing tools

23.2 WHEN errors occur, THE BrowserAgent SHALL use the same error handling as existing tools

23.3 WHERE selectors are used, THE BrowserAgent SHALL support the same selector formats as existing tools

23.4 WHEN returning results, THE BrowserAgent SHALL use the same Eko Tool response format

23.5 WHILE executing, THE BrowserAgent SHALL respect the same timeout settings as existing tools

### Requirement 24: Documentation and Examples

**User Story:** As a developer, I want comprehensive documentation and examples, so that I can learn how to use the new tools effectively.

#### Acceptance Criteria

24.1 WHEN tools are implemented, THE BrowserAgent SHALL include JSDoc comments with parameter descriptions

24.2 WHEN documentation is generated, THE BrowserAgent SHALL include usage examples for each tool

24.3 WHERE tools have complex options, THE BrowserAgent SHALL provide example option objects

24.4 WHEN errors can occur, THE BrowserAgent SHALL document common error scenarios

24.5 WHILE documenting, THE BrowserAgent SHALL include use case descriptions for each tool

### Requirement 25: Testing and Validation

**User Story:** As a developer, I want comprehensive tests for all new tools, so that I can trust they work correctly.

#### Acceptance Criteria

25.1 WHEN tools are implemented, THE BrowserAgent SHALL include unit tests for each tool

25.2 WHEN integration tests are run, THE BrowserAgent SHALL test tools against real web pages

25.3 WHERE edge cases exist, THE BrowserAgent SHALL include tests for error scenarios

25.4 WHEN performance is critical, THE BrowserAgent SHALL include performance benchmarks

25.5 WHILE testing, THE BrowserAgent SHALL achieve at least 80% code coverage for new tools
