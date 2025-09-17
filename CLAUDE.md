# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Desktop Video Converter is an Electron-based desktop application for Windows that provides a simple, single-purpose video conversion tool. The app converts video files to web-optimized MP4 format using FFmpeg, with a focus on simplicity and ease of use for non-technical users.

## Technology Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Radix UI components
- **Desktop Framework**: Electron 27 with electron-vite build system
- **Video Processing**: FFmpeg via ffmpeg-static and fluent-ffmpeg
- **Testing**: Vitest (unit), Playwright (e2e), custom IPC contract tests
- **Build Tools**: electron-builder for packaging, Vite for bundling

## Architecture

### Multi-Process Structure
- **Main Process** (`electron/main.ts`): Window management, IPC handlers, system integration
- **Renderer Process** (`src/App.tsx`): React UI running in browser window
- **Preload Script** (`electron/preload.ts`): Secure IPC bridge between main and renderer
- **Shared Types** (`shared/types/`): TypeScript definitions used across all processes

### Key Services
- **ConversionService** (`electron/services/conversion.service.ts`): Job queue management, FFmpeg process handling, progress tracking
- **FileValidationService**: Video file validation and metadata extraction
- **IPC Contracts** (`shared/types/ipc-contracts.ts`): Type-safe communication between processes

### State Management
- Local React state for UI components
- Electron store for persistent application preferences
- Service layer maintains conversion job state

## Development Commands

```bash
# Development
npm run dev              # Start development server with hot reload
npm run preview          # Preview production build

# Building
npm run build            # Build for production
npm run dist             # Build and package for distribution
npm run dist:win         # Build Windows-specific package

# Testing
npm test                 # Run unit tests (Vitest)
npm run test:e2e         # Run end-to-end tests (Playwright)

# Code Quality
npm run lint             # Check code style and errors
npm run lint:fix         # Auto-fix linting issues
npm run type-check       # TypeScript type checking

# Packaging
npm run pack             # Package without creating installer
```

## Project Structure

```
├── electron/           # Main process code
│   ├── main.ts         # Entry point, window creation
│   ├── preload.ts      # IPC bridge
│   ├── handlers/       # IPC request handlers
│   └── services/       # Business logic services
├── src/                # Renderer process (React app)
│   ├── components/     # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   └── lib/            # Utility functions
├── shared/             # Code shared between processes
│   └── types/          # TypeScript type definitions
├── tests/              # Test suites
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   ├── e2e/            # End-to-end tests
│   └── contracts/      # IPC contract tests
└── build/              # Application assets and icons
```

## Development Guidelines

### IPC Communication
- All IPC communication uses typed contracts defined in `shared/types/ipc-contracts.ts`
- Main process handlers are in `electron/handlers/`
- Renderer uses `window.electronAPI` interface exposed by preload script

### Video Conversion Flow
1. File selection via native dialog (`electronAPI.file.select`)
2. File validation (`electronAPI.file.validate`)
3. Output location selection (`electronAPI.file.saveLocation`)
4. Conversion start (`electronAPI.conversion.start`) creates job in ConversionService
5. Progress events stream via IPC (`conversionProgress`, `conversionComplete`, `conversionError`)

### Testing Strategy
- **Unit tests**: Individual component and service testing
- **IPC contract tests**: Ensure type-safe communication between processes
- **E2E tests**: Full user workflows using Playwright
- Run `npm test` for unit tests, `npm run test:e2e` for full application testing

### Component Library
- Uses Radix UI primitives with custom Tailwind styling
- Components are in `src/components/ui/` following shadcn/ui patterns
- Consistent design system with dark/light mode support

### Security Considerations
- Sandbox enabled in renderer process
- Context isolation enforced
- Node integration disabled in renderer
- All file system access goes through main process

## Common Tasks

### Adding New IPC Operations
1. Define request/response types in `shared/types/ipc-contracts.ts`
2. Add handler in `electron/handlers/`
3. Register handler in `electron/main.ts`
4. Add method to preload API interface
5. Use from renderer via `window.electronAPI`

### Video Format Support
- Currently supports: MP4, AVI, MOV, MKV, WebM, FLV
- Add new formats by updating file filters in file selection dialogs
- FFmpeg handles format detection and conversion automatically

### Building for Distribution
- `npm run dist:win` creates portable Windows executable
- Output in `dist/` directory
- No installation required - runs as single .exe file
- Application icon and metadata configured in `package.json` build section