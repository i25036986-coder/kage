# Vault UI - Media Container Management Application

## Overview
A desktop-grade media container management UI with a dark-themed sidebar. The application follows Material Design principles for data-heavy content, featuring virtual containers for URLs, 3-pane folder view layout, file detail panels, vault security features, and settings.

## Project Status: Complete
All major features have been implemented and tested.

## Architecture

### Frontend (client/)
- **Framework**: React + TypeScript + Vite
- **Routing**: Wouter
- **State Management**: React Query (TanStack Query v5)
- **UI Components**: Shadcn/ui + Radix primitives
- **Styling**: Tailwind CSS with dark theme support
- **Fonts**: Inter (UI text), JetBrains Mono (code/URLs)

### Backend (server/)
- **Framework**: Express.js with TypeScript
- **Storage**: In-memory storage (MemStorage) with seed data
- **API**: RESTful endpoints for containers, files, folders, settings

### Shared (shared/)
- **Schema**: TypeScript interfaces and Zod validation schemas
- **Types**: VirtualContainer, MediaFile, Folder, AppSettings

## Key Features

### Navigation (Sidebar)
- Library - Main container grid view
- Add New - Create container from URL
- Downloads - (Future feature - empty state)
- History - (Future feature - empty state)
- Duplicates - (Future feature - empty state)
- Local Player - Scan and play local video files from data/local-media
- Metadata - (Future feature)
- System Tools - (Future feature)
- Settings - App configuration

### Genre Categories
- Sci-Fi, Nature, Architecture filters

### Container Types
- Single file, Multiple files, Folder, Unknown

### Container Status
- Basic (not authenticated)
- Authenticated (session active)
- Expanded (files loaded)
- Expired (session ended)

## API Endpoints

### Containers
- `GET /api/containers` - List all containers
- `GET /api/containers/:id` - Get container by ID
- `GET /api/containers/genre/:genre` - Filter by genre
- `POST /api/containers` - Create new container
- `PATCH /api/containers/:id` - Update container
- `DELETE /api/containers/:id` - Delete container
- `POST /api/containers/:id/unlock` - Authenticate container
- `POST /api/containers/:id/expand` - Expand/load files

### Files & Folders
- `GET /api/containers/:containerId/files` - List files in container
- `GET /api/containers/:containerId/folders` - List folders in container
- `GET /api/files/:id` - Get file by ID

### Settings
- `GET /api/settings` - Get app settings
- `PATCH /api/settings` - Update settings

### Assets (Background uploads)
- `POST /api/assets/upload` - Upload image/video for backgrounds (max 100MB)
- `GET /api/assets/backgrounds` - List uploaded background assets
- `GET /api/assets/backgrounds/:filename` - Serve uploaded file
- `DELETE /api/assets/backgrounds/:filename` - Delete uploaded file

### Local Media
- `GET /api/local-media/scan` - Scan data/local-media for video files
- `GET /api/local-media/stream/:path` - Stream local video with Range support

## Running the Application
```bash
npm run dev
```
The application runs on port 5000.

### Local Windows Setup
For running locally on Windows with full TeraBox authentication:
1. Set environment variables for Chrome profile:
   - `CHROME_USER_DATA=C:/Users/YourName/AppData/Local/Google/Chrome/User Data`
   - `CHROME_PROFILE_DIR=Default`
2. Close Chrome browser before running Auth (Playwright needs exclusive access)
3. The Auth button will use your logged-in Chrome session for full cookie access

## Design System
See `design_guidelines.md` for complete styling guidelines including:
- Color palette (dark/light themes)
- Typography (Inter, JetBrains Mono)
- Spacing and layout
- Component styling
- Interaction patterns

## Electron Desktop App

For running as a native desktop application with MPV video player, see `ELECTRON_SETUP.md`.

### Quick Start (Development)
```bash
# Terminal 1: Start web server
npm run dev

# Terminal 2: Compile and run Electron
npx tsc -p electron/tsconfig.json
npx electron electron/dist/main.js
```

### MPV Integration
- Native MPV player for reliable video playback of TeraBox streams
- Controlled via JSON IPC socket from Electron main process
- Falls back to HTML5 player when running in browser

## Recent Changes
- 2025-12-24: Electron + MPV native player integration
  - Electron infrastructure: main.ts, preload.ts, mpv-controller.ts
  - node-mpv wrapper for IPC control of external MPV player
  - React integration via window.mpvAPI exposed through contextBridge
  - Automatic fallback to HTML5 player in browser context
  - Play buttons in Library and File Detail panels use MPV when available
  - Setup documentation in ELECTRON_SETUP.md
- 2025-12-23: Local file upload and local player features
  - Background upload API: POST /api/assets/upload for images/videos up to 100MB
  - Assets stored in data/backgrounds/ with unique filenames
  - Settings UI updated with upload buttons for Global and Panel backgrounds
  - Renamed "Background Customization" to "Global Background" for clarity
  - Local Player page with video scanning from data/local-media folder
  - Streaming endpoint with Range header support for local video playback
- 2025-12-23: Three-tier duplicate detection system
  - duplicate_records table in SQLite database
  - Three detection rules: exact_url (definite), name_metadata (likely), metadata_only (suspicious)
  - API endpoints: GET /api/duplicates, POST /api/duplicates/detect, PATCH /api/duplicates/:id, POST /api/duplicates/:id/delete-container
  - Duplicates page with grouped display by rule type
  - Actions: Delete source/match container, Ignore (mark as not a duplicate)
  - Bi-directional pair tracking prevents re-detecting ignored duplicates
- 2025-12-23: Video streaming and playback support
  - Streaming proxy endpoint (/api/stream/:fileId) with Range header support for progressive playback
  - Download proxy endpoint (/api/download/:fileId) with Content-Disposition headers
  - Cookie forwarding for all TeraBox domains (1024tera, terabox, panapi, pcs)
  - Video player with loading/error states and expired link detection
  - Play and Download buttons on container cards for expanded containers with playable files
  - Auth Fetch cache invalidation to ensure fresh links after re-authentication
  - Toast notifications guide users to run Auth Fetch when links expire
- 2025-12-23: Terabox integration with queue-first approach
  - SQLite database with containers, files, auth_tokens, public_fetch_queue tables
  - Three distinct fetch mechanisms:
    - Public Fetch: Headless Playwright intercepts /api/shorturlinfo for metadata
    - Auth: Global button launches visible browser for manual TeraBox login
    - Auth Fetch: Uses stored jsToken+cookies for authenticated API calls
  - Queue-first workflow enforced: URLs must go through queue → public fetch → container creation
  - Direct container creation endpoints redirect to queue system
  - Auth token validation required before auth fetch attempts
  - Frontend: Global Auth button in header, per-container Public/Auth Fetch buttons
  - Add New page with Single URL, Bulk Upload, and Queue management tabs
- 2025-12-23: Added quick actions for container cards
  - Play and Download buttons for single-file containers (when authenticated)
  - Authenticate button for containers needing backend auth
  - Dynamic genre/tag counts computed from container data
  - Background settings properly persist without page reload
  - Duplicate validation for tags and genres
- 2025-12-23: Initial implementation complete
  - Dark-themed sidebar matching mockup design
  - Container card grid with thumbnails and status badges
  - 3-pane folder view with resizable panels
  - File detail panel with metadata display
  - Settings page with thumbnail and vault options
  - Full backend API with in-memory storage
  - React Query integration with loading/error states
  - Theme toggle (dark/light mode)
