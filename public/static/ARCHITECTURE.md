# Architecture — Note Taking App

## Overview
An offline-first, local-first architecture with optional end-to-end encrypted sync. Desktop app uses a lightweight web frontend with a Rust/TypeScript backend bridge for performance and native OS integration.

## Platform
- Desktop shell: Tauri (Rust) + Web frontend (React or SvelteKit)
- Reasoning: small footprint vs Electron, strong native APIs, secure IPC

## Frontend
- Framework: React + TypeScript (or SvelteKit if preferred)
- State: Zustand/Redux Toolkit for UI + ephemeral state; reactive query cache for data (TanStack Query)
- Editor: Markdown-first using `react-markdown` + custom extensions or `Milkdown`/`TipTap` configured for Markdown schema
- Routing/UI: Sidebar layout, command palette, keyboard-first operations
- Search UI: Instant search field with filters; debounce + worker offloading
- Crypto: Uses backend-exposed functions for encryption/decryption when sync is on

## Backend (App Core)
- Runtime: Rust (Tauri commands) for file I/O, encryption, background jobs
- Services
  - Storage service: local database + files
  - Sync service: background task scheduler + transport client
  - Index service: full-text indexer (incremental)
  - History service: per-note versions and recovery
  - Settings service: config + feature flags

## Data Storage
- Local DB: SQLite via `libsql`/`rusqlite` (file-backed, WAL mode)
- Schema (simplified)
  - notes(id, title, markdown, created_at, updated_at, deleted_at)
  - tags(id, name)
  - note_tags(note_id, tag_id)
  - notebooks(id, name, path)
  - attachments(id, note_id, path, mime, created_at)
  - history(id, note_id, version, markdown, created_at)
  - search_index(note_id, tokens)
  - settings(key, value)
- Files
  - Vault directory per workspace
  - `attachments/` for binaries; `notes/` optional if storing as files instead of DB blobs
- Indexing
  - Use Tantivy (Rust) for local full-text index; incremental updates on save

## Sync Architecture (Optional)
- Model: E2E encrypted, zero-knowledge
- Keys
  - Device keypair generated locally; workspace symmetric content key
  - Keys stored in OS keystore (Keychain/DPAPI/Libsecret)
- Transport
  - HTTPS with simple REST or gRPC; resumable batches
  - Server stores only ciphertext + metadata (ids, hashes, timestamps)
- Conflict resolution
  - Per-note 3-way merge for Markdown using diff/merge lib
  - Fallback: preserve both versions; prompt user in Merge Center

## Background Jobs
- Debounced autosave (500ms idle)
- Incremental indexing on save
- Periodic sync pull/push with exponential backoff
- Thumbnail generation for images (optional)

## Security
- Strict IPC: only allow audited commands
- Sandboxed FS access to workspace directory
- Verified dependencies; supply-chain scanning in CI

## Telemetry & Crash Reporting
- Opt-in only
- Sentry (self-hosted) or minimal crash dump + symbol upload

## Testing Strategy
- Unit: Rust services and TS utils
- Integration: Editor save → DB write → index update
- E2E: Playwright to validate flows (create, edit, search, sync conflict)

## Build & Release
- CI: GitHub Actions (lint, test, package)
- Release: Tauri bundler for macOS/Windows/Linux

## Alternatives Considered
- Electron: simpler ecosystem but heavier memory/size
- Local files-only (no DB): great diffability but harder search/indexing
- CRDTs (Yjs): better real-time merge; added complexity for MVP
