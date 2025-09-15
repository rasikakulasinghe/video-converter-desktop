````markdown
# Desktop Video Converter Frontend Architecture Document

| Date          | Version | Description                   | Author            |
| :------------ | :------ | :---------------------------- | :---------------- |
| Aug 29, 2025  | 1.0     | Initial Architecture Document | Winston, Architect |

## Template and Framework Selection
The project will be built using the **Electron framework** to create a desktop application with modern web technologies, as specified in the PRD.

## Frontend Tech Stack

### Technology Stack Table

| Category | Technology | Version | Purpose & Rationale |
| :--- | :--- | :--- | :--- |
| **Framework** | Electron | latest LTS | The core framework for building a desktop app with web technologies, as requested. |
| **UI Library** | React | latest LTS | A powerful and popular library for building user interfaces, with excellent support within the Electron ecosystem. |
| **State Management**| React Hooks | N/A | For this simple application, React's built-in state management (`useState`, `useContext`) is sufficient and lightweight. A complex library like Redux is unnecessary. |
| **Routing** | Not Applicable | N/A | As a single-screen application, a routing library is not needed. |
| **Build Tool** | Vite | latest | A next-generation build tool that provides an extremely fast development server and optimized production builds. |
| **Styling** | Tailwind CSS | latest | A utility-first CSS framework that allows for rapid styling directly in the markup, keeping the design consistent and the codebase clean. |
| **Testing** | Vitest & React Testing Library | latest | A modern and fast testing framework (Vitest) combined with the standard for testing React components (React Testing Library). |

## Project Structure
```plaintext
/desktop-video-converter
├── electron/
│   ├── main.js         # Electron's main process entry point (handles window creation).
│   └── preload.js      # Script to securely expose Node.js APIs to the React app.
│
├── public/
│   └── icon.ico        # Application icon.
│
├── src/
│   ├── assets/         # For static assets like images or fonts.
│   ├── components/     # Reusable React components (e.g., Button, ProgressBar).
│   ├── hooks/          # Custom React hooks (if any are needed).
│   ├── styles/         # Global CSS styles.
│   └── App.jsx         # The main React application component.
│   └── main.jsx        # The React application entry point.
│
├── .gitignore          # Specifies files for Git to ignore.
├── index.html          # The HTML template for the Vite app.
├── package.json        # Project dependencies and scripts.
├── tailwind.config.js  # Configuration for Tailwind CSS.
└── vite.config.js      # Configuration for the Vite build tool.
````

## Component Standards

### Component Template

All new React components should follow this minimal template using TypeScript for props.

```typescript
import React from 'react';

interface MyComponentProps {
  title: string;
  onClick: () => void;
}

const MyComponent: React.FC<MyComponentProps> = ({ title, onClick }) => {
  return (
    <div>
      <h1>{title}</h1>
      <button onClick={onClick}>Click Me</button>
    </div>
  );
};

export default MyComponent;
```

### Naming Conventions

  * **Component Files**: `PascalCase.tsx` (e.g., `PrimaryButton.tsx`).
  * **Component Functions**: `PascalCase` (e.g., `const PrimaryButton = () => {}`).
  * **Custom Hooks**: `camelCase` and start with `use` (e.g., `useConversionStatus.ts`).

## State Management

### Store Structure

All application state will be managed within the main `App.jsx` component using React's built-in hooks. No separate 'store' folder is needed.

### State Management Template

The `useState` hook from React will be used to manage all pieces of state.

```typescript
import React, { useState } from 'react';

const App: React.FC = () => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [destinationPath, setDestinationPath] = useState<string>('');
  const [conversionStatus, setConversionStatus] = useState<string>('idle');

  return (
    <div>
      {/* UI will be built here using these state variables */}
    </div>
  );
};

export default App;
```

## API Integration

Communication between the React UI and the Electron backend will be handled securely via a preload script.

### Service Template

The `electron/preload.js` file will act as a secure bridge.

```typescript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('dialog:openFile'),
  onConversionProgress: (callback) => ipcRenderer.on('conversion:progress', callback),
  convertVideo: (sourcePath, destinationPath) => ipcRenderer.send('video:convert', { sourcePath, destinationPath }),
  cancelConversion: () => ipcRenderer.send('conversion:cancel'),
});
```

### API Client Configuration

The React application can then use the exposed functions safely.

```typescript
// Example of using the API in React code
const filePath = await window.electronAPI.selectFile();
window.electronAPI.convertVideo(filePath, 'C:\\Users\\User\\Desktop\\output.mp4');
window.electronAPI.onConversionProgress((event, { percent }) => {
  console.log(`Conversion is ${percent}% complete.`);
});
```

## Routing

As a single-screen application, a routing library and configuration are **not applicable**.

## Styling Guidelines

### Global Theme Configuration

The style guide will be enforced via `tailwind.config.js`.

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#0078D4',
        secondary: '#6C757D',
        success: '#28A745',
        error: '#DC3545',
      },
      fontFamily: {
        sans: ['Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

## Testing Requirements

### Component Test Template

Tests will use Vitest and React Testing Library.

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PrimaryButton from './PrimaryButton';

describe('PrimaryButton', () => {
  it('should render the button with the correct text', () => {
    render(<PrimaryButton>Click Me</PrimaryButton>);
    
    const buttonElement = screen.getByText(/Click Me/i);
    expect(buttonElement).toBeInTheDocument();
  });
});
```

## Environment Configuration

No custom environment variables are needed at this stage. If required in the future, they will be managed in a `.env` file at the project root.

```
```