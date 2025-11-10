# DM Agency Landing — Acceptance Criteria

Performance
- Lighthouse Performance ≥ 95 on simulated Fast 3G + 4x CPU throttle.
- Initial critical CSS/JS ≤ 100KB; defer non-critical scripts; lazy-load images/components.
- Use HTTP/2, compression (gzip/br), and caching headers for static assets.

Accessibility (WCAG 2.1 AA)
- Semantic landmarks: header, nav, main, footer; skip-to-content link present.
- All interactive elements keyboard-focusable with visible focus rings.
- ARIA labels where necessary; no role misuse; form fields labelled with errors announced.
- Color contrast ratio ≥ 4.5:1 for text and 3:1 for UI components; reduced-motion supported.

Responsiveness
- Breakpoints covered: 320, 375, 768, 1024, 1280, 1536+.
- No horizontal scrolling at any breakpoint; images and grids adapt fluidly.
- Touch targets ≥ 44x44px; safe-area insets respected on mobile.

SEO & Metadata
- Title, meta description, canonical, Open Graph, Twitter Card completed.
- JSON-LD Organization schema including name, url, sameAs, contactPoint.
- Clean heading hierarchy (h1 once, logical h2/h3); alt text for media.
- Sitemap.xml and robots.txt present; 404 route returns correct status.

Analytics & Events
- Analytics adapter with queue + console transport; no blocking of UI thread.
- Events emitted: nav_click, cta_click, form_submit, carousel_interact, newsletter_signup.
- Consent-ready: single flag to disable tracking; respects Do Not Track.

Architecture & Code Quality
- Modular components for sections and UI primitives; no dead code.
- Tree-shakeable utilities; CSS variables/tokens for theme; dark mode support.
- API routes mocked: /api/lead, /api/newsletter, /api/posts with typed payloads and validation.
- Error handling with user-friendly messages and retry patterns; loading skeletons/spinners.

Testing & Preview
- E2E happy path in preview: open CTA modal → validate fields → submit → success.
- Basic unit coverage for analytics util and form validators (if test runner present).
- No console errors or unhandled promise rejections in preview.

Deployment Readiness
- Production build without source maps in HTML; env-based toggles for analytics endpoints.
- Security headers recommended (CSP scaffold, X-Content-Type-Options, Referrer-Policy, etc.).
