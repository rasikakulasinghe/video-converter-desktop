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
        
        if (validation.isValid) {
          const videoFile: VideoFile = {
            id: crypto.randomUUID(),
            name: filePath.split(/[\\/]/).pop() || filePath,
            path: filePath,
            extension: '.' + (validation.metadata?.format || 'unknown'),
            mimeType: `video/${validation.metadata?.format || 'unknown'}`,
            isValid: true,
            metadata: {
              duration: validation.metadata?.duration || 0,
              width: validation.metadata?.resolution?.width || 0,
              height: validation.metadata?.resolution?.height || 0,
              frameRate: validation.metadata?.frameRate || 0,
              bitrate: validation.metadata?.bitrate || 0,
              codec: validation.metadata?.videoCodec || 'unknown',
              audioCodec: validation.metadata?.audioCodec,
              fileSize: validation.metadata?.size || 0,
              createdAt: new Date(),
              modifiedAt: new Date()
            },
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
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileVideo className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Video Converter</h1>
                <p className="text-sm text-muted-foreground">
                  Convert your videos to web-optimized formats
                </p>
              </div>
            </div>
            {isElectron && (
              <Badge variant="outline" className="font-mono text-xs">
                Electron {window.electronAPI.versions.electron}
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* File Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileVideo className="h-5 w-5" />
              <span>Select Video File</span>
            </CardTitle>
            <CardDescription>
              Choose a video file to convert. Supported formats: MP4, AVI, MOV, MKV, WebM, FLV
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleFileSelect} 
              disabled={!isElectron || isValidating}
              className="w-full sm:w-auto"
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              {isValidating ? 'Validating...' : 'Choose Video File'}
            </Button>

            {selectedFile && selectedFile.metadata && (
              <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{selectedFile.name}</h4>
                  <Badge variant="secondary">{selectedFile.extension.replace('.', '').toUpperCase()}</Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Size:</span> {formatFileSize(selectedFile.metadata.fileSize)}
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span> {formatDuration(selectedFile.metadata.duration)}
                  </div>
                  <div>
                    <span className="font-medium">Resolution:</span> {selectedFile.metadata.width}x{selectedFile.metadata.height}
                  </div>
                  <div>
                    <span className="font-medium">Bitrate:</span> {Math.round(selectedFile.metadata.bitrate / 1000)}k
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversion Settings */}
        {selectedFile && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Conversion Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Output Format</label>
                  <Select 
                    value={conversionSettings.format} 
                    onValueChange={(value: OutputFormat) => setConversionSettings(prev => ({ ...prev, format: value }))}
                  >
                    <SelectTrigger>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Quality</label>
                  <Select 
                    value={conversionSettings.quality} 
                    onValueChange={(value: ConversionQuality) => setConversionSettings(prev => ({ ...prev, quality: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High Quality</SelectItem>
                      <SelectItem value="medium">Medium Quality</SelectItem>
                      <SelectItem value="low">Low Quality</SelectItem>
                      <SelectItem value="ultra">Ultra Quality</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Button 
                  onClick={handleOutputSelect} 
                  disabled={!isElectron}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Choose Save Location
                </Button>

                {outputPath && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-mono break-all">{outputPath}</p>
                  </div>
                )}

                <Button 
                  onClick={handleStartConversion}
                  disabled={!selectedFile || !outputPath || !isElectron || activeJobs.size > 0}
                  className="w-full sm:w-auto"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Conversion
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Conversions */}
        {activeJobs.size > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Active Conversions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from(activeJobs.values()).map((job) => (
                  <div key={job.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{job.inputFile.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {job.inputFile.extension.replace('.', '').toUpperCase()} → {job.settings.format.toUpperCase()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={
                            job.status === 'completed' ? 'default' :
                            job.status === 'failed' ? 'destructive' :
                            job.status === 'processing' ? 'secondary' : 'outline'
                          }
                        >
                          {job.status}
                        </Badge>
                        {job.status === 'processing' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleCancelConversion(job.id)}
                          >
                            <Square className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>

                    {job.status === 'processing' && job.progress && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress: {job.progress.stage}</span>
                          <span>{job.progress.percentage}%</span>
                        </div>
                        <Progress value={job.progress.percentage} className="h-2" />
                        {job.progress.eta > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Estimated time remaining: {formatDuration(job.progress.eta)}
                          </p>
                        )}
                      </div>
                    )}

                    {job.status === 'failed' && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>Conversion failed</AlertDescription>
                      </Alert>
                    )}

                    {job.status === 'completed' && job.outputPath && (
                      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">Conversion completed!</span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => isElectron && window.electronAPI.system.showInExplorer({ filePath: job.outputPath! })}
                        >
                          Show in Folder
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
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This application requires the desktop version to access file system operations and video conversion features.
            </AlertDescription>
          </Alert>
        )}
      </main>
    </div>
  )
}

export default App
