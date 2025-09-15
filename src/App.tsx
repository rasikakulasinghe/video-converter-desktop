import { useState } from 'react'

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
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-segoe">
      {/* Windows-style title bar area */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-semibold text-primary">Video Converter</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Convert your videos to web-optimized MP4 format</p>
        {isElectron && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 font-mono">
            Electron {window.electronAPI.versions.electron} • Node.js {window.electronAPI.versions.node}
          </p>
        )}
      </header>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {/* File Selection Section */}
        <section className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Input Video File</h2>
          <div className="space-y-3">
            <button
              onClick={handleFileSelect}
              disabled={!isElectron}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              📁 Choose Video File
            </button>
            {selectedFile && (
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono break-all p-3 bg-gray-100 dark:bg-gray-700 rounded border">
                📄 {selectedFile}
              </p>
            )}
          </div>
        </section>

        {/* Output Location Section */}
        <section className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Output Location</h2>
          <div className="space-y-3">
            <button
              onClick={handleOutputSelect}
              disabled={!isElectron}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              💾 Choose Save Location
            </button>
            {outputPath && (
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono break-all p-3 bg-gray-100 dark:bg-gray-700 rounded border">
                📁 {outputPath}
              </p>
            )}
          </div>
        </section>

        {/* Conversion Settings */}
        <section className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Conversion Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <label htmlFor="format" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Output Format:
              </label>
              <select
                id="format"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="mp4">MP4 (Recommended)</option>
                <option value="avi">AVI</option>
                <option value="mov">MOV</option>
                <option value="mkv">MKV</option>
                <option value="webm">WebM</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="quality" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Quality:
              </label>
              <select
                id="quality"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="high">High Quality</option>
                <option value="medium">Medium Quality</option>
                <option value="low">Low Quality</option>
              </select>
            </div>
          </div>

          <button
            disabled={!selectedFile || !outputPath || !isElectron}
            className="w-full md:w-auto px-8 py-3 bg-success hover:bg-green-600 text-white rounded-md font-semibold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-success focus:ring-offset-2"
          >
            🎬 Start Conversion
          </button>
        </section>

        {/* Web Notice */}
        {!isElectron && (
          <section className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <div className="text-yellow-600 dark:text-yellow-400 text-xl">⚠️</div>
              <div className="space-y-1">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Desktop App Required
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  This application is designed to run as a desktop app with Electron. File selection and conversion features are only available in the desktop version.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
