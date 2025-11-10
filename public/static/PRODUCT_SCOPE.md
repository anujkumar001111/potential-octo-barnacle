# Product Scope — Note Taking App (MVP)

## Vision
A fast, reliable, cross‑platform note app that excels at quick capture, frictionless organization, powerful search, and safe sync across devices. Private by default, offline‑first, with optional end‑to‑end encrypted cloud sync.

## Target Users
- Individuals who capture ideas, tasks, and research daily
- Students and knowledge workers needing fast search and linking
- Users who care about privacy and local ownership of data

## MVP Goals
- Minimize time-to-capture (< 2s from app open)
- Robust offline usage with seamless background sync
- Data durability (no data loss on crashes; autosave always-on)
- Private by default; exportable data (no lock-in)

## MVP Features
- Editor
  - Markdown + CommonMark with inline formatting (bold/italic/links/code)
  - Headings, lists, checkboxes (task list), code blocks, images (pasted/dragged)
  - Inline slash commands for quick actions (/todo, /h1, /date)
  - Autosave with local version history per note
- Organization
  - Sidebar with Notebooks (folders) and Tags
  - Quick capture (global shortcut) creates note in Inbox
  - Backlinks and [[wiki-links]] between notes
  - Pin, archive, delete with Trash recovery
- Search
  - Full-text search with filters (tag:notebook:type:checkbox:has:link)
  - Recent notes and fuzzy search in command palette
- Sync (MVP scope)
  - Optional account sign-in to enable encrypted sync
  - Device pairing key; zero-knowledge encryption for note contents
  - Conflict resolution: 3-way merge for Markdown; manual review UI when needed
- Files & Media
  - Local attachments folder; image and file embeds
  - Clipboard paste of images; auto compress and store locally
- Settings
  - Theme (light/dark/system), font size, editor width
  - Data export/import (Markdown + JSON metadata)

## Non-Goals (MVP)
- Collaborative real-time editing
- Complex diagramming or whiteboards
- Web Clipper (can be a post-MVP)
- Templates library (basic slash commands only)

## Quality Bar
- Launch on Desktop (macOS/Windows/Linux). Mobile is post-MVP.
- Cold open to editable note under 1s on mid hardware
- 100% local operability with clean degradation if cloud absent

## Analytics & Privacy
- No 3rd-party analytics by default
- Optional, privacy-preserving telemetry with explicit opt-in
- All content encrypted at-rest when sync is enabled

## Roadmap
- 0.1 Alpha
  - Local-only vault, Markdown editor, folders/tags, search
  - Autosave, local history, quick capture shortcut
- 0.2 Sync Preview
  - Account creation, device key, encrypted sync for notes and tags
  - Basic merge conflict UI, background sync
- 0.3 Attachments & Rich Embeds
  - Images/files management, image paste, resource references
- 0.4 Power Features
  - Backlinks graph view, saved searches/smart folders, templates
- 0.5 Public Beta
  - Performance hardening, migration/export tools, error recovery UX

## Success Metrics
- Median time-to-capture < 2s
- Search P95 < 150ms on 5k notes
- Sync reliability > 99.9% successful cycles/day
- Crash-induced data loss: 0 incidents

## Risks & Mitigations
- Sync conflicts: adopt CRDT or 3-way merge; preserve both on failure
- Editor complexity: keep Markdown-first; gradually add blocks
- Vendor lock-in: export/import rock-solid; documented data schema
- Security: audited crypto libs; keys never leave device
