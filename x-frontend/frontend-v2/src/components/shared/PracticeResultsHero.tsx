/**
 * PracticeResultsHero - Hero section for practice session results
 * 
 * Focuses on skill level assessment rather than exam readiness.
 * Shows if user's skills match the target CEFR level.
 * 
 * @example
 * ```tsx
 * <PracticeResultsHero
 *   sessionName="Reading Practice"
 *   activityType="reading"
 *   level="A1"
 *   language={{ name: "Spanish" }}
 *   status="completed"
 *   skillScore={6.5}
 *   totalQuestions={5}
 *   durationDisplay="≈ 3 min"
 *   completedDate="Nov 2, 2025, 03:32 PM"
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

interface PracticeResultsHeroProps {
  /** Display name of practice session */
  sessionName: string;
  /** Primary activity type (reading, writing, grammar, etc.) */
  activityType: string;
  /** Target CEFR level (A1, A2, B1, B2, C1, C2) */
  level: string;
  /** Language information */
  language?: {
    name: string;
    flagEmoji?: string;
  };
  /** Session status */
  status: 'completed' | 'analyzed';
  /** Skill score (0-10) */
  skillScore?: number | null;
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
 * Get skill level display properties based on score
 */
const getSkillLevelDisplay = (score: number, targetLevel: string): {
  label: string;
  description: string;
  message: string;
  color: string;
  bgGradient: string;
  barColor: string;
} => {
  if (score >= 8) {
    return {
      label: 'Excellent',
      description: `Strong ${targetLevel} level skills`,
      message: `Your skills are well above ${targetLevel} level. Ready to level up? Try the next level to challenge yourself!`,
      color: 'text-white',
      bgGradient: '#10b981',
      barColor: 'rgba(255, 255, 255, 0.9)',
    };
  } else if (score >= 6) {
    return {
      label: 'Good',
      description: `Solid ${targetLevel} level foundation`,
      message: `Your skills match ${targetLevel} level well. Consider trying the next level to push your boundaries!`,
      color: 'text-white',
      bgGradient: '#0ea5e9',
      barColor: 'rgba(255, 255, 255, 0.9)',
    };
  } else if (score >= 4) {
    return {
      label: 'Developing',
      description: `Approaching ${targetLevel} level`,
      message: `You're building ${targetLevel} level skills. Keep practicing at this level to strengthen your foundation.`,
      color: 'text-white',
      bgGradient: '#6366f1',
      barColor: 'rgba(255, 255, 255, 0.9)',
    };
  } else {
    return {
      label: 'Beginning',
      description: `Working toward ${targetLevel} level`,
      message: `Focus on building ${targetLevel} fundamentals first. Start with easier practice sessions.`,
      color: 'text-white',
      bgGradient: '#f97316',
      barColor: 'rgba(255, 255, 255, 0.9)',
    };
  }
};

/**
 * Format activity name for display
 */
const getActivityDisplayName = (activityType: string): string => {
  const activityNames: Record<string, string> = {
    reading: 'Reading',
    writing: 'Writing',
    grammar: 'Grammar',
    hearing: 'Hearing',
    speaking: 'Speaking',
  };
  return activityNames[activityType] || activityType;
};

export const PracticeResultsHero: React.FC<PracticeResultsHeroProps> = ({
  sessionName,
  activityType,
  level,
  language,
  status,
  skillScore,
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
  const hasScore = skillScore !== null && skillScore !== undefined;
  const scoreValue = hasScore ? Math.max(0, Math.min(100, skillScore)) : 0;
  const scorePercentage = scoreValue;

  // Get skill level display properties (now expects 0-100 scale)
  const skillDisplay = hasScore 
    ? getSkillLevelDisplay(scoreValue / 10, level) // Convert back to 0-10 for display function
    : {
        label: 'Analysis Pending',
        description: 'Awaiting skill assessment',
        message: 'Complete analysis to see your skill level.',
        color: 'text-white',
        bgGradient: '#9ca3af',
        barColor: 'rgba(255, 255, 255, 0.6)',
      };

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

  const activityName = getActivityDisplayName(activityType);

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
              "relative rounded-[16px] overflow-hidden p-4 text-center aspect-square transition-opacity duration-300",
              !isAnalyzed && "hidden xl:block"
            )}
            style={{ background: skillDisplay.bgGradient }}
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
                    background: skillDisplay.barColor,
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
              <div className="flex items-start justify-between gap-3 mb-4">
                <h2 className="text-xl lg:text-2xl font-bold text-[#1f2933] leading-tight">
                  {isAnalyzed 
                    ? (
                      <>
                        <span className="text-indigo-600">{activityName}</span> at {level}
                      </>
                    )
                    : sessionName
                  }
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

              {/* Skill Level Description */}
              {isAnalyzed ? (
                <>
                  <div className="space-y-3">
                    {getEngagementMessage()}
                    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                      <Button
                        onClick={() => navigate(`/practice?retry=true&level=${level}&activity=${activityType}`)}
                        className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                      >
                        🚀 Practice Again
                      </Button>
                      <span className="text-xs text-gray-500">
                        Keep improving your {activityName}
                      </span>
                    </div>
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
                        '⚡ Analyze Skills'
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#f0f4ff] rounded-xl p-3">
                <span className="block text-[9px] font-semibold tracking-wider uppercase text-[#52606d] mb-1">
                  Duration
                </span>
                <p className="text-sm font-bold text-[#1f2933]">
                  {durationDisplay}
                </p>
              </div>
              
              <div className="bg-[#f0f4ff] rounded-xl p-3">
                <span className="block text-[9px] font-semibold tracking-wider uppercase text-[#52606d] mb-1">
                  Language
                </span>
                <p className="text-sm font-bold text-[#1f2933] truncate">
                  {language?.name} · {level}
                </p>
              </div>
              
              <div className="bg-[#f0f4ff] rounded-xl p-3">
                <span className="block text-[9px] font-semibold tracking-wider uppercase text-[#52606d] mb-1">
                  Analyzed
                </span>
                <p className="text-sm font-bold text-[#1f2933]">
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