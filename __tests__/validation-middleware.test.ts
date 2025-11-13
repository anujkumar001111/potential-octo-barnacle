/**
 * Test Suite: Validation Middleware
 * Tests IPC validation and rate limiting functionality
 *
 * WORKTREE CONSOLIDATION REQUIREMENTS - COMPREHENSIVE TESTING
 * ===================================================================
 *
 * UNIT TESTING REQUIREMENTS:
 * TR-VAL-UNIT-001: Test validateIpc() function with Zod schema validation
 * TR-VAL-UNIT-002: Test validateIpcArgs() function with multiple argument schemas
 * TR-VAL-UNIT-003: Test rateLimit() middleware with configurable limits and windows
 * TR-VAL-UNIT-004: Test detectFragmentation() function for attack pattern detection
 * TR-VAL-UNIT-005: Test error handling and logging for validation failures
 * TR-VAL-UNIT-006: Test middleware chaining (validation + rate limiting)
 * TR-VAL-UNIT-007: Test edge cases (null/undefined inputs, malformed data)
 *
 * INTEGRATION TESTING REQUIREMENTS:
 * TR-VAL-INT-001: Test IPC validation in EkoService handlers (ekoRun, ekoModify, ekoExecute)
 *   - Validate task message schemas against injection attacks
 *   - Test taskId validation and format requirements
 *   - Verify error responses don't leak sensitive information
 *   - Test streaming message validation for tool execution
 *
 * TR-VAL-INT-002: Test IPC validation in ConfigManager handlers (getLLMsConfig, saveUserModelConfigs)
 *   - Validate API key format and length requirements
 *   - Test encrypted data handling in configuration updates
 *   - Verify sensitive data masking in error responses
 *   - Test configuration hierarchy validation
 *
 * TR-VAL-INT-003: Test IPC validation in TaskScheduler handlers (scheduleTask, executeTaskNow)
 *   - Validate task configuration schemas (name, steps, schedule)
 *   - Test cron expression validation for scheduled tasks
 *   - Verify task queue management under rate limiting
 *   - Test execution state validation during task lifecycle
 *
 * PERFORMANCE TESTING REQUIREMENTS:
 * TR-VAL-PERF-001: Benchmark validation overhead for complex schemas
 * TR-VAL-PERF-002: Rate limiting performance under high-frequency IPC calls
 * TR-VAL-PERF-003: Memory usage monitoring for LRU cache in rate limiting
 * TR-VAL-PERF-004: Fragmentation detection performance for large payloads
 * TR-VAL-PERF-005: Error handling performance impact measurement
 *
 * SECURITY TESTING REQUIREMENTS:
 * TR-VAL-SEC-001: Test injection attack prevention in task descriptions
 * TR-VAL-SEC-002: Test prompt injection protection for AI agent inputs
 * TR-VAL-SEC-003: Test DoS attack mitigation via rate limiting
 * TR-VAL-SEC-004: Test information leakage prevention in error messages
 * TR-VAL-SEC-005: Test fragmentation attack detection and blocking
 * TR-VAL-SEC-006: Test sender ID validation and tracking
 *
 * RELIABILITY TESTING REQUIREMENTS:
 * TR-VAL-REL-001: Test validation behavior under malformed IPC messages
 * TR-VAL-REL-002: Test rate limiting recovery after window expiration
 * TR-VAL-REL-003: Test middleware stability during concurrent IPC calls
 * TR-VAL-REL-004: Test error propagation and handling in middleware chain
 *
 * END-TO-END TESTING REQUIREMENTS:
 * TR-VAL-E2E-001: Test complete IPC request flow with validation and rate limiting
 * TR-VAL-E2E-002: Test UI-to-Electron IPC communication with security controls
 * TR-VAL-E2E-003: Test task execution pipeline with input validation
 * TR-VAL-E2E-004: Test configuration management with encrypted data handling
 *
 * MIGRATION TESTING REQUIREMENTS:
 * TR-VAL-MIG-001: Test validation middleware integration with existing IPC handlers
 * TR-VAL-MIG-002: Test rate limiting addition to high-traffic IPC endpoints
 * TR-VAL-MIG-003: Test schema validation for existing data formats
 * TR-VAL-MIG-004: Test backward compatibility with unvalidated IPC calls
 *
 * COVERAGE REQUIREMENTS:
 * CR-VAL-001: Achieve 95%+ code coverage for validation middleware
 * CR-VAL-002: Test all Zod schema validations and error conditions
 * CR-VAL-003: Test all rate limiting scenarios and edge cases
 * CR-VAL-004: Test integration with all IPC handler types
 *
 * TEST AUTOMATION REQUIREMENTS:
 * TAR-VAL-001: Automated security testing in CI/CD pipeline
 * TAR-VAL-002: Performance benchmarking for validation overhead
 * TAR-VAL-003: Fuzz testing for input validation robustness
 * TAR-VAL-004: Integration tests for IPC communication security
 */

import { rateLimit } from '../electron/main/ipc/validation-middleware';
import { LRUCache, createRateLimitCache } from '../electron/main/utils/lru-cache';

// Mock electron-log
jest.mock('electron-log', () => ({
  warn: jest.fn(),
  error: jest.fn(),
}));

// Mock LRU cache for testing
jest.mock('../electron/main/utils/lru-cache', () => ({
  LRUCache: jest.fn(),
  createRateLimitCache: jest.fn(),
}));

