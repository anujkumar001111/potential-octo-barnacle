# Design Document: Unified Design System & Responsive Layout

## Overview

This design document outlines the technical approach for implementing a unified monochrome design system with full responsiveness and proper full-screen support across the Manus Electron application. The design focuses on:

1. **Unified Color Palette**: Consistent monochrome colors across all components
2. **Visual Consistency**: Seamless header-to-content transitions
3. **Responsive Layouts**: Adaptive designs for all screen sizes
4. **Full-Screen Support**: Proper scaling and layout in full-screen mode
5. **Performance**: Efficient resize handling and smooth transitions

## Architecture

### Color System Architecture

```
┌─────────────────────────────────────────────────────────┐
│           CSS Custom Properties (globals.css)            │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Monochrome Palette Variables              │  │
│  │  --mono-darkest: #171717                          │  │
│  │  --mono-dark: #212121                             │  │
│  │  --mono-medium-dark: #2E2E2E                      │  │
│  │  --mono-medium: #353535                           │  │
│  │  --mono-light: #D1D1D1                            │  │
│  │  --mono-white: #FFFFFF                            │  │
│  │  --mono-disabled: #7B7B7B                         │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Semantic Token Mapping                    │  │
│  │  --bg-header: var(--mono-darkest)                 │  │
│  │  --bg-main: var(--mono-darkest)                   │  │
│  │  --bg-ai-sidebar: var(--mono-medium-dark)         │  │
│  │  --border-subtle: var(--mono-medium)              │  │
│  │  --text-primary: var(--mono-white)                │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              All React Components                        │
│  Use semantic tokens instead of direct colors           │
│  style={{ background: 'var(--bg-header)' }}             │
└─────────────────────────────────────────────────────────┘
```

### Responsive Layout System

```
┌──────────────────────────────────────────────────────────┐
│                  Breakpoint System                        │
├──────────────────────────────────────────────────────────┤
│  Mobile:    < 768px   (Not primary target)               │
│  Tablet:    768px - 1023px                               │
│  Desktop:   1024px - 1439px  (Standard)                  │
│  Large:     1440px - 1919px                              │
│  XL:        ≥ 1920px         (4K/5K displays)            │
└──────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│              Layout Adaptations                           │
├──────────────────────────────────────────────────────────┤
│  < 1024px:  Browser 60% / Sidebar 40%                    │
│  1024-1440: Browser 75% / Sidebar 25% (Default)          │
│  > 1440px:  Browser 75% / Sidebar 25% (Max-width limits) │
└──────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Enhanced Color Palette System

#### Updated CSS Variables

```css
/* src/styles/globals.css - Enhanced Palette */
:root {
  /* Base Monochrome Palette */
  --mono-darkest: #171717;
  --mono-dark: #212121;
  --mono-medium-dark: #2E2E2E;
  --mono-medium: #353535;
  --mono-light-medium: #D9D9D9;
  --mono-white: #FFFFFF;
  --mono-light: #D1D1D1;
  --mono-disabled: #7B7B7B;

  /* Semantic Tokens - Backgrounds */
  --bg-header: var(--mono-darkest);
  --bg-main: var(--mono-darkest);
  --bg-browser-panel: var(--mono-darkest);
  --bg-ai-sidebar: var(--mono-medium-dark);
  --bg-input: var(--mono-medium);
  --bg-button: var(--mono-medium);
  --bg-button-hover: var(--mono-disabled);
  --bg-elevated: var(--mono-dark);

  /* Semantic Tokens - Borders */
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-standard: rgba(255, 255, 255, 0.12);
  --border-focus: rgba(255, 255, 255, 0.24);

  /* Semantic Tokens - Text */
  --text-primary: var(--mono-white);
  --text-secondary: var(--mono-light);
  --text-disabled: var(--mono-disabled);
  --text-placeholder: rgba(255, 255, 255, 0.4);

  /* Semantic Tokens - Interactive States */
  --interactive-default: var(--mono-medium);
  --interactive-hover: var(--mono-disabled);
  --interactive-active: var(--mono-medium-dark);
  --interactive-focus: rgba(255, 255, 255, 0.24);

  /* Responsive Typography */
  --font-size-base: clamp(14px, 1vw, 16px);
  --font-size-sm: clamp(12px, 0.875vw, 14px);
  --font-size-lg: clamp(16px, 1.125vw, 18px);
  --font-size-xl: clamp(20px, 1.5vw, 24px);
  --font-size-2xl: clamp(24px, 1.75vw, 28px);

  /* Responsive Spacing */
  --spacing-xs: clamp(4px, 0.5vw, 8px);
  --spacing-sm: clamp(8px, 1vw, 12px);
  --spacing-md: clamp(12px, 1.5vw, 16px);
  --spacing-lg: clamp(16px, 2vw, 24px);
  --spacing-xl: clamp(24px, 3vw, 32px);
}

