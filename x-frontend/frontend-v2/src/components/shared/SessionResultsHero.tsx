/**
 * SessionResultsHero - Hero section for session results (exam/practice)
 * 
 * Features modern level badge design inspired by summary_ideation.html
 * with prominent readiness display and analysis CTA.
 * 
 * @example
 * ```tsx
 * <SessionResultsHero
 *   sessionType="exam"
 *   sessionName="Mini Read Write Exam"
 *   level="B1"
 *   language={{ name: "Spanish" }}
 *   status="completed"
 *   readinessScore={2.8}
 *   readinessLabel="Needs Support"
 *   totalQuestions={11}
 *   durationDisplay="≈ 1 min"
 *   completedDate="Oct 28, 2025, 03:32 PM"
 *   onAnalyzeNow={handleAnalyze}
 *   isAnalyzing={false}
 * />
 * ```
 * 
 * @responsive
 * - Mobile (360-767px): Vertical stacking, level badge above content
 * - Desktop (1024px+): Horizontal layout with level badge on left
 * 
 * @accessibility
 * - High contrast gradients for level badge
 * - Touch targets ≥ 44px for CTA buttons
 * - ARIA labels for screen readers
 */

import React from 'react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface SessionResultsHeroProps {
  /** Type of session */
  sessionType: 'exam' | 'practice';
  /** Display name of session */
  sessionName: string;
  /** CEFR level (A1, A2, B1, B2, C1, C2) */
  level: string;
  /** Language information */
  language?: {
    name: string;
    flagEmoji?: string;
  };
  /** Session status */
  status: 'completed' | 'analyzed';
  /** Overall readiness score (0-10) */
  readinessScore?: number | null;
  /** Readiness band label (e.g., "Needs Support", "Exam Ready") */
  readinessLabel?: string;
  /** Total questions in session */
  totalQuestions: number;
  /** Formatted duration display */
  durationDisplay: string;
  /** Formatted completion date/time */
  completedDate: string;
  /** Callback to trigger analysis */
  onAnalyzeNow?: () => void;
  /** Whether analysis is in progress */
  isAnalyzing?: boolean;
  /** Optional share callback */
  onShare?: () => void;
  /** Show share button */
  showShareButton?: boolean;
  /** For public views */
  isPublicView?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Consecutive high scores streak */
  consecutiveHighScores?: number;
}

/**
 * Get readiness display properties based on score
 */
const getReadinessDisplay = (score: number): {
  label: string;
  description: string;
  color: string;
  bgGradient: string;
  barColor: string;
} => {
  if (score >= 8) {
    return {
      label: 'Exam Ready',
      description: 'Strong across all areas',
      color: 'text-white',
      bgGradient: '#10b981',
      barColor: 'rgba(255, 255, 255, 0.9)',
    };
  } else if (score >= 6) {
    return {
      label: 'Nearly Ready',
      description: 'Minor gaps to close',
      color: 'text-white',
      bgGradient: '#0ea5e9',
      barColor: 'rgba(255, 255, 255, 0.9)',
    };
  } else if (score >= 4) {
    return {
      label: 'Almost There',
      description: 'Steady reps now rocket the score up',
      color: 'text-white',
      bgGradient: '#6366f1',
      barColor: 'rgba(255, 255, 255, 0.9)',
    };
  } else {
    return {
      label: 'Needs Support',
      description: 'Focus on building fundamentals',
      color: 'text-white',
      bgGradient: '#f97316',
      barColor: 'rgba(255, 255, 255, 0.9)',
    };
  }
};

