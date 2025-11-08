/**
 * Error codes and error handling for Advanced Browser Tools
 */

export enum AdvancedToolErrorCode {
  // Element-related errors
  ELEMENT_NOT_FOUND = 'ELEMENT_NOT_FOUND',
  INVALID_SELECTOR = 'INVALID_SELECTOR',
  ELEMENT_NOT_VISIBLE = 'ELEMENT_NOT_VISIBLE',
  
  // Execution errors
  EXECUTION_TIMEOUT = 'EXECUTION_TIMEOUT',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  
  // Function-related errors
  FUNCTION_NOT_FOUND = 'FUNCTION_NOT_FOUND',
  INVALID_FUNCTION_PATH = 'INVALID_FUNCTION_PATH',
  FUNCTION_EXECUTION_ERROR = 'FUNCTION_EXECUTION_ERROR',
  
  // CDP errors
  CDP_COMMAND_FAILED = 'CDP_COMMAND_FAILED',
  CDP_NOT_AVAILABLE = 'CDP_NOT_AVAILABLE',
  CDP_INVALID_COMMAND = 'CDP_INVALID_COMMAND',
  
  // File operation errors
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  DIRECTORY_CREATE_ERROR = 'DIRECTORY_CREATE_ERROR',
  
  // Security errors
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  DANGEROUS_PATTERN_DETECTED = 'DANGEROUS_PATTERN_DETECTED',
  
  // Parameter errors
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  MISSING_REQUIRED_PARAMETER = 'MISSING_REQUIRED_PARAMETER',
  
  // Browser errors
  BROWSER_NOT_READY = 'BROWSER_NOT_READY',
  WEBCONTENTS_NOT_AVAILABLE = 'WEBCONTENTS_NOT_AVAILABLE',
  
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export class AdvancedToolError extends Error {
  constructor(
    public code: AdvancedToolErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AdvancedToolError';
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AdvancedToolError);
    }
  }
}

/**
 * Error messages for each error code
 */
export const ERROR_MESSAGES: Record<AdvancedToolErrorCode, string> = {
  [AdvancedToolErrorCode.ELEMENT_NOT_FOUND]: 'Element not found with the provided selector',
  [AdvancedToolErrorCode.INVALID_SELECTOR]: 'Invalid CSS selector provided',
  [AdvancedToolErrorCode.ELEMENT_NOT_VISIBLE]: 'Element is not visible',
  [AdvancedToolErrorCode.EXECUTION_TIMEOUT]: 'Operation timed out',
  [AdvancedToolErrorCode.EXECUTION_FAILED]: 'Operation execution failed',
  [AdvancedToolErrorCode.FUNCTION_NOT_FOUND]: 'JavaScript function not found',
  [AdvancedToolErrorCode.INVALID_FUNCTION_PATH]: 'Invalid function path provided',
  [AdvancedToolErrorCode.FUNCTION_EXECUTION_ERROR]: 'Function execution failed',
  [AdvancedToolErrorCode.CDP_COMMAND_FAILED]: 'CDP command execution failed',
  [AdvancedToolErrorCode.CDP_NOT_AVAILABLE]: 'Chrome DevTools Protocol not available',
  [AdvancedToolErrorCode.CDP_INVALID_COMMAND]: 'Invalid CDP command',
  [AdvancedToolErrorCode.FILE_WRITE_ERROR]: 'Failed to write file',
  [AdvancedToolErrorCode.FILE_READ_ERROR]: 'Failed to read file',
  [AdvancedToolErrorCode.DIRECTORY_CREATE_ERROR]: 'Failed to create directory',
  [AdvancedToolErrorCode.SECURITY_VIOLATION]: 'Security violation detected',
  [AdvancedToolErrorCode.DANGEROUS_PATTERN_DETECTED]: 'Dangerous code pattern detected',
  [AdvancedToolErrorCode.INVALID_PARAMETERS]: 'Invalid parameters provided',
  [AdvancedToolErrorCode.MISSING_REQUIRED_PARAMETER]: 'Missing required parameter',
  [AdvancedToolErrorCode.BROWSER_NOT_READY]: 'Browser is not ready',
  [AdvancedToolErrorCode.WEBCONTENTS_NOT_AVAILABLE]: 'WebContents not available',
  [AdvancedToolErrorCode.UNKNOWN_ERROR]: 'An unknown error occurred',
  [AdvancedToolErrorCode.INTERNAL_ERROR]: 'Internal error occurred'
};

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: AdvancedToolErrorCode,
  customMessage?: string,
  details?: any
): { success: false; error: string; error_code: string; details?: any } {
  return {
    success: false,
    error: customMessage || ERROR_MESSAGES[code],
    error_code: code,
    ...(details && { details })
  };
}

/**
 * Handle any error and convert to standardized response
 */
export function handleToolError(error: any): {
  success: false;
  error: string;
  error_code: string;
  details?: any;
} {
  if (error instanceof AdvancedToolError) {
    return createErrorResponse(error.code, error.message, error.details);
  }
  
  // Handle standard JavaScript errors
  if (error instanceof Error) {
    return createErrorResponse(
      AdvancedToolErrorCode.EXECUTION_FAILED,
      error.message,
      { stack: error.stack }
    );
  }
  
  // Handle unknown errors
  return createErrorResponse(
    AdvancedToolErrorCode.UNKNOWN_ERROR,
    String(error)
  );
}
