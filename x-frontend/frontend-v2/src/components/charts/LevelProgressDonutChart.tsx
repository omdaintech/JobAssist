import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { COLOR_SCHEMES, CHART_COLORS, formatNumber } from '@/utils/chartUtils';

interface ActivityData {
  activity_type?: string;  // For activity distribution
  level?: string;          // For level distribution (kept for backward compatibility)
  attempts?: number;       // For activity distribution
  sessions_done?: number;  // For level distribution
  avg_score: number;
  percentage: number;
}

interface LevelProgressDonutChartProps {
  data: ActivityData[];
  className?: string;
}

/**
 * Custom label to show percentage
 */
const renderLabel = (entry: any) => {
  return `${entry.value}%`;
};

/**
 * Custom tooltip
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
      <p className="text-sm font-medium text-gray-900 mb-2 capitalize">{data.name}</p>
      <div className="flex items-center justify-between gap-4 text-sm mb-1">
        <span className="text-gray-600">Attempts:</span>
        <span className="font-semibold text-gray-900">{formatNumber(data.count)}</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-sm mb-1">
        <span className="text-gray-600">Avg Score:</span>
        <span className="font-semibold text-gray-900">{data.avg_score}%</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-gray-600">Percentage:</span>
        <span className="font-semibold text-gray-900">{data.value}%</span>
      </div>
    </div>
  );
};

/**
 * LevelProgressDonutChart - Shows CEFR level distribution
 */
export const LevelProgressDonutChart: React.FC<LevelProgressDonutChartProps> = ({
  data,
  className = '',
}) => {
  if (!data || data.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <div className="text-4xl mb-3 opacity-30">📊</div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">No activity data yet</h4>
        <p className="text-xs text-gray-500 text-center max-w-xs">
          Complete different activities to see your distribution.
        </p>
      </div>
    );
  }

  // Check if we're displaying activity or level data
  const isActivityData = data[0]?.activity_type !== undefined;
  
  // Calculate total
  const totalCount = data.reduce((sum, item) => {
    return sum + (item.attempts || item.sessions_done || 0);
  }, 0);

  // Activity colors
  const activityColors: Record<string, string> = {
    writing: '#3b82f6',    // blue
    reading: '#10b981',    // green
    grammar: '#f59e0b',    // amber
    hearing: '#8b5cf6',    // purple
  };

  const chartData = data.map(item => ({
    name: item.activity_type || item.level || 'Unknown',
    value: item.percentage,
    count: item.attempts || item.sessions_done || 0,
    avg_score: item.avg_score,
    color: isActivityData 
      ? activityColors[item.activity_type?.toLowerCase() || ''] || CHART_COLORS.gray
      : COLOR_SCHEMES.levels[item.level as keyof typeof COLOR_SCHEMES.levels] || CHART_COLORS.gray,
  }));

  return (
    <div className={className}>
      <div className="relative">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              outerRadius={100}
              innerRadius={60}
              fill="#8884d8"
              dataKey="value"
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry: any) => {
                const item = chartData.find(d => d.name === value);
                return `${value} (${item?.count || 0})`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label showing total */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-gray-900">
              {formatNumber(totalCount)}
            </div>
            <div className="text-xs md:text-sm text-gray-600">Total Attempts</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelProgressDonutChart;

