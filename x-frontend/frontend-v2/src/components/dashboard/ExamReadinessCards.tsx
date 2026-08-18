import React from 'react';
import { CurrentLevelData, NextLevelData } from '@/services/api';
import { Badge, Card, CardContent, Button } from '@/components/ui';

interface ExamReadinessCardsProps {
  currentLevel: CurrentLevelData;
  nextLevel: NextLevelData | null;
  onTakeExam: (level: string) => void;
  languageName?: string;
}

/**
 * ExamReadinessCards Component
 * 
 * Displays current level performance and next level readiness in two side-by-side cards.
 * Used in the "Exam Readiness" section of the user dashboard.
 */
export const ExamReadinessCards: React.FC<ExamReadinessCardsProps> = ({
  currentLevel,
  nextLevel,
  onTakeExam,
  languageName
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
      {/* Current Level Card */}
      <Card className="border-2 border-teal-200 hover:shadow-md transition-shadow">
        <CardContent className="p-4 md:p-6">
          {/* Header */}
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 -mx-4 -mt-4 md:-mx-6 md:-mt-6 px-4 py-2 md:px-6 md:py-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="primary" size="lg" className="bg-white text-teal-700 font-bold">
                  {currentLevel.level}
                </Badge>
                <h3 className="text-white font-bold text-sm md:text-base">
                  Current Level{languageName ? ` (${languageName})` : ''}
                </h3>
              </div>
              <span className="text-white text-xs md:text-sm">{currentLevel.display_name}</span>
            </div>          {/* Stats */}
          <div className="space-y-3">
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-xs md:text-sm text-gray-600">Exams Completed</span>
              <span className="font-semibold text-sm md:text-base text-gray-900">{currentLevel.total_exams}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-xs md:text-sm text-gray-600">Avg. Score</span>
              <span className="font-semibold text-sm md:text-base text-teal-700">{currentLevel.avg_score}%</span>
            </div>
            {currentLevel.last_exam_date && (
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-xs md:text-sm text-gray-600">Last Exam</span>
                <span className="text-xs md:text-sm text-gray-700">
                  {new Date(currentLevel.last_exam_date).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
          
          {/* Action Button */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button
              onClick={() => onTakeExam(currentLevel.level)}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              Take {currentLevel.level}{languageName ? ` ${languageName}` : ''} Exam →
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Next Level Card */}
      {nextLevel ? (
        nextLevel.level === 'C1' ? (
          // Special case: C1 is "Coming Soon"
          <Card className="border-2 border-gray-300 bg-gray-50 hover:shadow-md transition-all">
            <CardContent className="p-4 md:p-6 flex flex-col items-center justify-center text-center min-h-[250px] md:min-h-[300px]">
              <div className="text-5xl md:text-6xl mb-4">🚧</div>
              <Badge variant="secondary" size="lg" className="mb-2 bg-gray-600">
                {nextLevel.level}
              </Badge>
              <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">
                {nextLevel.display_name}{languageName ? ` (${languageName})` : ''}
              </h3>
              <p className="text-xs md:text-sm text-gray-600 mb-4 max-w-xs">
                Coming soon! We're working on adding C1 level{languageName ? ` ${languageName}` : ''} content.
              </p>
              <Button
                disabled
                variant="outline"
                className="w-full max-w-xs opacity-50"
              >
                Available Soon
              </Button>
            </CardContent>
          </Card>
        ) : nextLevel.total_exams && nextLevel.total_exams > 0 ? (
          // Next level has data - show performance stats
          <Card className="border-2 border-teal-200 hover:shadow-md transition-shadow">
            <CardContent className="p-4 md:p-6">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 -mx-4 -mt-4 md:-mx-6 md:-mt-6 px-4 py-2 md:px-6 md:py-3 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="primary" size="lg" className="bg-white text-blue-700 font-bold">
                    {nextLevel.level}
                  </Badge>
                  <h3 className="text-white font-bold text-sm md:text-base">
                    Next Level{languageName ? ` (${languageName})` : ''}
                  </h3>
                </div>
                <span className="text-white text-xs md:text-sm">{nextLevel.display_name}</span>
              </div>
              
              {/* Stats */}
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-xs md:text-sm text-gray-600">Exams Completed</span>
                  <span className="font-semibold text-sm md:text-base text-gray-900">{nextLevel.total_exams}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-xs md:text-sm text-gray-600">Avg. Score</span>
                  <span className="font-semibold text-sm md:text-base text-blue-700">{nextLevel.avg_score}%</span>
                </div>
                {nextLevel.last_exam_date && (
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-xs md:text-sm text-gray-600">Last Exam</span>
                    <span className="text-xs md:text-sm text-gray-700">
                      {new Date(nextLevel.last_exam_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Take Exam Button */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => onTakeExam(nextLevel.level)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Take {nextLevel.level}{languageName ? ` ${languageName}` : ''} Exam →
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Next level has no data - encourage to take first exam
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-md transition-all">
            <CardContent className="p-4 md:p-6 flex flex-col items-center justify-center text-center min-h-[250px] md:min-h-[300px]">
              <div className="text-5xl md:text-6xl mb-4">🎯</div>
              <Badge variant="primary" size="lg" className="mb-2 bg-blue-600">
                {nextLevel.level}
              </Badge>
              <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">
                {nextLevel.display_name}{languageName ? ` (${languageName})` : ''}
              </h3>
              <p className="text-xs md:text-sm text-gray-700 mb-4 max-w-xs">
                Ready to challenge yourself? Take your first {nextLevel.level}{languageName ? ` ${languageName}` : ''} exam to see how you perform at the next level.
              </p>
              <Button
                onClick={() => onTakeExam(nextLevel.level)}
                className="w-full max-w-xs bg-blue-600 hover:bg-blue-700"
              >
                Take First {nextLevel.level}{languageName ? ` ${languageName}` : ''} Exam →
              </Button>
            </CardContent>
          </Card>
        )
      ) : (
        <Card className="border-2 border-gray-200 bg-gray-50">
          <CardContent className="p-4 md:p-6 flex flex-col items-center justify-center text-center min-h-[250px] md:min-h-[300px]">
            <div className="text-5xl md:text-6xl mb-4">🎓</div>
            <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">
              You've Reached the Top!
            </h3>
            <p className="text-xs md:text-sm text-gray-600 max-w-xs">
              You're at the highest level. Keep practicing to maintain your skills!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExamReadinessCards;
