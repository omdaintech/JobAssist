import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  getScoreColor,
  formatActivityType,
  formatScore,
  CHART_CONFIG,
} from '@/utils/chartUtils';

interface ActivityData {
  activity_type: string;
  attempts: number;
  avg_score: number;
  percentage: number;
}

interface ActivityPerformanceBarChartProps {
  data: ActivityData[];
  className?: string;
}

/**
 * Custom tooltip for activity performance
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
      <p className="text-sm font-medium text-gray-900 mb-2">
        {formatActivityType(data.activity_type)}
      </p>
      <div className="flex items-center justify-between gap-4 text-sm mb-1">
        <span className="text-gray-600">Average Score:</span>
        <span className="font-semibold text-gray-900">{formatScore(data.avg_score)}</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-sm mb-1">
        <span className="text-gray-600">Attempts:</span>
        <span className="font-semibold text-gray-900">{data.attempts}</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-gray-600">Of Total:</span>
        <span className="font-semibold text-gray-900">{data.percentage}%</span>
      </div>
    </div>
  );
};

/**
 * ActivityPerformanceBarChart - Shows activity type comparison
 */
export const ActivityPerformanceBarChart: React.FC<ActivityPerformanceBarChartProps> = ({
  data,
  className = '',
}) => {
  if (!data || data.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <div className="text-4xl mb-3 opacity-30">📊</div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">No activity data yet</h4>
        <p className="text-xs text-gray-500 text-center max-w-xs">
          Try different activity types to see your performance comparison.
        </p>
      </div>
    );
  }

  // Sort by avg_score descending
  const sortedData = [...data].sort((a, b) => b.avg_score - a.avg_score);

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray={CHART_CONFIG.grid.strokeDasharray}
            stroke={CHART_CONFIG.grid.stroke}
            horizontal={false}
          />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={CHART_CONFIG.axis.tick}
            axisLine={CHART_CONFIG.axis.axisLine}
            tickLine={false}
            label={{
              value: 'Average Score (%)',
              position: 'insideBottom',
              offset: -5,
              style: { fill: CHART_CONFIG.axis.tick.fill, fontSize: 12 },
            }}
          />
          <YAxis
            type="category"
            dataKey="activity_type"
            tick={CHART_CONFIG.axis.tick}
            axisLine={CHART_CONFIG.axis.axisLine}
            tickLine={false}
            width={100}
            tickFormatter={formatActivityType}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="avg_score"
            radius={[0, 8, 8, 0]}
            animationDuration={CHART_CONFIG.animation.duration}
          >
            {sortedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getScoreColor(entry.avg_score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Color legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>≥80%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>60-79%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span>40-59%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>&lt;40%</span>
        </div>
      </div>
    </div>
  );
};

export default ActivityPerformanceBarChart;

