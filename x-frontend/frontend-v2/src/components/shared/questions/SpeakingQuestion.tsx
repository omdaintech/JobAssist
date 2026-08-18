/**
 * SpeakingQuestion - Audio Recording Component for Speaking Practice
 * 
 * @example
 * ```tsx
 * <SpeakingQuestion
 *   questionData={{
 *     audio_url: "https://...",
 *     transcript: "Bitte stellen Sie sich vor...",
 *     question: "Introduce yourself...",
 *     question_metadata: { min_answer_seconds: 15, max_answer_seconds: 45 }
 *   }}
 *   onRecordingComplete={(audioBlob, duration, s3Key) => {}}
 *   sessionId="session-123"
 *   questionId="question-456"
 *   sessionType="practice"
 * />
 * ```
 * 
 * @responsive
 * - Mobile (360-767px): Full-width controls, stacked layout
 * - Tablet (768-1023px): Wider controls
 * - Desktop (1024px+): Optimized recording interface
 * 
 * @accessibility
 * - Min touch target: 44x44px
 * - Keyboard navigation: Supported
 * - ARIA labels: Included
 */

import * as React from "react"
import { AudioPlayer, Button } from "@/components/ui"
import { cn } from "@/lib/utils"
import AudioUploadService from "@/services/audioUploadService"

export interface SpeakingSubmissionPayload {
  speaking_audio_s3_key?: string
  speaking_audio_format: string
  speaking_audio_duration_seconds: number
  upload_method: 's3' | 'pending'
  audioBlob?: Blob // Stored for upload on submit
}

export interface SpeakingQuestionProps {
  questionData: {
    audio_url?: string
    transcript?: string
    question?: string
    question_metadata?: {
      min_answer_seconds?: number
      max_answer_seconds?: number
      suggested_duration?: number
    }
  }
  onRecordingComplete?: (payload: SpeakingSubmissionPayload) => void
  sessionId?: string
  questionId?: string
  className?: string
  sessionType?: 'practice' | 'exam'
  disabled?: boolean
}

