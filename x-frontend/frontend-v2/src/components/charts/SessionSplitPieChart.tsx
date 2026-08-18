import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { COLOR_SCHEMES, formatNumber } from '@/utils/chartUtils';

interface SessionSplitData {
  practice: number;
  exam: number;
  total_sessions: number;
  practice_percentage: number;
  exam_percentage: number;
}

interface SessionSplitPieChartProps {
  data: SessionSplitData;
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
      <p className="text-sm font-medium text-gray-900 mb-2">{data.name}</p>
      <div className="flex items-center justify-between gap-4 text-sm mb-1">
        <span className="text-gray-600">Sessions:</span>
        <span className="font-semibold text-gray-900">{formatNumber(data.count)}</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-gray-600">Percentage:</span>
        <span className="font-semibold text-gray-900">{data.value}%</span>
      </div>
    </div>
  );
};

/**
 * SessionSplitPieChart - Shows practice vs exam session distribution
 */
export const SessionSplitPieChart: React.FC<SessionSplitPieChartProps> = ({
  data,
  className = '',
}) => {
  if (data.total_sessions === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <div className="text-4xl mb-3 opacity-30">📊</div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">No sessions yet</h4>
        <p className="text-xs text-gray-500 text-center max-w-xs">
          Start practicing or taking exams to see your session distribution.
        </p>
      </div>
    );
  }

  const chartData = [
    {
      name: 'Practice',
      value: data.practice_percentage,
      count: data.practice,
      color: COLOR_SCHEMES.sessionTypes.practice,
    },
    {
      name: 'Exam',
      value: data.exam_percentage,
      count: data.exam,
      color: COLOR_SCHEMES.sessionTypes.exam,
    },
  ].filter(item => item.count > 0); // Only show categories with data

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
              {formatNumber(data.total_sessions)}
            </div>
            <div className="text-xs md:text-sm text-gray-600">Total Sessions</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionSplitPieChart;