/* Responsive breakpoint adjustments */
@media (max-width: 1023px) {
  :root {
    --font-size-base: 14px;
  }
}

@media (min-width: 1920px) {
  :root {
    --font-size-base: 18px;
  }
}
```

### 2. Header Component Redesign

#### Unified Header Styling

```typescript
// src/components/AISidebarHeader.tsx - Updated styles
<style jsx>{`
  .ai-sidebar-header {
    background: var(--bg-header);
    padding: var(--spacing-md) var(--spacing-lg);
    border-bottom: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    color: var(--text-primary);
    -webkit-app-region: drag;
    min-height: 48px;
  }

  .header-main-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    -webkit-app-region: no-drag;
  }

  .logo {
    font-size: var(--font-size-2xl);
    font-weight: 700;
    letter-spacing: -0.025em;
    cursor: pointer;
    margin-left: var(--spacing-lg);
    font-family: system-ui, -apple-system, sans-serif;
    transition: all 200ms ease-out;
    color: var(--text-primary);
    position: relative;
  }

  .logo:hover {
    color: var(--text-secondary);
    transform: translateY(-1px);
  }

  .action-buttons {
    display: flex;
    gap: var(--spacing-md);
    align-items: center;
  }

  /* Responsive adjustments */
  @media (max-width: 1023px) {
    .ai-sidebar-header {
      padding: var(--spacing-sm) var(--spacing-md);
    }

    .logo {
      font-size: var(--font-size-xl);
      margin-left: var(--spacing-md);
    }
  }
`}</style>
```

### 3. Responsive Layout Hook

#### New Hook: useResponsiveLayout

```typescript
// src/hooks/useResponsiveLayout.ts
import { useState, useEffect, useCallback } from 'react';

export interface ResponsiveBreakpoint {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLarge: boolean;
  isXL: boolean;
  width: number;
  height: number;
}

export interface ResponsiveLayoutConfig {
  browserPanelPercent: number;
  aiSidebarPercent: number;
  minBrowserWidth: number;
  minSidebarWidth: number;
}

export function useResponsiveLayout() {
  const [breakpoint, setBreakpoint] = useState<ResponsiveBreakpoint>(() => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isLarge: false,
    isXL: false,
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  }));

  const calculateBreakpoint = useCallback((width: number, height: number): ResponsiveBreakpoint => {
    return {
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024 && width < 1440,
      isLarge: width >= 1440 && width < 1920,
      isXL: width >= 1920,
      width,
      height
    };
  }, []);

  const getLayoutConfig = useCallback((bp: ResponsiveBreakpoint): ResponsiveLayoutConfig => {
    if (bp.isMobile || bp.isTablet) {
      return {
        browserPanelPercent: 60,
        aiSidebarPercent: 40,
        minBrowserWidth: 300,
        minSidebarWidth: 300
      };
    }

    // Desktop and larger
    return {
      browserPanelPercent: 75,
      aiSidebarPercent: 25,
      minBrowserWidth: 400,
      minSidebarWidth: 320
    };
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const newBreakpoint = calculateBreakpoint(window.innerWidth, window.innerHeight);
        setBreakpoint(newBreakpoint);
      }, 150); // Debounce resize events
    };

    window.addEventListener('resize', handleResize);
    
    // Initial calculation
    handleResize();

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateBreakpoint]);

  return {
    breakpoint,
    layoutConfig: getLayoutConfig(breakpoint)
  };
}
```

### 4. Full-Screen Mode Handler

#### Electron Main Process Integration

```typescript
// electron/main/windows/fullscreen-handler.ts
import { BrowserWindow } from 'electron';

export class FullScreenHandler {
  private window: BrowserWindow;
  private previousBounds: Electron.Rectangle | null = null;

  constructor(window: BrowserWindow) {
    this.window = window;
    this.setupListeners();
  }

  private setupListeners() {
    // Monitor full-screen state changes
    this.window.on('enter-full-screen', () => {
      console.log('[FullScreen] Entered full-screen mode');
      this.handleEnterFullScreen();
    });

    this.window.on('leave-full-screen', () => {
      console.log('[FullScreen] Exited full-screen mode');
      this.handleLeaveFullScreen();
    });
  }

  private handleEnterFullScreen() {
    // Store previous bounds
    this.previousBounds = this.window.getBounds();

    // Notify renderer process
    this.window.webContents.send('fullscreen-changed', {
      isFullScreen: true,
      bounds: this.window.getBounds()
    });
  }

