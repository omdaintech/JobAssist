import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  CHART_COLORS,
  formatChartMonth,
  formatScore,
  CHART_CONFIG,
} from '@/utils/chartUtils';

interface MonthlyTrendData {
  month: string;
  sessions: number;
  avg_score: number;
  best_score: number;
}

interface PerformanceTrendAreaChartProps {
  data: MonthlyTrendData[];
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
    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
      <p className="text-sm font-medium text-gray-900 mb-2">
        {formatChartMonth(data.month)}
      </p>
      <div className="flex items-center justify-between gap-4 text-sm mb-1">
        <span className="text-gray-600">Sessions:</span>
        <span className="font-semibold text-gray-900">{data.sessions}</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-sm mb-1">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-gray-600">Avg Score:</span>
        </span>
        <span className="font-semibold text-blue-600">{formatScore(data.avg_score)}</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-600">Best Score:</span>
        </span>
        <span className="font-semibold text-green-600">{formatScore(data.best_score)}</span>
      </div>
    </div>
  );
};

/**
 * PerformanceTrendAreaChart - Shows monthly performance trends
 */
export const PerformanceTrendAreaChart: React.FC<PerformanceTrendAreaChartProps> = ({
  data,
  className = '',
}) => {
  if (!data || data.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <div className="text-4xl mb-3 opacity-30">📈</div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">No trend data yet</h4>
        <p className="text-xs text-gray-500 text-center max-w-xs">
          Complete more sessions over time to see your performance trends.
        </p>
      </div>
    );
  }

  // Reverse data so most recent is on the right
  const chartData = [...data].reverse();

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorBest" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray={CHART_CONFIG.grid.strokeDasharray}
            stroke={CHART_CONFIG.grid.stroke}
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tickFormatter={formatChartMonth}
            tick={CHART_CONFIG.axis.tick}
            axisLine={CHART_CONFIG.axis.axisLine}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={CHART_CONFIG.axis.tick}
            axisLine={CHART_CONFIG.axis.axisLine}
            tickLine={false}
            label={{
              value: 'Score (%)',
              angle: -90,
              position: 'insideLeft',
              style: { fill: CHART_COLORS.gray, fontSize: 12 },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
          />
          <Area
            type="monotone"
            dataKey="avg_score"
            name="Average Score"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            fill="url(#colorAvg)"
            animationDuration={CHART_CONFIG.animation.duration}
          />
          <Area
            type="monotone"
            dataKey="best_score"
            name="Best Score"
            stroke={CHART_COLORS.success}
            strokeWidth={2}
            fill="url(#colorBest)"
            animationDuration={CHART_CONFIG.animation.duration}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PerformanceTrendAreaChart;