const SpeakingQuestion = React.forwardRef<HTMLDivElement, SpeakingQuestionProps>(
  ({ questionData, onRecordingComplete, sessionId, questionId, className, sessionType, disabled }, ref) => {
    // State
    const [isRecording, setIsRecording] = React.useState(false)
    const [recordedBlob, setRecordedBlob] = React.useState<Blob | null>(null)
    const [recordedUrl, setRecordedUrl] = React.useState<string | null>(null)
    const [duration, setDuration] = React.useState(0)
    const [showTranscript, setShowTranscript] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [permissionDenied, setPermissionDenied] = React.useState(false)
    const [audioLevel, setAudioLevel] = React.useState(0)
    const [isUploading, setIsUploading] = React.useState(false)
    const [uploadProgress, setUploadProgress] = React.useState<string | null>(null)

    // Refs
    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
    const audioChunksRef = React.useRef<Blob[]>([])
    const timerIntervalRef = React.useRef<NodeJS.Timeout | null>(null)
    const streamRef = React.useRef<MediaStream | null>(null)
    const audioContextRef = React.useRef<AudioContext | null>(null)
    const analyserRef = React.useRef<AnalyserNode | null>(null)
    const animationFrameRef = React.useRef<number | null>(null)
    const durationRef = React.useRef<number>(0) // Track actual recording duration

    // Duration constraints
    const minDuration = questionData.question_metadata?.min_answer_seconds || 10
    const maxDuration = questionData.question_metadata?.max_answer_seconds || 60
    const suggestedDuration = questionData.question_metadata?.suggested_duration || 30

    // Determine replay limit based on session type
    const maxReplays = sessionType === 'exam' ? 2 : undefined

    // Cleanup on unmount
    React.useEffect(() => {
      return () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
        }
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current)
        }
        if (recordedUrl) {
          URL.revokeObjectURL(recordedUrl)
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
        if (audioContextRef.current) {
          audioContextRef.current.close()
        }
      }
    }, [recordedUrl])

    // Audio visualization using Web Audio API
    const startAudioVisualization = (stream: MediaStream) => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        audioContextRef.current = audioContext

        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        analyserRef.current = analyser

        const source = audioContext.createMediaStreamSource(stream)
        source.connect(analyser)

        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        const updateAudioLevel = () => {
          if (!analyserRef.current || !isRecording) return

          analyserRef.current.getByteFrequencyData(dataArray)
          
          // Calculate average volume
          const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length
          const normalizedLevel = Math.min(average / 128, 1) // Normalize to 0-1
          
          setAudioLevel(normalizedLevel)
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
        }

        updateAudioLevel()
      } catch (err) {
        console.error('Failed to initialize audio visualization:', err)
      }
    }

    const stopAudioVisualization = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      setAudioLevel(0)
    }

    const startRecording = async () => {
      try {
        setError(null)
        setPermissionDenied(false)

        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream

        // Determine format and MIME type - prefer MP3 for audio-only
        let mimeType = 'audio/webm' // Default fallback
        if (MediaRecorder.isTypeSupported('audio/mpeg')) {
          mimeType = 'audio/mpeg' // MP3 - best for audio
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4' // MP4 - second choice
        } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus' // WebM with Opus codec
        }

        // Create MediaRecorder
        const mediaRecorder = new MediaRecorder(stream, { mimeType })
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        // Collect audio data
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        // Handle recording stop
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
          setRecordedBlob(audioBlob)

          // Create URL for playback
          const url = URL.createObjectURL(audioBlob)
          setRecordedUrl(url)

          // Stop all tracks
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
          }

          // Determine format
          const format = mimeType.includes('mpeg') || mimeType.includes('mp3')
            ? 'mp3'
            : mimeType.includes('mp4')
            ? 'mp4'
            : 'webm'
          
          // Use ref to get actual duration (avoids closure staleness)
          const actualDuration = durationRef.current
          
          // Prepare submission payload with blob reference
          // Upload will happen later when user clicks submit
          const payload: SpeakingSubmissionPayload = {
            speaking_audio_format: format,
            speaking_audio_duration_seconds: actualDuration,
            upload_method: 'pending', // Will be determined on submit
            audioBlob: audioBlob, // Store blob for later upload
          }

          // Callback with payload (upload happens on submit)
          onRecordingComplete?.(payload)
        }

        // Start recording with timeslice to collect data periodically
        mediaRecorder.start(100) // Collect data every 100ms
        setIsRecording(true)
        setDuration(0)
        durationRef.current = 0 // Reset duration ref

        // Start audio visualization
        startAudioVisualization(stream)

        // Start timer
        timerIntervalRef.current = setInterval(() => {
          setDuration(prev => {
            const newDuration = prev + 1
            durationRef.current = newDuration // Keep ref in sync
            // Auto-stop at max duration (stop immediately when reaching max)
            if (newDuration >= maxDuration) {
              // Use setTimeout to ensure state updates properly
              setTimeout(() => stopRecording(), 0)
              return maxDuration // Cap at max duration
            }
            return newDuration
          })
        }, 1000)

      } catch (err) {
        console.error('Failed to start recording:', err)
        if (err instanceof Error && err.name === 'NotAllowedError') {
          setPermissionDenied(true)
          setError('Microphone permission denied. Please allow microphone access.')
        } else {
          setError('Failed to access microphone. Please check your device settings.')
        }
      }
    }

    const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
        // Check minimum duration before stopping
        if (durationRef.current < minDuration) {
          setError(`Recording must be at least ${minDuration} seconds. Current: ${durationRef.current}s`)
          return
        }

        // Request any pending data before stopping
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.requestData()
        }
        mediaRecorderRef.current.stop()
        setIsRecording(false)
        stopAudioVisualization()

        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current)
          timerIntervalRef.current = null
        }
      }
    }

    const deleteRecording = () => {
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl)
      }
      setRecordedBlob(null)
      setRecordedUrl(null)
      setDuration(0)
      setError(null)
    }

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const getDurationColor = () => {
      if (duration < minDuration) return 'text-red-600'
      if (duration > maxDuration) return 'text-red-600'
      if (duration >= minDuration && duration <= suggestedDuration) return 'text-green-600'
      return 'text-yellow-600'
    }

    return (
      <div ref={ref} className={cn("space-y-4", className)}>
        {/* Prompt Audio Player - Simplified */}
        {questionData.audio_url && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              🎧 Question Audio {questionData.question_metadata?.suggested_duration && `(listen carefully)`}
            </p>
            <AudioPlayer
              audioUrl={questionData.audio_url}
              transcript={questionData.transcript}
              maxReplays={maxReplays}
              sessionType={sessionType}
              showTranscript={false}
              showInstructions={true}
            />
            {/* Transcript Toggle - Collapsed by default */}
            {questionData.transcript && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                  📝 Show transcript
                </summary>
                <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                  {questionData.transcript}
                </div>
              </details>
            )}
          </div>
        )}

        {/* English Translation - Hidden as per requirements */}
        {/* {questionData.question && (
          <div className="p-2 md:p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs md:text-sm text-blue-900">
              <span className="font-medium">English:</span> {questionData.question}
            </p>
          </div>
        )} */}

        {/* Recording Section */}
        <div className="space-y-4">
          {/* Duration & Quick Tip - Show before recording */}
          {!recordedBlob && !isRecording && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-700">
                💡 <span className="font-semibold">Speak clearly for {minDuration}-{maxDuration} seconds</span>
                {suggestedDuration && <span className="text-gray-600"> (aim for {suggestedDuration}s)</span>}
              </p>
            </div>
          )}
          {/* Error Messages */}
          {error && (
            <div className="p-2 md:p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs md:text-sm text-red-800">
                {error}
              </p>
              {permissionDenied && (
                <p className="text-[10px] md:text-xs text-red-700 mt-1">
                  Please enable microphone access in your browser settings and reload the page.
                </p>
              )}
            </div>
          )}

          {/* Recording Status */}
          {isRecording && (
            <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                <p className="text-sm font-medium text-red-900">
                  Recording...
                </p>
              </div>
              <div className={cn("text-lg font-bold tabular-nums", getDurationColor())}>
                {formatTime(duration)}
                <span className="text-xs font-normal text-gray-600 ml-1">/ {maxDuration}s</span>
              </div>
            </div>
          )}

          {/* Upload Status */}
          {isUploading && uploadProgress && (
            <div className="flex items-center gap-2 p-2 md:p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="w-2 h-2 md:w-3 md:h-3 bg-blue-600 rounded-full animate-spin border-2 border-blue-200 border-t-blue-600" />
              <p className="text-xs md:text-sm font-medium text-blue-900">
                {uploadProgress}
              </p>
            </div>
          )}

          {/* Record/Stop Button - Circular Design with Timer Ring */}
          {!recordedBlob && (
            <div className="flex flex-col items-center gap-4 py-6">
              {/* Audio Visualizer Bars - Around the button */}
              <div className="relative">
                {/* Visualizer bars */}
                {isRecording && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ width: '180px', height: '180px', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
                    {[...Array(12)].map((_, i) => {
                      const angle = (i * 30) * (Math.PI / 180)
                      const baseRadius = 90
                      const barLength = 15 + (audioLevel * 25)
                      const x = Math.cos(angle) * baseRadius
                      const y = Math.sin(angle) * baseRadius
                      
                      return (
                        <div
                          key={i}
                          className="absolute bg-white rounded-full transition-all duration-100"
                          style={{
                            width: '4px',
                            height: `${barLength}px`,
                            left: '50%',
                            top: '50%',
                            transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${i * 30 + 90}deg)`,
                            opacity: 0.3 + (audioLevel * 0.7),
                          }}
                        />
                      )
                    })}
                  </div>
                )}

                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={disabled || (isRecording && duration < minDuration)}
                  className={cn(
                    "relative w-32 h-32 md:w-40 md:h-40 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95",
                    "flex items-center justify-center shadow-lg",
                    (disabled || (isRecording && duration < minDuration)) && "opacity-50 cursor-not-allowed",
                    !(disabled || (isRecording && duration < minDuration)) && "cursor-pointer"
                  )}
                  style={{
                    background: isRecording 
                      ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                      : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                  }}
                >
                  {/* Animated pulse ring when recording */}
                  {isRecording && (
                    <div 
                      className="absolute inset-0 rounded-full opacity-30 bg-red-400 transition-all duration-200"
                      style={{
                        transform: `scale(${1 + audioLevel * 0.15})`
                      }}
                    />
                  )}
                  
                  {/* Timer Ring Progress */}
                  {isRecording && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle
                        cx="50%"
                        cy="50%"
                        r="45%"
                        fill="none"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="4"
                      />
                      <circle
                        cx="50%"
                        cy="50%"
                        r="45%"
                        fill="none"
                        stroke="white"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 45} ${2 * Math.PI * 45}`}
                        strokeDashoffset={2 * Math.PI * 45 * (1 - duration / maxDuration)}
                        className="transition-all duration-1000 ease-linear"
                      />
                    </svg>
                  )}

                  {/* Button Content */}
                  <div className="relative z-10 flex flex-col items-center justify-center text-white">
                    {isRecording ? (
                      <>
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-sm mb-2" />
                        <span className="text-xs md:text-sm font-semibold">STOP</span>
                        <span className="text-lg md:text-xl font-bold tabular-nums mt-1">
                          {formatTime(duration)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm md:text-base font-semibold">START</span>
                      <span className="text-xs opacity-90">Recording</span>
                    </>
                  )}
                </div>

                {/* Glow effect */}
                <div 
                  className={cn(
                    "absolute inset-0 rounded-full blur-xl transition-opacity",
                    isRecording ? "bg-red-500" : "bg-gray-400 animate-pulse"
                  )}
                  style={{ 
                    zIndex: -1,
                    opacity: isRecording ? 0.3 + (audioLevel * 0.4) : 0.6,
                    animation: !isRecording ? 'shake 2s ease-in-out infinite' : undefined
                  }}
                />
              </button>
              </div>

              {/* Add shake animation keyframes */}
              <style>{`
                @keyframes shake {
                  0%, 100% { transform: translate(0, 0); }
                  10%, 30%, 50%, 70%, 90% { transform: translate(-2px, 0); }
                  20%, 40%, 60%, 80% { transform: translate(2px, 0); }
                }
              `}</style>

              {/* Timer status text below button */}
              {isRecording && (
                <div className="text-center">
                  <p className="text-sm md:text-base font-medium text-gray-700">
                    {duration < minDuration ? (
                      <span className="text-orange-600">Keep speaking... ({minDuration - duration}s minimum)</span>
                    ) : duration >= maxDuration ? (
                      <span className="text-red-600">Maximum duration reached!</span>
                    ) : (
                      <span className="text-green-600">Recording... {maxDuration - duration}s remaining</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Playback & Controls */}
          {recordedBlob && recordedUrl && (
            <div className="space-y-3 p-3 md:p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm font-medium text-green-900">
                  ✅ Recording complete ({formatTime(duration)})
                </p>
                {duration < minDuration && (
                  <span className="text-[10px] md:text-xs text-red-600">
                    Too short (min: {minDuration}s)
                  </span>
                )}
              </div>

              {/* Audio Playback */}
              <audio
                controls
                src={recordedUrl}
                className="w-full"
                controlsList="nodownload"
              />

              {/* Re-record Button */}
              <Button
                onClick={deleteRecording}
                variant="outline"
                size="sm"
                className="w-full min-h-[44px]"
              >
                🔄 Re-record
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }
)
SpeakingQuestion.displayName = "SpeakingQuestion"

export { SpeakingQuestion }

