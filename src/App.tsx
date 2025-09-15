import { useState } from 'react'
import './App.css'

function App() {
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [outputPath, setOutputPath] = useState<string>('')

  const handleFileSelect = async () => {
    if (window.electronAPI) {
      try {
        const filePaths = await window.electronAPI.selectFile()
        if (filePaths && filePaths.length > 0) {
          setSelectedFile(filePaths[0])
        }
      } catch (error) {
        console.error('Error selecting file:', error)
      }
    }
  }

  const handleOutputSelect = async () => {
    if (window.electronAPI) {
      try {
        const filePath = await window.electronAPI.selectSaveLocation()
        if (filePath) {
          setOutputPath(filePath)
        }
      } catch (error) {
        console.error('Error selecting output location:', error)
      }
    }
  }

  const isElectron = typeof window !== 'undefined' && window.electronAPI

  return (
    <div className="app">
      <header className="app-header">
        <h1>Video Converter</h1>
        <p>Convert your videos to different formats</p>
        {isElectron && (
          <p className="electron-info">
            Running on Electron {window.electronAPI.versions.electron} 
            (Node.js {window.electronAPI.versions.node})
          </p>
        )}
      </header>

      <main className="app-main">
        <div className="file-section">
          <h2>Select Input File</h2>
          <div className="file-input">
            <button onClick={handleFileSelect} disabled={!isElectron}>
              Choose Video File
            </button>
            {selectedFile && (
              <p className="file-path">Selected: {selectedFile}</p>
            )}
          </div>
        </div>

        <div className="output-section">
          <h2>Output Location</h2>
          <div className="file-input">
            <button onClick={handleOutputSelect} disabled={!isElectron}>
              Choose Output Location
            </button>
            {outputPath && (
              <p className="file-path">Output: {outputPath}</p>
            )}
          </div>
        </div>

        <div className="convert-section">
          <h2>Conversion Settings</h2>
          <div className="settings">
            <div className="setting-group">
              <label htmlFor="format">Output Format:</label>
              <select id="format">
                <option value="mp4">MP4</option>
                <option value="avi">AVI</option>
                <option value="mov">MOV</option>
                <option value="mkv">MKV</option>
                <option value="webm">WebM</option>
              </select>
            </div>
            
            <div className="setting-group">
              <label htmlFor="quality">Quality:</label>
              <select id="quality">
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <button 
            className="convert-btn" 
            disabled={!selectedFile || !outputPath || !isElectron}
          >
            Start Conversion
          </button>
        </div>

        {!isElectron && (
          <div className="web-notice">
            <p>This application is designed to run as a desktop app with Electron.</p>
            <p>File selection and conversion features are only available in the desktop version.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
