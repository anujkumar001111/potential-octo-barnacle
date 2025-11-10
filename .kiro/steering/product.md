# Product Overview

**Manus Electron** (formerly AI Browser) is an AI-powered intelligent desktop browser built with Next.js 15 and Electron 33. It enables multi-modal AI task execution with automated browser operations, scheduled tasks, and advanced file management capabilities.

## Core Features

- **AI-Powered Browser**: Intelligent browser with automated task execution using multiple AI providers
- **Multi-Modal AI**: Vision and text processing capabilities for complex tasks
- **Scheduled Tasks**: Create and manage automated recurring tasks with custom intervals
- **Agent Configuration**: Customize AI agent behavior with custom prompts and MCP tools
- **Speech & TTS**: Voice recognition (Vosk) and text-to-speech (Microsoft Cognitive Services)
- **File Management**: Advanced file operations and management
- **Multi-Provider Support**: DeepSeek, Qwen, Google Gemini, Anthropic Claude, OpenRouter
- **Resizable Layout**: Dynamic panel layout with browser-first design and persistent user preferences
- **Toolbox**: Centralized hub for system features including agent configuration and scheduled tasks

## Target Use Cases

- Automated web browsing and data extraction
- Scheduled content monitoring and processing
- AI-assisted file operations and management
- Voice-controlled task execution
- Multi-modal content analysis and processing
- Social media integration (Xiaohongshu, Douyin)

## Architecture

Hybrid desktop application combining:
- **Frontend**: Next.js 15 web interface (port 5173) for user interaction
- **Desktop Shell**: Electron 33 for native desktop integration and browser automation
- **AI Engine**: @jarvis-agent framework (based on Eko) for task execution
- **Task Management**: Built-in scheduler for automated recurring tasks
- **Storage**: IndexedDB for task history, electron-store for configuration

### Initialization Sequence
1. Electron app ready event
2. **IPC handlers registered** (before window creation to prevent race conditions)
3. Custom protocol registration (client://)
4. Window creation and Next.js server startup
5. **Browser view positioned** (LEFT side, 75% width, full height)
6. **Browser view visibility**: Hidden by default, shows after first message
7. Renderer process initialization

### Browser View Architecture
- **Position**: LEFT side of window (x: 0, y: 0)
- **Size**: 75% of window width, full window height (edge-to-edge)
- **Visibility**: Hidden by default, shows after first message (preserves original UX)
- **Purpose**: Browser automation area (WebContentsView) for task execution
- **Coordination**: AI Sidebar occupies remaining 25% on RIGHT side

### Configuration Priority
API keys follow this priority order:
1. User configuration set via UI (stored in electron-store)
2. Environment variables (.env.local or .env.production)
3. Default values embedded in the application