  private handleLeaveFullScreen() {
    // Notify renderer process
    this.window.webContents.send('fullscreen-changed', {
      isFullScreen: false,
      bounds: this.previousBounds || this.window.getBounds()
    });
  }

  public toggleFullScreen() {
    this.window.setFullScreen(!this.window.isFullScreen());
  }

  public isFullScreen(): boolean {
    return this.window.isFullScreen();
  }
}
```

#### Renderer Process Hook

```typescript
// src/hooks/useFullScreen.ts
import { useState, useEffect } from 'react';

export function useFullScreen() {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [bounds, setBounds] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!window.api) return;

    const handleFullScreenChange = (event: any) => {
      setIsFullScreen(event.isFullScreen);
      setBounds({
        width: event.bounds.width,
        height: event.bounds.height
      });
    };

    // Listen for full-screen changes
    if ((window.api as any).onFullScreenChanged) {
      (window.api as any).onFullScreenChanged(handleFullScreenChange);
    }

    return () => {
      if (window.api && (window.api as any).removeAllListeners) {
        (window.api as any).removeAllListeners('fullscreen-changed');
      }
    };
  }, []);

  const toggleFullScreen = () => {
    if (window.api && (window.api as any).toggleFullScreen) {
      (window.api as any).toggleFullScreen();
    }
  };

  return {
    isFullScreen,
    bounds,
    toggleFullScreen
  };
}
```

### 5. Responsive Home Page

#### Updated Home Page Layout

```typescript
// src/pages/home.tsx - Responsive enhancements
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

