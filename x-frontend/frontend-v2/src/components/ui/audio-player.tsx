import React, { useRef, useState, useEffect } from 'react';
import { Button } from './button';

export interface AudioPlayerProps {
  audioUrl: string;
  transcript?: string;
  onLoadError?: (error: Error) => void;
  onPlayComplete?: () => void;
  autoPlay?: boolean;
  showTranscript?: boolean;
  className?: string;
  maxReplays?: number; // Maximum number of times audio can be played (undefined = unlimited)
  sessionType?: 'practice' | 'exam'; // For display purposes
  showInstructions?: boolean; // Whether to show "Listen carefully" instruction (default: false for results)
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  transcript,
  onLoadError,
  onPlayComplete,
  autoPlay = false,
  showTranscript = false,
  className = '',
  maxReplays,
  sessionType,
  showInstructions = false
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1.05);
  const [playCount, setPlayCount] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadStart = () => setIsLoading(true);
    
    // Use loadedmetadata instead of canplay for better iOS support
    const handleLoadedMetadata = () => {
      setIsLoading(false);
      setDuration(audio.duration);
    };
    
    const handleCanPlay = () => setIsLoading(false);
    
    const handleError = () => {
      setHasError(true);
      setIsLoading(false);
      const error = new Error('Failed to load audio file');
      onLoadError?.(error);
    };

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      onPlayComplete?.();
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    // Try to load the audio (may not work on iOS without user interaction)
    audio.load();

    // Set initial playback rate to 1.05x
    audio.playbackRate = 1.05;

    // Set a timeout to stop loading state after 3 seconds (iOS workaround)
    // iOS often won't load metadata until user interaction
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => {
      clearTimeout(loadingTimeout);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onLoadError, onPlayComplete]);

  useEffect(() => {
    if (autoPlay && !isLoading && !hasError) {
      handlePlay();
    }
  }, [isLoading, hasError, autoPlay]);

  const handlePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        // Check if replay limit reached (only when starting to play)
        if (maxReplays !== undefined && playCount >= maxReplays) {
          return;
        }

        // On iOS, metadata might not be loaded yet. Try to load it on first play.
        if (audio.readyState < 2) {
          audio.load();
        }
        
        await audio.play();
        setIsPlaying(true);
        
        // Increment play count when audio starts playing
        setPlayCount(prev => prev + 1);
        
        // Update duration if it wasn't available before (iOS case)
        if (duration === 0 && audio.duration) {
          setDuration(audio.duration);
        }
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setHasError(true);
      onLoadError?.(error as Error);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const newVolume = parseFloat(e.target.value);
    
    if (audio) {
      audio.volume = newVolume;
      setVolume(newVolume);
    }
  };

  const handlePlaybackRateChange = (newRate: number) => {
    const audio = audioRef.current;
    
    if (audio) {
      audio.playbackRate = newRate;
      setPlaybackRate(newRate);
    }
  };

  const formatTime = (time: number): string => {
    if (!isFinite(time)) return '0:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (hasError) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center gap-2">
          <span className="text-red-600">❌</span>
          <span className="text-red-800 font-medium">Audio Load Error</span>
        </div>
        <p className="text-sm text-red-700 mt-1">
          Unable to load audio file. Please check your connection and try again.
        </p>
      </div>
    );
  }

  const isReplayLimitReached = maxReplays !== undefined && playCount >= maxReplays;
  const remainingReplays = maxReplays !== undefined ? Math.max(0, maxReplays - playCount) : undefined;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        controlsList="nodownload"
      />
      
      {/* Audio Controls */}
      <div className="flex items-center gap-4">
        {/* Play/Pause Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handlePlay}
          disabled={isLoading || isReplayLimitReached}
          className="min-w-[100px] flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
              Loading...
            </>
          ) : isReplayLimitReached ? (
            <>
              <span className="text-lg">🚫</span>
              No Replays
            </>
          ) : (
            <>
              <span className="text-lg">{isPlaying ? '⏸️' : '▶️'}</span>
              {isPlaying ? 'Pause' : 'Play'}
            </>
          )}
        </Button>

        {/* Progress Bar */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-sm text-gray-600 min-w-[35px]">
            {formatTime(currentTime)}
          </span>
          
          <div 
            className="flex-1 h-2 bg-gray-200 rounded-full cursor-pointer"
            onClick={handleSeek}
          >
            <div 
              className="h-2 bg-purple-600 rounded-full transition-all duration-100"
              style={{ 
                width: duration ? `${(currentTime / duration) * 100}%` : '0%' 
              }}
            />
          </div>
          
          <span className="text-sm text-gray-600 min-w-[35px]">
            {formatTime(duration)}
          </span>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-2">
          <span className="text-sm">🔊</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Audio Icon and Info */}
      {(showInstructions || maxReplays !== undefined) && (
        <div className="mt-3 space-y-2">
          {/* Instruction text - only show if explicitly enabled */}
          {showInstructions && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-lg">🎧</span>
              <span>Listen carefully to the audio and answer the question below.</span>
            </div>
          )}
        
        {/* Replay Counter for Exam Mode */}
        {maxReplays !== undefined && (
          <div className={`flex items-center gap-2 text-sm font-medium ${
            isReplayLimitReached 
              ? 'text-red-600' 
              : remainingReplays === 1 
                ? 'text-orange-600' 
                : 'text-blue-600'
          }`}>
            <span className="text-base">
              {isReplayLimitReached ? '🚫' : remainingReplays === 1 ? '⚠️' : 'ℹ️'}
            </span>
            <span>
              {sessionType === 'exam' && (
                <>
                  {isReplayLimitReached 
                    ? 'Audio replays exhausted' 
                    : `${remainingReplays} replay${remainingReplays !== 1 ? 's' : ''} remaining (Exam Mode)`
                  }
                </>
              )}
              {!sessionType && (
                <>
                  {isReplayLimitReached 
                    ? 'No replays remaining' 
                    : `${remainingReplays} replay${remainingReplays !== 1 ? 's' : ''} remaining`
                  }
                </>
              )}
            </span>
          </div>
        )}
        
        {/* Practice Mode Indicator */}
        {sessionType === 'practice' && maxReplays === undefined && (
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
            <span className="text-base">♾️</span>
            <span>Unlimited replays (Practice Mode)</span>
          </div>
        )}
        </div>
      )}

      {/* Optional Transcript */}
      {showTranscript && transcript && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">Transcript:</span>
          </div>
          <p className="text-sm text-gray-600">{transcript}</p>
        </div>
      )}
    </div>
  );
};
