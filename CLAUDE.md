# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Desktop Video Converter project built using the Electron framework. The application provides a simple, single-purpose tool to convert video files into web-optimized MP4 format with minimal user interaction.

## Architecture

### Technology Stack
- **Framework**: Electron (desktop application framework)
- **UI Library**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Hooks (useState, useContext)
- **Testing**: Vitest + React Testing Library

### Project Structure
```
/desktop-video-converter
├── electron/
│   ├── main.js         # Electron main process entry point
│   └── preload.js      # Secure Node.js API bridge
├── src/
│   ├── components/     # Reusable React components
│   ├── hooks/          # Custom React hooks
│   ├── styles/         # Global CSS styles
│   ├── App.jsx         # Main React application component
│   └── main.jsx        # React application entry point
├── public/
│   └── icon.ico        # Application icon
└── [config files]
```

## Development Standards

### Component Standards
- Use TypeScript interfaces for props
- Follow PascalCase for component files and functions
- Use camelCase for custom hooks (prefix with 'use')
- Components should be functional with React.FC type

### State Management
- Use React's built-in hooks (useState, useContext) 
- Manage all application state in main App.jsx component
- No separate state management library needed for this simple application

### Electron Integration
- Communication between React UI and Electron backend via preload script
- Use contextBridge and ipcRenderer for secure IPC
- Expose safe APIs through window.electronAPI object

### Styling Guidelines
- Use Tailwind CSS utility classes
- Follow design system with defined colors:
  - Primary: #0078D4
  - Secondary: #6C757D  
  - Success: #28A745
  - Error: #DC3545
- Typography: Segoe UI font family
- Follow 8px grid system

### Testing
- Use Vitest as testing framework
- React Testing Library for component testing
- Test both unit and integration scenarios

## Key Features

### Single-Screen Application
- File selection (drag & drop or button)
- Destination path selection with default to Desktop
- Real-time conversion progress display
- Cancel conversion capability
- Success feedback with "Open Folder" option
- About dialog for developer information

### User Experience Goals
- Minimal clicks required (< 1 minute to convert)
- No technical knowledge required
- Clean, intuitive interface
- WCAG 2.1 AA accessibility compliance
- Fixed-size Windows desktop application

## Distribution
- Package as single portable .exe file
- No installation process required
- Target: Windows 10/11 desktop platforms

## Current Status
This is a planning-stage project. The codebase contains comprehensive documentation (PRD, Architecture, and UX specifications) but no implementation code yet.