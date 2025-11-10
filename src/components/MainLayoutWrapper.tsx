/**
 * MainLayoutWrapper Component
 *
 * Provides fixed-size responsive layout container with our design system
 * Maintains branding: monochrome palette, design tokens, spacing, typography
 *
 * Dimensions: 1245px × 909px (optimized for 1600×900 window)
 * Uses: design tokens, brand colors, typography scale
 */

import React from 'react'

interface MainLayoutWrapperProps {
  children: React.ReactNode
}

/**
 * Layout wrapper with brand-aware styling
 * Applies flex container with optimized dimensions while preserving design system
 */
export const MainLayoutWrapper: React.FC<MainLayoutWrapperProps> = ({ children }) => {
  return (
    <div
      className="rounded-xl bg-transparent"
      style={{
        display: 'flex',
        width: '1245px',
        height: '909px',
        padding: '10px',
        alignItems: 'flex-start',
        gap: '8px',
        borderRadius: '10px',
        // Branding: Design tokens
        background: 'var(--color-bg-primary)',
        borderColor: 'var(--color-border-subtle)',
        borderWidth: '1px',
        borderStyle: 'solid',
        // Smooth transitions honoring brand
        transition: 'all var(--transition-base)',
        // GPU acceleration
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        WebkitFontSmoothing: 'subpixel-antialiased',
      }}
    >
      {children}
    </div>
  )
}

export default MainLayoutWrapper