describe('Validation Middleware - Rate Limiting', () => {
  let mockEvent: any;
  let mockHandler: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock IPC event
    mockEvent = {
      sender: {
        id: 123
      }
    };

    mockHandler = jest.fn().mockResolvedValue('success');

    // Set up LRU cache mock before each test
    const mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      size: jest.fn().mockReturnValue(1),
      getStats: jest.fn().mockReturnValue({
        size: 1,
        maxSize: 1000,
        hitCount: 0,
        missCount: 0,
        evictionCount: 0,
        hitRate: 0
      })
    };
    (createRateLimitCache as jest.MockedFunction<typeof createRateLimitCache>).mockReturnValue(mockCache as any);
  });

  test('should allow requests within rate limit', async () => {
    const middleware = rateLimit(3, 1000); // 3 calls per second
    const wrappedHandler = middleware(mockHandler);

    const mockCache = (createRateLimitCache as jest.MockedFunction<typeof createRateLimitCache>).mock.results[0].value;

    // First call - should create new entry
    mockCache.get.mockReturnValueOnce(undefined);
    await wrappedHandler(mockEvent, 'arg1');
    expect(mockCache.set).toHaveBeenCalledWith('123', { count: 1, resetAt: expect.any(Number) });

    // Second call within window - should increment
    const now = Date.now();
    mockCache.get.mockReturnValueOnce({ count: 1, resetAt: now + 1000 });
    await wrappedHandler(mockEvent, 'arg2');
    expect(mockCache.set).toHaveBeenCalledWith('123', { count: 2, resetAt: expect.any(Number) });

    // Third call within window - should increment
    mockCache.get.mockReturnValueOnce({ count: 2, resetAt: now + 1000 });
    await wrappedHandler(mockEvent, 'arg3');
    expect(mockCache.set).toHaveBeenCalledWith('123', { count: 3, resetAt: expect.any(Number) });

    expect(mockHandler).toHaveBeenCalledTimes(3);
  });

  test('should block requests exceeding rate limit', async () => {
    const middleware = rateLimit(2, 1000); // 2 calls per second
    const wrappedHandler = middleware(mockHandler);

    const mockCache = (createRateLimitCache as jest.MockedFunction<typeof createRateLimitCache>).mock.results[0].value;

    const now = Date.now();

    // First call
    mockCache.get.mockReturnValueOnce(undefined);
    await wrappedHandler(mockEvent, 'arg1');

    // Second call (allowed)
    mockCache.get.mockReturnValueOnce({ count: 1, resetAt: now + 1000 });
    await wrappedHandler(mockEvent, 'arg2');

    // Third call (should be blocked)
    mockCache.get.mockReturnValueOnce({ count: 2, resetAt: now + 1000 });
    await expect(wrappedHandler(mockEvent, 'arg3')).rejects.toThrow('Rate limit exceeded');

    expect(mockHandler).toHaveBeenCalledTimes(2);
  });

  test('should reset counter after window expires', async () => {
    const middleware = rateLimit(2, 1000); // 2 calls per second
    const wrappedHandler = middleware(mockHandler);

    const mockCache = (createRateLimitCache as jest.MockedFunction<typeof createRateLimitCache>).mock.results[0].value;

    const now = Date.now();

    // First call
    mockCache.get.mockReturnValueOnce(undefined);
    await wrappedHandler(mockEvent, 'arg1');

    // Second call (allowed)
    mockCache.get.mockReturnValueOnce({ count: 1, resetAt: now + 1000 });
    await wrappedHandler(mockEvent, 'arg2');

    // Call after window expired (should reset)
    const futureTime = now + 1001;
    jest.spyOn(Date, 'now').mockReturnValue(futureTime);
    mockCache.get.mockReturnValueOnce({ count: 2, resetAt: now + 1000 });
    await wrappedHandler(mockEvent, 'arg3');

    expect(mockCache.set).toHaveBeenLastCalledWith('123', { count: 1, resetAt: futureTime + 1000 });

    jest.restoreAllMocks();
  });

  test('should handle different sender IDs separately', async () => {
    const middleware = rateLimit(2, 1000);
    const wrappedHandler = middleware(mockHandler);

    const mockCache = (createRateLimitCache as jest.MockedFunction<typeof createRateLimitCache>).mock.results[0].value;

    const event1 = { sender: { id: 111 } };
    const event2 = { sender: { id: 222 } };

    // Both senders should be allowed their own limits
    mockCache.get.mockReturnValue(undefined);
    await wrappedHandler(event1, 'arg1');
    await wrappedHandler(event2, 'arg2');

    expect(mockCache.set).toHaveBeenCalledTimes(2);
  });

  test('should use LRU cache with correct max size', () => {
    rateLimit(10, 1000); // This should create LRU cache with size 1000

    expect(createRateLimitCache).toHaveBeenCalledWith({
      maxSize: 1000,
      cleanupIntervalMs: 60000,
      maxAgeMs: 2000
    });
  });

  test('should call original handler with correct arguments', async () => {
    const middleware = rateLimit(5, 1000);
    const wrappedHandler = middleware(mockHandler);

    const mockCache = (createRateLimitCache as jest.MockedFunction<typeof createRateLimitCache>).mock.results[0].value;
    mockCache.get.mockReturnValue(undefined);

    const args = ['arg1', 'arg2', { key: 'value' }];
    await wrappedHandler(mockEvent, ...args);

    expect(mockHandler).toHaveBeenCalledWith(mockEvent, ...args);
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  test('should handle handler errors gracefully', async () => {
    const middleware = rateLimit(5, 1000);
    const wrappedHandler = middleware(mockHandler);

    const mockCache = (createRateLimitCache as jest.MockedFunction<typeof createRateLimitCache>).mock.results[0].value;
    mockCache.get.mockReturnValue(undefined);

    const error = new Error('Handler failed');
    mockHandler.mockRejectedValueOnce(error);

    await expect(wrappedHandler(mockEvent, 'arg')).rejects.toThrow('Handler failed');
  });
});