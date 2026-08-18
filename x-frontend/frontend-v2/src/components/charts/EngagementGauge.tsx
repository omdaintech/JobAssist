import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CHART_COLORS } from '@/utils/chartUtils';

interface EngagementGaugeProps {
  score: number; // 0-100
  className?: string;
}

/**
 * Get color and label based on engagement score
 */
function getEngagementData(score: number) {
  if (score >= 70) {
    return {
      color: CHART_COLORS.success,
      label: 'Excellent',
      description: 'Keep up the great work!',
    };
  } else if (score >= 40) {
    return {
      color: CHART_COLORS.warning,
      label: 'Good',
      description: 'You\'re making progress!',
    };
  } else {
    return {
      color: CHART_COLORS.danger,
      label: 'Getting Started',
      description: 'Practice more to improve!',
    };
  }
}

/**
 * EngagementGauge - Semi-circular gauge showing engagement score
 */
export const EngagementGauge: React.FC<EngagementGaugeProps> = ({
  score,
  className = '',
}) => {
  const normalizedScore = Math.max(0, Math.min(100, score));
  const engagementData = getEngagementData(normalizedScore);

  // Create data for semi-circular gauge
  const data = [
    { value: normalizedScore, color: engagementData.color },
    { value: 100 - normalizedScore, color: CHART_COLORS.lightGray },
  ];

  return (
    <div className={`flex flex-col ${className}`}>
      <h4 className="text-sm font-medium text-gray-700 mb-2">Engagement Score</h4>
      <div className="relative">
        <ResponsiveContainer width="100%" height={150}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={90}
              paddingAngle={0}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Score label in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
          <div className="text-3xl font-bold" style={{ color: engagementData.color }}>
            {normalizedScore}
          </div>
          <div className="text-xs text-gray-600">out of 100</div>
        </div>
      </div>
      <div className="text-center mt-2">
        <div className="text-sm font-semibold" style={{ color: engagementData.color }}>
          {engagementData.label}
        </div>
        <div className="text-xs text-gray-600 mt-1">
          {engagementData.description}
        </div>
      </div>
      {/* Score breakdown */}
      <div className="mt-3 text-xs text-gray-500 space-y-1">
        <div className="flex justify-between">
          <span>Activity:</span>
          <span>40%</span>
        </div>
        <div className="flex justify-between">
          <span>Consistency:</span>
          <span>30%</span>
        </div>
        <div className="flex justify-between">
          <span>Completion:</span>
          <span>20%</span>
        </div>
        <div className="flex justify-between">
          <span>Improvement:</span>
          <span>10%</span>
        </div>
      </div>
    </div>
  );
};

export default EngagementGauge;