export default function Home() {
  const { breakpoint } = useResponsiveLayout();
  
  return (
    <div className="h-screen w-screen overflow-hidden flex" style={{ background: 'var(--bg-main)' }}>
      <div className="w-full h-full flex flex-col" style={{ background: 'var(--bg-ai-sidebar)' }}>
        <AISidebarHeader />

        <div className='h-full overflow-y-auto flex flex-col relative'
             style={{ background: 'var(--bg-main)' }}>
          <div className='flex flex-col items-center w-full h-full overflow-y-auto z-10'
               style={{ 
                 paddingTop: breakpoint.isTablet ? 'var(--spacing-xl)' : '80px',
                 paddingLeft: 'var(--spacing-md)',
                 paddingRight: 'var(--spacing-md)'
               }}>
            {/* Greeting - responsive sizing */}
            <div className='text-center text-text-01-dark w-full'
                 style={{
                   fontSize: 'var(--font-size-2xl)',
                   fontWeight: 700,
                   lineHeight: 1.4,
                   maxWidth: breakpoint.isTablet ? '500px' : '636px'
                 }}>
              <div>{t('greeting_name')}</div>
              <p>{t('greeting_intro')}</p>
            </div>

            {/* Input area - responsive width */}
            <div className='gradient-border w-full mt-[30px]'
                 style={{ 
                   maxWidth: breakpoint.isTablet ? '500px' : '636px',
                   height: 'auto'
                 }}>
              <ModelConfigBar />
              <Input.TextArea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('input_placeholder')}
                style={{
                  height: breakpoint.isTablet ? '120px' : '160px'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Data Models

### Responsive Configuration Types

```typescript
// src/type.d.ts - Add responsive types
export interface ResponsiveBreakpoint {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLarge: boolean;
  isXL: boolean;
  width: number;
  height: number;
}

export interface ResponsiveLayoutConfig {
  browserPanelPercent: number;
  aiSidebarPercent: number;
  minBrowserWidth: number;
  minSidebarWidth: number;
}

export interface FullScreenState {
  isFullScreen: boolean;
  bounds: {
    width: number;
    height: number;
  } | null;
}
```

## Error Handling

### Resize Event Throttling

```typescript
// Prevent excessive recalculations during resize
const handleResize = useCallback(() => {
  if (resizeTimeoutRef.current) {
    clearTimeout(resizeTimeoutRef.current);
  }

  resizeTimeoutRef.current = setTimeout(() => {
    try {
      const newBreakpoint = calculateBreakpoint(window.innerWidth, window.innerHeight);
      setBreakpoint(newBreakpoint);
      
      // Update browser view bounds
      if (window.api?.updateDetailViewBounds) {
        const bounds = calculateDetailViewBounds(
          window.innerWidth,
          layoutConfig.browserPanelPercent,
          window.innerHeight,
          layoutMode
        );
        window.api.updateDetailViewBounds(bounds);
      }
    } catch (error) {
      console.error('[Responsive] Failed to handle resize:', error);
    }
  }, 150);
}, [layoutMode, layoutConfig]);
```

### Full-Screen Mode Fallback

```typescript
// Handle cases where full-screen API is unavailable
const toggleFullScreen = () => {
  try {
    if (window.api && (window.api as any).toggleFullScreen) {
      (window.api as any).toggleFullScreen();
    } else {
      console.warn('[FullScreen] API not available');
      // Fallback: maximize window instead
      if (window.api && (window.api as any).maximizeWindow) {
        (window.api as any).maximizeWindow();
      }
    }
  } catch (error) {
    console.error('[FullScreen] Failed to toggle:', error);
  }
};
```

## Testing Strategy

### Visual Regression Tests

```typescript
// tests/visual/responsive-layout.spec.ts
describe('Responsive Layout', () => {
  const viewports = [
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1024, height: 768, name: 'desktop-small' },
    { width: 1440, height: 900, name: 'desktop-standard' },
    { width: 1920, height: 1080, name: 'desktop-large' },
    { width: 2560, height: 1440, name: 'desktop-xl' }
  ];

  viewports.forEach(viewport => {
    it(`should render correctly at ${viewport.name}`, async () => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://localhost:5173/home');
      
      const screenshot = await page.screenshot();
      expect(screenshot).toMatchImageSnapshot({
        customSnapshotIdentifier: `home-${viewport.name}`
      });
    });
  });
});
```

### Full-Screen Mode Tests

```typescript
// tests/integration/fullscreen.spec.ts
describe('Full-Screen Mode', () => {
  it('should enter full-screen without zooming', async () => {
    const initialFontSize = await page.evaluate(() => {
      return window.getComputedStyle(document.body).fontSize;
    });

    // Toggle full-screen
    await page.evaluate(() => {
      (window as any).api.toggleFullScreen();
    });

    await page.waitForTimeout(500);

    const fullScreenFontSize = await page.evaluate(() => {
      return window.getComputedStyle(document.body).fontSize;
    });

    expect(fullScreenFontSize).toBe(initialFontSize);
  });

  it('should maintain layout proportions in full-screen', async () => {
    const windowedProportions = await page.evaluate(() => {
      const browser = document.querySelector('.browser-area');
      const sidebar = document.querySelector('.ai-sidebar');
      return {
        browserWidth: browser?.getBoundingClientRect().width,
        sidebarWidth: sidebar?.getBoundingClientRect().width
      };
    });

    await page.evaluate(() => {
      (window as any).api.toggleFullScreen();
    });

    await page.waitForTimeout(500);

    const fullScreenProportions = await page.evaluate(() => {
      const browser = document.querySelector('.browser-area');
      const sidebar = document.querySelector('.ai-sidebar');
      const total = window.innerWidth;
      return {
        browserPercent: ((browser?.getBoundingClientRect().width || 0) / total) * 100,
        sidebarPercent: ((sidebar?.getBoundingClientRect().width || 0) / total) * 100
      };
    });

    expect(fullScreenProportions.browserPercent).toBeCloseTo(75, 1);
    expect(fullScreenProportions.sidebarPercent).toBeCloseTo(25, 1);
  });
});
```

## Performance Considerations

### Debounced Resize Handling

```typescript
// Optimize resize event handling
const debouncedResize = useMemo(
  () => debounce((width: number, height: number) => {
    const newBreakpoint = calculateBreakpoint(width, height);
    setBreakpoint(newBreakpoint);
    
    // Update layout
    const config = getLayoutConfig(newBreakpoint);
    updateLayout(config);
  }, 150),
  []
);
```

### CSS Containment for Performance

```css
/* Improve rendering performance */
.ai-sidebar {
  contain: layout style paint;
  will-change: width;
}

.browser-area {
  contain: layout style paint;
}

/* Reduce repaints during resize */
@media (prefers-reduced-motion: no-preference) {
  .ai-sidebar,
  .browser-area {
    transition: width 200ms ease-out;
  }
}
```

## Migration Path

### Phase 1: Color System Unification
1. Update CSS variables in globals.css
2. Replace all hardcoded colors with semantic tokens
3. Test visual consistency across all pages

### Phase 2: Responsive Layout Implementation
1. Create useResponsiveLayout hook
2. Update home and main pages with responsive logic
3. Test across different viewport sizes

### Phase 3: Full-Screen Support
1. Implement FullScreenHandler in Electron main process
2. Create useFullScreen hook for renderer
3. Add IPC handlers for full-screen events
4. Test full-screen mode on macOS and Windows

### Phase 4: Component Updates
1. Update all components to use semantic color tokens
2. Apply responsive typography
3. Test component consistency

### Phase 5: Testing and Refinement
1. Visual regression testing
2. Performance profiling
3. User acceptance testing
4. Bug fixes and polish
