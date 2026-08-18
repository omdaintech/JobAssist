import React from 'react';
import { cn } from '@/lib/utils';

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;

const LEVEL_LABELS: Record<string, string> = {
  A1: 'Beginner',
  A2: 'Elementary',
  B1: 'Intermediate',
  B2: 'Upper Intermediate',
  C1: 'Advanced',
};

interface CefrLevelIndicatorProps {
  /** The user's current/result CEFR level, e.g. "B2" */
  level: string;
  /** Show the compact A1-C1 glossary + disclaimer beneath the progression bar */
  showInfo?: boolean;
  className?: string;
}

/**
 * Visual CEFR progression bar (A1 -> C1) highlighting the given level,
 * plus an optional compact level glossary and non-certification disclaimer.
 * Presentational only - does not compute or infer any score.
 */
export const CefrLevelIndicator: React.FC<CefrLevelIndicatorProps> = ({
  level,
  showInfo = true,
  className = '',
}) => {
  const normalizedLevel = (level || '').toUpperCase();
  const activeIndex = CEFR_LEVELS.indexOf(normalizedLevel as (typeof CEFR_LEVELS)[number]);

  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-4 md:p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        {CEFR_LEVELS.map((lvl, index) => {
          const isActive = index === activeIndex;
          const isPast = activeIndex >= 0 && index < activeIndex;
          return (
            <React.Fragment key={lvl}>
              <div className="flex flex-col items-center gap-1.5 min-w-[40px]">
                <div
                  className={cn(
                    'flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full text-xs md:text-sm font-bold border-2 transition-colors',
                    isActive
                      ? 'bg-eu-blue text-white border-eu-blue shadow-md'
                      : isPast
                        ? 'bg-eu-blue/10 text-eu-blue border-eu-blue/30'
                        : 'bg-gray-50 text-gray-400 border-gray-200'
                  )}
                >
                  {lvl}
                </div>
                <span
                  className={cn(
                    'text-[10px] md:text-xs font-medium',
                    isActive ? 'text-eu-blue' : 'text-gray-400'
                  )}
                >
                  {isActive ? 'Your level' : ''}
                </span>
              </div>
              {index < CEFR_LEVELS.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 rounded-full',
                    isPast || isActive ? 'bg-eu-blue/30' : 'bg-gray-200'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {showInfo && (
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-5 gap-1.5 text-center">
            {CEFR_LEVELS.map((lvl) => (
              <div key={lvl}>
                <p className="text-[11px] font-semibold text-gray-700">{lvl}</p>
                <p className="text-[10px] text-gray-500 leading-tight">{LEVEL_LABELS[lvl]}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-gray-400 text-center leading-relaxed">
            One-CEFR provides a CEFR-aligned indication of English proficiency. It is not an
            official IELTS, TOEFL, Cambridge, or government certification.
          </p>
        </div>
      )}
    </div>
  );
};

export default CefrLevelIndicator;
