import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  CHART_COLORS,
  formatChartDate,
  formatScore,
} from '@/utils/chartUtils';

interface WeekData {
  year_week: number;
  week_start: string;
  reading?: number | null;
  writing?: number | null;
  grammar?: number | null;
  hearing?: number | null;
}

interface WeeklyActivityTrendsData {
  weeks: WeekData[];
  activity_types?: string[];
  chart_type?: string;
}

interface WeeklyScoreLineChartProps {
  data: WeeklyActivityTrendsData | WeekData[];
  platformAverage?: number;
  className?: string;
}

// Activity colors mapping - distinct and vibrant
const ACTIVITY_COLORS = {
  reading: '#10b981',    // Green
  writing: '#3b82f6',    // Blue
  grammar: '#f59e0b',    // Orange
  hearing: '#ec4899',    // Pink (changed from purple for better distinction)
};

const ACTIVITY_LABELS = {
  reading: '📖 Reading',
  writing: '📝 Writing',
  grammar: '📚 Grammar',
  hearing: '🎧 Listening',
};

/**
 * Custom tooltip for multi-line activity trends
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
      <p className="text-sm font-semibold text-gray-900 mb-2">
        Week of {formatChartDate(data.week_start)}
      </p>
      <div className="space-y-1 text-xs">
        {['reading', 'writing', 'grammar', 'hearing'].map((activity) => {
          const score = data[activity];
          if (score !== null && score !== undefined) {
            return (
              <div key={activity} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: ACTIVITY_COLORS[activity as keyof typeof ACTIVITY_COLORS] }}
                  />
                  <span className="text-gray-600 capitalize">{activity}:</span>
                </div>
                <span className="font-semibold text-gray-900">{formatScore(score)}</span>
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};

/**
 * WeeklyScoreLineChart - Shows weekly activity trends with 4 lines (reading, writing, grammar, hearing)
 */
export const WeeklyScoreLineChart: React.FC<WeeklyScoreLineChartProps> = ({
  data,
  platformAverage,
  className = '',
}) => {
  // Handle both old and new data formats
  const weeksData = Array.isArray(data) ? data : (data as WeeklyActivityTrendsData)?.weeks || [];
  
  // Check if data is empty
  if (!weeksData || weeksData.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <div className="text-4xl mb-3 opacity-30">📈</div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">No activity data yet</h4>
        <p className="text-xs text-gray-500 text-center max-w-xs">
          Complete some sessions to see your activity trends over time.
        </p>
        {platformAverage && typeof platformAverage === 'number' && platformAverage > 0 && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200 max-w-xs">
            <p className="text-xs text-blue-700 text-center">
              💡 Others at your level averaged <span className="font-semibold">{platformAverage.toFixed(1)}%</span> in their first sessions
            </p>
            <p className="text-xs text-blue-600 text-center mt-1">
              Start practicing to see how you compare!
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={weeksData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="week_start"
            tickFormatter={(value) => formatChartDate(value)}
            tick={{ fontSize: 11 }}
            stroke="#9ca3af"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => `${value}%`}
            stroke="#9ca3af"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
            iconType="line"
            formatter={(value) => ACTIVITY_LABELS[value as keyof typeof ACTIVITY_LABELS] || value}
          />

          {/* Platform average reference line */}
          {platformAverage && typeof platformAverage === 'number' && platformAverage > 0 && (
            <ReferenceLine
              y={platformAverage}
              stroke={CHART_COLORS.gray}
              strokeDasharray="5 5"
              strokeWidth={1.5}
              label={{
                value: `Platform: ${platformAverage.toFixed(1)}%`,
                position: 'right',
                fill: CHART_COLORS.gray,
                fontSize: 10,
              }}
            />
          )}

          {/* Activity lines - connect dots even with gaps */}
          <Line
            type="monotone"
            dataKey="reading"
            name="reading"
            stroke={ACTIVITY_COLORS.reading}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
            connectNulls={true}
          />
          <Line
            type="monotone"
            dataKey="writing"
            name="writing"
            stroke={ACTIVITY_COLORS.writing}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
            connectNulls={true}
          />
          <Line
            type="monotone"
            dataKey="grammar"
            name="grammar"
            stroke={ACTIVITY_COLORS.grammar}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
            connectNulls={true}
          />
          <Line
            type="monotone"
            dataKey="hearing"
            name="hearing"
            stroke={ACTIVITY_COLORS.hearing}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
            connectNulls={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeeklyScoreLineChart;
