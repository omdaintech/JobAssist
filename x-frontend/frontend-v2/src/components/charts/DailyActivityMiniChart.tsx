import React from 'react';
import { BarChart, Bar, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { CHART_COLORS, formatChartDate } from '@/utils/chartUtils';

interface DayData {
  activity_date: string;
  sessions_done: number;
  practice_sessions: number;
  exam_sessions: number;
}

interface DailyActivityMiniChartProps {
  data: DayData[];
  className?: string;
}

/**
 * Custom tooltip
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-white p-2 rounded shadow-lg border border-gray-200">
      <p className="text-xs font-medium text-gray-900 mb-1">
        {formatChartDate(data.activity_date)}
      </p>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-gray-600">Sessions:</span>
        <span className="font-semibold text-gray-900">{data.sessions_done}</span>
      </div>
    </div>
  );
};

/**
 * DailyActivityMiniChart - Compact sparkline showing last 7 days
 */
export const DailyActivityMiniChart: React.FC<DailyActivityMiniChartProps> = ({
  data,
  className = '',
}) => {
  if (!data || data.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-4 ${className}`}>
        <div className="text-2xl mb-2 opacity-30">📅</div>
        <p className="text-xs text-gray-500 text-center">No recent activity</p>
      </div>
    );
  }

  // Get today's date for highlighting
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className={className}>
      <h4 className="text-sm font-medium text-gray-700 mb-2">Last 7 Days</h4>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <Bar dataKey="sessions_done" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => {
              const isToday = entry.activity_date === today;
              const color = isToday ? CHART_COLORS.success : CHART_COLORS.primary;
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
        <span>{data.length} days</span>
        <span>Today: {data.find(d => d.activity_date === today)?.sessions_done || 0}</span>
      </div>
    </div>
  );
};

export default DailyActivityMiniChart;

