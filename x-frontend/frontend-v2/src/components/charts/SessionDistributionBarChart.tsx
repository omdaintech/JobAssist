import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip, Legend } from 'recharts';
import { CHART_COLORS } from '@/utils/chartUtils';

interface DayDistribution {
  day: string;
  day_num: number;
  sessions: number;
  percentage: number;
}

interface RecentActivity {
  date: string;
  session_type: string;
  sessions: number;
}

interface SessionDistributionData {
  day_distribution: DayDistribution[];
  most_active_day: string | null;
  total_sessions: number;
  recent_activity_30d: RecentActivity[];
  chart_type: string;
}

interface SessionDistributionBarChartProps {
  data: SessionDistributionData | Record<string, any>;
  platformAverage?: number; // Optional: platform average sessions per day
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
    <div className="bg-white p-3 rounded shadow-lg border border-gray-200">
      <p className="text-sm font-semibold text-gray-900 mb-2">
        {data.displayDate}
      </p>
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-600">Sessions:</span>
          <span className="font-semibold text-gray-900">{data.sessions}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-600">Date:</span>
          <span className="font-semibold text-gray-900">{data.date}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * SessionDistributionBarChart - Shows last 30 days of activity
 * Replaces the "No recent activity" empty state with meaningful data
 */
export const SessionDistributionBarChart: React.FC<SessionDistributionBarChartProps> = ({
  data,
  platformAverage,
  className = '',
}) => {
  // Get 30-day activity data
  const recentActivity = (data as SessionDistributionData)?.recent_activity_30d || [];
  const totalSessions = (data as SessionDistributionData)?.total_sessions || 0;

  // Aggregate sessions by date (sum all session types per day)
  const aggregatedData = useMemo(() => {
    const dateMap = new Map<string, number>();
    
    recentActivity.forEach(activity => {
      const currentCount = dateMap.get(activity.date) || 0;
      dateMap.set(activity.date, currentCount + activity.sessions);
    });

    // Convert to array and sort by date (oldest first for left-to-right chart)
    const result = Array.from(dateMap.entries())
      .map(([date, sessions]) => ({
        date,
        sessions,
        displayDate: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return result;
  }, [recentActivity]);

  if (!aggregatedData || aggregatedData.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-4 ${className}`}>
        <div className="text-2xl mb-2 opacity-30">📊</div>
        <p className="text-sm font-medium text-gray-700 mb-1">No session data yet</p>
        <p className="text-xs text-gray-500 text-center">
          Complete activities to see your 30-day progress
        </p>
        {platformAverage && typeof platformAverage === 'number' && (
          <p className="text-xs text-blue-600 mt-2">
            Others average {platformAverage.toFixed(1)} sessions/week
          </p>
        )}
      </div>
    );
  }

  // Get max sessions for Y-axis domain
  const maxSessions = Math.max(...aggregatedData.map(d => d.sessions));

  return (
    <div className={className}>
      <div className="mb-3">
        <p className="text-xs text-gray-500 mt-1">
          {aggregatedData.length} active day{aggregatedData.length !== 1 ? 's' : ''} 
          {totalSessions > 0 && ` • ${totalSessions} total sessions`}
        </p>
      </div>
      
      <ResponsiveContainer width="100%" height={180}>
        <BarChart 
          data={aggregatedData} 
          margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="displayDate" 
            tick={{ fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={60}
            stroke="#9ca3af"
            interval="preserveStartEnd"
          />
          <YAxis 
            tick={{ fontSize: 11 }}
            stroke="#9ca3af"
            domain={[0, Math.max(5, maxSessions + 1)]}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
          <Bar 
            dataKey="sessions" 
            fill={CHART_COLORS.primary}
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>

      {platformAverage && typeof platformAverage === 'number' && (
        <div className="mt-2 text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <span>Others average:</span>
            <span className="font-medium text-blue-600">
              {platformAverage.toFixed(1)} sessions/week
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionDistributionBarChart;

