/**
 * Test Suite: Responsive Behavior (Task 10.4)
 * Requirements: 4.2, 4.3, 4.4
 */

import { calculateDetailViewBounds, validateBounds } from '@/utils/detail-view-bounds';

describe('Responsive Behavior Tests (Task 10.4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Requirement 4.2: Test window resize with bounds recalculation
  test('should recalculate bounds when window is resized', () => {
    const initialBounds = calculateDetailViewBounds(
      1024, // windowWidth
      75, // browserPanelPercent
      768, // windowHeight
      'split',
      48, // tabBarHeight
      16 // windowMargins
    );

    expect(initialBounds.x).toBe(16);
    expect(initialBounds.y).toBe(64); // 16 + 48
    expect(initialBounds.width).toBe(736); // (1024 * 0.75) - 32
    expect(initialBounds.height).toBe(688); // 768 - 32 - 48

    // Resize window
    const resizedBounds = calculateDetailViewBounds(
      1280, // new windowWidth
      75,
      900, // new windowHeight
      'split',
      48,
      16
    );

    expect(resizedBounds.x).toBe(16);
    expect(resizedBounds.y).toBe(64);
    expect(resizedBounds.width).toBe(928); // (1280 * 0.75) - 32
    expect(resizedBounds.height).toBe(820); // 900 - 32 - 48
  });

  // Requirement 4.3: Test panel resize with bounds recalculation
  test('should recalculate bounds when panel is resized', () => {
    const windowWidth = 1024;
    const windowHeight = 768;

    // Initial panel size (75%)
    const initialBounds = calculateDetailViewBounds(
      windowWidth,
      75,
      windowHeight,
      'split',
      48,
      16
    );

    expect(initialBounds.width).toBe(736); // (1024 * 0.75) - 32

    // Resize panel to 60%
    const resizedBounds = calculateDetailViewBounds(
      windowWidth,
      60,
      windowHeight,
      'split',
      48,
      16
    );

    expect(resizedBounds.width).toBe(582); // (1024 * 0.60) - 32
    expect(resizedBounds.height).toBe(initialBounds.height); // Height unchanged
  });

  // Requirement 4.4: Test minimum panel sizes
  test('should enforce minimum panel size of 40%', () => {
    const bounds = calculateDetailViewBounds(
      1024,
      35, // Below minimum
      768,
      'split',
      48,
      16
    );

    // Should be clamped to 40%
    expect(bounds.width).toBe(377); // (1024 * 0.40) - 32 = floor(409.6) - 32 = 377
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Browser panel percent out of range'),
      35
    );
  });

  // Requirement 4.4: Test maximum panel sizes
  test('should enforce maximum panel size of 85%', () => {
    const bounds = calculateDetailViewBounds(
      1024,
      90, // Above maximum
      768,
      'split',
      48,
      16
    );

    // Should be clamped to 85%
    expect(bounds.width).toBe(838); // (1024 * 0.85) - 32
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Browser panel percent out of range'),
      90
    );
  });

  // Requirement 4.4: Test bounds validation - minimum dimensions
  test('should enforce minimum dimensions of 100px', () => {
    const invalidBounds = {
      x: 0,
      y: 0,
      width: 50, // Below minimum
      height: 50 // Below minimum
    };

    const validated = validateBounds(invalidBounds, 1024, 768);

    expect(validated.width).toBe(100);
    expect(validated.height).toBe(100);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Bounds adjusted'),
      expect.any(Object)
    );
  });

  // Requirement 4.4: Test bounds validation - maximum dimensions
  test('should enforce bounds within window dimensions', () => {
    const invalidBounds = {
      x: 100,
      y: 100,
      width: 1000, // Exceeds window width
      height: 700 // Exceeds window height
    };

    const validated = validateBounds(invalidBounds, 1024, 768);

    expect(validated.width).toBe(924); // 1024 - 100
    expect(validated.height).toBe(668); // 768 - 100
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Bounds adjusted'),
      expect.any(Object)
    );
  });

  // Test bounds validation with negative values
  test('should handle negative bounds values', () => {
    const invalidBounds = {
      x: -10,
      y: -20,
      width: -100,
      height: -200
    };

    const validated = validateBounds(invalidBounds, 1024, 768);

    expect(validated.x).toBe(0);
    expect(validated.y).toBe(0);
    expect(validated.width).toBe(100); // Minimum
    expect(validated.height).toBe(100); // Minimum
  });

  // Test bounds calculation with tab bar and margins
  test('should account for tab bar height and window margins', () => {
    const bounds = calculateDetailViewBounds(
      1024,
      75,
      768,
      'split',
      48, // tabBarHeight
      16 // windowMargins
    );

    // x should be left margin
    expect(bounds.x).toBe(16);
    
    // y should be top margin + tab bar height
    expect(bounds.y).toBe(64); // 16 + 48
    
    // width should subtract left and right margins
    expect(bounds.width).toBe(736); // (1024 * 0.75) - (16 * 2)
    
    // height should subtract top and bottom margins + tab bar height
    expect(bounds.height).toBe(688); // 768 - (16 * 2) - 48
  });

  // Test full-width mode bounds
  test('should position browser view off-screen in full-width mode', () => {
    const bounds = calculateDetailViewBounds(
      1024,
      75,
      768,
      'full-width',
      48,
      16
    );

    expect(bounds.x).toBe(-1024); // Off-screen left
    expect(bounds.width).toBe(0);
  });

  // Test invalid window dimensions
  test('should handle invalid window dimensions gracefully', () => {
    const bounds = calculateDetailViewBounds(
      0, // Invalid width
      75,
      768,
      'split',
      48,
      16
    );

    // Should fallback to reasonable default
    expect(bounds.width).toBeGreaterThan(0);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Invalid window width'),
      0
    );
  });

  // Test responsive behavior with different screen sizes
  test('should calculate correct bounds for small screens', () => {
    const bounds = calculateDetailViewBounds(
      800, // Small screen
      75,
      600,
      'split',
      48,
      16
    );

    expect(bounds.x).toBe(16);
    expect(bounds.y).toBe(64);
    expect(bounds.width).toBe(568); // (800 * 0.75) - 32
    expect(bounds.height).toBe(520); // 600 - 32 - 48
  });

  // Test responsive behavior with large screens
  test('should calculate correct bounds for large screens', () => {
    const bounds = calculateDetailViewBounds(
      1920, // Large screen
      75,
      1080,
      'split',
      48,
      16
    );

    expect(bounds.x).toBe(16);
    expect(bounds.y).toBe(64);
    expect(bounds.width).toBe(1408); // (1920 * 0.75) - 32
    expect(bounds.height).toBe(1000); // 1080 - 32 - 48
  });

  // Test bounds validation with edge cases
  test('should handle bounds at window edges', () => {
    const bounds = {
      x: 1020,
      y: 760,
      width: 100,
      height: 100
    };

    const validated = validateBounds(bounds, 1024, 768);

    // Validation maintains minimum dimensions (100px) even if it exceeds window
    // In this case, x=1020 + width=100 = 1120 which exceeds windowWidth=1024
    // But width is clamped to minimum 100px, so it stays at 100
    expect(validated.width).toBe(100); // Minimum width maintained
    expect(validated.height).toBe(100); // Minimum height maintained

    // Note: In production, the calling code should prevent this situation
    // by adjusting x before calling validateBounds
  });
});