export const SessionResultsHero: React.FC<SessionResultsHeroProps> = ({
  sessionName,
  level,
  language,
  status,
  readinessScore,
  totalQuestions: _totalQuestions,
  durationDisplay,
  completedDate,
  onAnalyzeNow,
  isAnalyzing = false,
  onShare,
  showShareButton = false,
  isPublicView = false,
  className = '',
  consecutiveHighScores = 0,
}) => {
  const navigate = useNavigate();
  const isAnalyzed = status === 'analyzed';
  const hasScore = readinessScore !== null && readinessScore !== undefined;
  
  // Score is already on 0-100 scale from backend
  const scoreValue = hasScore ? Math.max(0, Math.min(100, readinessScore)) : 0;
  const scorePercentage = scoreValue;

  // Determine engagement message based on streak
  // Note: Backend calculates streak with threshold 70.0 on 0-100 scale = 70%
  const getEngagementMessage = () => {
    if (!isAnalyzed) return null;
    
    if (consecutiveHighScores >= 3) {
      return (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-start gap-2.5">
          <span className="text-xl">🔥</span>
          <div className="flex-1">
            <p className="font-bold text-green-800 text-sm">You're on fire!</p>
            <p className="text-xs text-green-700 mt-0.5">
              {consecutiveHighScores} consecutive 70%+ scores. Ready for the next level!
            </p>
          </div>
        </div>
      );
    } else if (consecutiveHighScores > 0) {
      return (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5">
          <span className="text-xl">💪</span>
          <div className="flex-1">
            <p className="font-bold text-blue-800 text-sm">Keep it up!</p>
            <p className="text-xs text-blue-700 mt-0.5">
              {consecutiveHighScores} in a row. Get 3 consecutive 70%+ to master {level}.
            </p>
          </div>
        </div>
      );
    } else {
      return (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-start gap-2.5">
          <span className="text-xl">🎯</span>
          <div className="flex-1">
            <p className="font-bold text-gray-800 text-sm">Goal: Consistency</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Get 3 consecutive 70%+ scores to prove {level} mastery.
            </p>
          </div>
        </div>
      );
    }
  };

  // Get readiness display properties (expects 0-10 scale)
  const readinessDisplay = hasScore 
    ? getReadinessDisplay(scoreValue / 10) // Convert to 0-10 for display function
    : {
        label: 'Analysis Pending',
        description: 'Complete analysis to see readiness',
        color: 'text-white',
        bgGradient: '#9ca3af',
        barColor: 'rgba(255, 255, 255, 0.6)',
      };

  return (
    <section
      className={cn(
        'rounded-[20px] border border-indigo-500/10',
        'bg-white shadow-[0_20px_40px_rgba(15,23,42,0.08)]',
        className
      )}
    >
      <div className="p-5 md:p-6 lg:p-7">
        <div className="grid grid-cols-1 xl:grid-cols-[220px_1fr] gap-6 md:gap-8">
          {/* Level Badge - Left side (desktop) / Top (mobile) - Compact Square */}
          <div
            className={cn(
              "relative rounded-[16px] overflow-hidden p-4 text-center w-full max-w-[200px] aspect-square transition-opacity duration-300",
              !isAnalyzed && "hidden xl:block"
            )}
            style={{ background: readinessDisplay.bgGradient }}
          >
            {/* Decorative circle */}
            <div
              className="absolute w-[180px] h-[180px] rounded-full opacity-10 -top-[100px] -right-[100px]"
              style={{ background: 'rgba(255, 255, 255, 0.3)' }}
            />
            
            {/* Content */}
            <div className="relative z-10 flex flex-col justify-center h-full">
              <span className="text-[8px] tracking-[0.2em] uppercase opacity-60 text-white font-medium mb-2">
                SCORE
              </span>
              
              {/* Main Score */}
              <div className="mb-2">
                <div className="text-5xl font-extrabold text-white leading-none">
                  {isAnalyzed ? `${scorePercentage.toFixed(0)}%` : '?'}
                </div>
              </div>
              
              {/* Level */}
              <div className="text-2xl font-bold text-white/95 leading-tight mb-3">
                {level}
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
                <span
                  className="block h-full transition-all duration-700 ease-out rounded-full"
                  style={{
                    width: isAnalyzed ? `${scorePercentage}%` : '0%',
                    background: readinessDisplay.barColor,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Meta Information - Right side (desktop) / Bottom (mobile) */}
          <div className="flex flex-col justify-between gap-4 md:gap-5">
            <div>
              {/* Mobile-only status indicator when badge is hidden */}
              {!isAnalyzed && (
                <div className="xl:hidden mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-100 border border-gray-200">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200">
                    <span className="text-lg">⏳</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-700">Analysis Pending</p>
                    <p className="text-xs text-gray-600">Complete all questions to reveal results</p>
                  </div>
                </div>
              )}

              {/* Title & Share */}
              <div className="flex items-start justify-between gap-3 mb-3 md:mb-4">
                <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-[#1f2933] leading-tight">
                  {isAnalyzed ? 'Are you exam ready?' : sessionName}
                </h2>
                {showShareButton && onShare && !isPublicView && isAnalyzed && (
                  <button
                    onClick={onShare}
                    className="flex items-center justify-center min-w-[44px] min-h-[44px] w-9 h-9 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0"
                    title="Share results"
                    aria-label="Share results"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="w-5 h-5"
                    >
                      <circle cx="18" cy="5" r="3"></circle>
                      <circle cx="6" cy="12" r="3"></circle>
                      <circle cx="18" cy="19" r="3"></circle>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                  </button>
                )}
              </div>

              {/* Engagement Messages and CTA */}
              {isAnalyzed ? (
                <>
                  {getEngagementMessage()}
                  <div className="mt-4">
                    <Button
                      onClick={() => navigate(`/exam?create=true&level=${level}`)}
                      className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                    >
                      🚀 Retake Exam
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gray-100">
                    <span className="text-sm md:text-base font-semibold text-gray-700">
                      Analysis Pending
                    </span>
                  </div>
                  
                  {onAnalyzeNow && (
                    <Button
                      onClick={onAnalyzeNow}
                      disabled={isAnalyzing}
                      size="lg"
                      className="w-full sm:w-auto min-h-[48px] text-base md:text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl transition-all"
                    >
                      {isAnalyzing ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Analyzing...
                        </>
                      ) : (
                        '⚡ Readiness: Analyze Now'
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 md:gap-[18px]">
              <div className="bg-[#f0f4ff] rounded-xl p-3">
                <span className="block text-[10px] md:text-xs font-bold tracking-[0.08em] uppercase text-[#52606d] mb-1">
                  Duration
                </span>
                <p className="text-xs md:text-sm font-bold text-[#1f2933]">
                  {durationDisplay}
                </p>
              </div>
              
              <div className="bg-[#f0f4ff] rounded-xl p-3">
                <span className="block text-[10px] md:text-xs font-bold tracking-[0.08em] uppercase text-[#52606d] mb-1">
                  Language
                </span>
                <p className="text-xs md:text-sm font-bold text-[#1f2933] truncate">
                  {language?.name} · {level}
                </p>
              </div>
              
              <div className="bg-[#f0f4ff] rounded-xl p-3">
                <span className="block text-[10px] md:text-xs font-bold tracking-[0.08em] uppercase text-[#52606d] mb-1">
                  {isAnalyzed ? 'Analyzed' : 'Completed'}
                </span>
                <p className="text-xs md:text-sm font-bold text-[#1f2933]">
                  {completedDate}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
