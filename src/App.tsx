import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileVideo, FolderOpen, Settings, Play, Square, CheckCircle, AlertCircle, Info } from 'lucide-react'
import type {
  VideoFile,
  ConversionJob,
  ConversionSettings,
  ConversionQuality,
  OutputFormat
} from '../shared/types'
import { VideoFileUtils } from '../shared/types/video-file'
import type { 
  ProgressEvent, 
  CompletedEvent, 
  FailedEvent 
} from '../shared/types/ipc-contracts'

function App() {
  const [selectedFile, setSelectedFile] = useState<VideoFile | null>(null)
  const [outputPath, setOutputPath] = useState<string>('')
  const [isValidating, setIsValidating] = useState(false)
  const [activeJobs, setActiveJobs] = useState<Map<string, ConversionJob>>(new Map())
  const [conversionSettings, setConversionSettings] = useState<ConversionSettings>({
    format: 'mp4',
    quality: 'medium',
    maintainAspectRatio: true
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isElectron = typeof window !== 'undefined' && window.electronAPI

  // Setup event listeners
  useEffect(() => {
    if (!isElectron) return

    const cleanupProgress = window.electronAPI.on.conversionProgress((progress: ProgressEvent) => {
      setActiveJobs(prev => {
        const updated = new Map(prev)
        const job = updated.get(progress.jobId)
        if (job) {
          updated.set(progress.jobId, {
            ...job,
            progress: progress.progress,
            status: 'processing'
          })
        }
        return updated
      })
    })

    const cleanupComplete = window.electronAPI.on.conversionComplete((result: CompletedEvent) => {
      setActiveJobs(prev => {
        const updated = new Map(prev)
        const job = updated.get(result.jobId)
        if (job) {
          updated.set(result.jobId, {
            ...job,
            status: 'completed',
            outputPath: result.outputPath,
            progress: { 
              percentage: 100, 
              stage: 'complete', 
              currentTime: 0,
              totalTime: 0,
              speed: 0,
              bitrate: 0,
              frame: 0,
              fps: 0,
              eta: 0
            }
          })
        }
        return updated
      })
      setSuccess(`Conversion completed: ${result.outputPath}`)
    })

    const cleanupError = window.electronAPI.on.conversionError((error: FailedEvent) => {
      setActiveJobs(prev => {
        const updated = new Map(prev)
        const job = updated.get(error.jobId)
        if (job) {
          updated.set(error.jobId, {
            ...job,
            status: 'failed'
          })
        }
        return updated
      })
      setError(`Conversion failed: ${error.error}`)
    })

    return () => {
      cleanupProgress()
      cleanupComplete()
      cleanupError()
    }
  }, [isElectron])

  const handleFileSelect = useCallback(async () => {
    if (!isElectron) return

    try {
      setError(null)
      console.log('Calling electronAPI.file.select...')
      const response = await window.electronAPI.file.select({
        multiple: false,
        filters: [
          { name: 'Video Files', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv'] }
        ]
      })

      console.log('File select response:', response)

      if (response.success && response.filePaths.length > 0) {
        const filePath = response.filePaths[0]
        console.log('Selected file:', filePath)
        setIsValidating(true)

        // Validate the selected file
        const validation = await window.electronAPI.file.validate({ filePath })
        console.log('Validation response:', validation)
        
        if (validation.isValid && validation.metadata) {
          const videoFile: VideoFile = {
            id: crypto.randomUUID(),
            name: filePath.split(/[\\/]/).pop() || filePath,
            path: filePath,
            extension: '.' + (filePath.split('.').pop()?.toLowerCase() || 'unknown'),
            mimeType: VideoFileUtils.getMimeType('.' + (filePath.split('.').pop()?.toLowerCase() || 'unknown')),
            isValid: true,
            metadata: validation.metadata,
            thumbnail: validation.thumbnail,
            addedAt: new Date()
          }
          setSelectedFile(videoFile)
        } else {
          setError(validation.error || 'Invalid video file')
        }
      }
    } catch (err) {
      setError(`Failed to select file: ${err}`)
    } finally {
      setIsValidating(false)
    }
  }, [isElectron])

  const handleOutputSelect = useCallback(async () => {
    if (!isElectron || !selectedFile) return

    try {
      setError(null)
      const defaultName = selectedFile.name.replace(/\.[^/.]+$/, `.${conversionSettings.format}`)
      
      const response = await window.electronAPI.file.saveLocation({
        defaultPath: defaultName,
        filters: [
          { name: `${conversionSettings.format.toUpperCase()} Files`, extensions: [conversionSettings.format] }
        ]
      })

      if (response.success && response.filePath) {
        setOutputPath(response.filePath)
      }
    } catch (err) {
      setError(`Failed to select output location: ${err}`)
    }
  }, [isElectron, selectedFile, conversionSettings.format])

  const handleStartConversion = useCallback(async () => {
    if (!isElectron || !selectedFile || !outputPath) return

    try {
      setError(null)
      setSuccess(null)

      const response = await window.electronAPI.conversion.start({
        inputPath: selectedFile.path,
        outputPath: outputPath,
        settings: conversionSettings
      })

      if (response.success && response.jobId) {
        const job: ConversionJob = {
          id: response.jobId,
          inputFile: selectedFile,
          outputPath: outputPath,
          settings: conversionSettings,
          status: 'queued',
          progress: { 
            percentage: 0, 
            stage: 'queued',
            currentTime: 0,
            totalTime: 0,
            speed: 0,
            bitrate: 0,
            frame: 0,
            fps: 0,
            eta: 0
          },
          createdAt: new Date(),
          startedAt: new Date(),
          priority: 1,
          retryable: true,
          retryCount: 0,
          maxRetries: 3
        }

        setActiveJobs(prev => new Map(prev.set(job.id, job)))
      } else {
        setError(response.error || 'Failed to start conversion')
      }
    } catch (err) {
      setError(`Conversion error: ${err}`)
    }
  }, [isElectron, selectedFile, outputPath, conversionSettings])

  const handleCancelConversion = useCallback(async (jobId: string) => {
    if (!isElectron) return

    try {
      await window.electronAPI.conversion.cancel({ jobId })
      setActiveJobs(prev => {
        const updated = new Map(prev)
        updated.delete(jobId)
        return updated
      })
    } catch (err) {
      setError(`Failed to cancel conversion: ${err}`)
    }
  }, [isElectron])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return hrs > 0 ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}` 
                   : `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileVideo className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-semibold">Video Converter</h1>
                <p className="text-xs text-muted-foreground">
                  Convert videos to web-optimized formats
                </p>
              </div>
            </div>
            {isElectron && (
              <Badge variant="outline" className="font-mono text-xs px-2 py-1">
                v{window.electronAPI.versions.electron}
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* IPC Test Section (Debug Only) */}
        {isElectron && process.env.NODE_ENV === 'development' && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4" />
                IPC Test (Debug)
              </CardTitle>
              <CardDescription>
                Test IPC channels to validate backend connectivity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const result = await window.electronAPI.test.ping()
                      setSuccess(`Ping: ${result.message}`)
                    } catch (err) {
                      setError(`Ping failed: ${err}`)
                    }
                  }}
                >
                  Test Ping
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const result = await window.electronAPI.file.select()
                      setSuccess(`File select: ${JSON.stringify(result)}`)
                    } catch (err) {
                      setError(`File select failed: ${err}`)
                    }
                  }}
                >
                  Test File Select
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const result = await window.electronAPI.app.getSession()
                      setSuccess(`Session: ${result.session.id}`)
                    } catch (err) {
                      setError(`Get session failed: ${err}`)
                    }
                  }}
                >
                  Test Session
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const result = await window.electronAPI.app.getPreferences()
                      setSuccess(`Preferences: ${JSON.stringify(result.preferences)}`)
                    } catch (err) {
                      setError(`Get preferences failed: ${err}`)
                    }
                  }}
                >
                  Test Prefs
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-3 w-3" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert className="py-2">
            <CheckCircle className="h-3 w-3" />
            <AlertDescription className="text-xs">{success}</AlertDescription>
          </Alert>
        )}

        {/* File Selection */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileVideo className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Input Video</CardTitle>
              </div>
              <Button
                onClick={handleFileSelect}
                disabled={!isElectron || isValidating}
                size="sm"
                variant="outline"
              >
                <FolderOpen className="h-3 w-3 mr-1" />
                {isValidating ? 'Validating...' : 'Select File'}
              </Button>
            </div>
            <CardDescription className="text-xs">
              Supported: MP4, AVI, MOV, MKV, WebM, FLV
            </CardDescription>
          </CardHeader>

          {selectedFile && selectedFile.metadata && (
            <CardContent className="pt-0">
              <div className="p-3 border rounded-md bg-muted/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">{selectedFile.name}</span>
                  <Badge variant="secondary" className="text-xs">{selectedFile.extension.replace('.', '').toUpperCase()}</Badge>
                </div>
                <div className="grid grid-cols-4 gap-3 text-xs text-muted-foreground">
                  <div className="text-center">
                    <div className="font-medium">{formatFileSize(selectedFile.metadata.fileSize)}</div>
                    <div>Size</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{formatDuration(selectedFile.metadata.duration)}</div>
                    <div>Duration</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{selectedFile.metadata.width}×{selectedFile.metadata.height}</div>
                    <div>Resolution</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{Math.round(selectedFile.metadata.bitrate / 1000)}k</div>
                    <div>Bitrate</div>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Conversion Settings */}
        {selectedFile && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-base">
                <Settings className="h-4 w-4" />
                <span>Conversion Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Output Format</label>
                  <Select
                    value={conversionSettings.format}
                    onValueChange={(value: OutputFormat) => setConversionSettings(prev => ({ ...prev, format: value }))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp4">MP4 (Recommended)</SelectItem>
                      <SelectItem value="webm">WebM</SelectItem>
                      <SelectItem value="avi">AVI</SelectItem>
                      <SelectItem value="mov">MOV</SelectItem>
                      <SelectItem value="mkv">MKV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Quality</label>
                  <Select
                    value={conversionSettings.quality}
                    onValueChange={(value: ConversionQuality) => setConversionSettings(prev => ({ ...prev, quality: value }))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ultra">Ultra Quality</SelectItem>
                      <SelectItem value="high">High Quality</SelectItem>
                      <SelectItem value="medium">Medium Quality</SelectItem>
                      <SelectItem value="low">Low Quality</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleOutputSelect}
                  disabled={!isElectron}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <FolderOpen className="h-3 w-3 mr-1" />
                  Save Location
                </Button>

                <Button
                  onClick={handleStartConversion}
                  disabled={!selectedFile || !outputPath || !isElectron || activeJobs.size > 0}
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  <Play className="h-3 w-3 mr-1" />
                  Convert
                </Button>
              </div>

              {outputPath && (
                <div className="p-2 bg-muted/50 rounded text-xs font-mono break-all text-muted-foreground">
                  {outputPath}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Active Conversions */}
        {activeJobs.size > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Conversion Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from(activeJobs.values()).map((job) => (
                  <div key={job.id} className="p-3 border rounded-md space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm truncate">{job.inputFile.name}</span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {job.inputFile.extension.replace('.', '').toUpperCase()} → {job.settings.format.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <Badge
                          variant={
                            job.status === 'completed' ? 'default' :
                            job.status === 'failed' ? 'destructive' :
                            job.status === 'processing' ? 'secondary' : 'outline'
                          }
                          className="text-xs"
                        >
                          {job.status}
                        </Badge>
                        {job.status === 'processing' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelConversion(job.id)}
                            className="h-6 px-2"
                          >
                            <Square className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {job.status === 'processing' && job.progress && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{job.progress.stage}</span>
                          <span>{job.progress.percentage}%</span>
                        </div>
                        <Progress value={job.progress.percentage} className="h-1.5" />
                        {job.progress.eta > 0 && (
                          <p className="text-xs text-muted-foreground">
                            ETA: {formatDuration(job.progress.eta)}
                          </p>
                        )}
                      </div>
                    )}

                    {job.status === 'failed' && (
                      <div className="flex items-center space-x-2 text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        <span className="text-xs">Conversion failed</span>
                      </div>
                    )}

                    {job.status === 'completed' && job.outputPath && (
                      <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span className="text-xs font-medium">Completed successfully</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => isElectron && window.electronAPI.system.showInExplorer({ filePath: job.outputPath! })}
                          className="h-6 px-2 text-xs"
                        >
                          Show
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Web Notice */}
        {!isElectron && (
          <Alert className="py-2">
            <Info className="h-3 w-3" />
            <AlertDescription className="text-xs">
              Desktop version required for file operations and video conversion.
            </AlertDescription>
          </Alert>
        )}
      </main>
    </div>
  )
}

export default App
