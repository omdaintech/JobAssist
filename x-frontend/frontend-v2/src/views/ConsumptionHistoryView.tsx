import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, ErrorDisplay, LoadingState } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { extractErrorMessage, formatDate } from '@/utils/frontend-utils';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface UsageHistoryItem {
  id: string;
  user_id: string;
  session_type: 'practice' | 'exam';
  activity_type: 'reading' | 'writing' | 'grammar' | 'hearing' | 'full_exam';
  level: 'A1' | 'A2' | 'B1';
  points_deducted: number;
  timestamp: string;
  session_id?: string;
  description?: string;
}

interface FilterState {
  sessionType: string;
  startDate: string;
  endDate: string;
  limit: number;
  skip: number;
}

const SESSION_TYPE_OPTIONS = [
  { value: 'all', label: 'All Sessions', icon: '📋' },
  { value: 'practice', label: 'Practice', icon: '📚' },
  { value: 'exam', label: 'Exams', icon: '📝' },
];

const RANGE_OPTIONS = [
  { value: 'cycle', label: 'Current Billing Cycle', icon: '🗓️' },
  { value: 'last30', label: 'Last 30 Days', icon: '📆' },
  { value: 'custom', label: 'Custom Range', icon: '🛠️' },
];

export const ConsumptionHistoryView: React.FC = () => {
  const { isAuthenticated, usageInfo } = useAuth();
  const navigate = useNavigate();

  const [selectedRange, setSelectedRange] = useState<string>('cycle');

  const [usageHistory, setUsageHistory] = useState<UsageHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    sessionType: 'all',
    startDate: '',
    endDate: '',
    limit: 50,
    skip: 0,
  });
  const [customRange, setCustomRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const initializedFiltersRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated || initializedFiltersRef.current) {
      return;
    }

    const cycleEnd = usageInfo?.reset_at ? new Date(usageInfo.reset_at) : null;
    const defaultEnd = cycleEnd ?? new Date();
    const defaultStart = new Date(defaultEnd);
    defaultStart.setDate(defaultStart.getDate() - 30);

    const startISO = defaultStart.toISOString().split('T')[0];
    const endISO = defaultEnd.toISOString().split('T')[0];

    setSelectedRange(cycleEnd ? 'cycle' : 'last30');
    setFilters((prev) => ({
      ...prev,
      startDate: startISO,
      endDate: endISO,
      skip: 0,
    }));
    initializedFiltersRef.current = true;
  }, [isAuthenticated, usageInfo]);

  const loadUsageHistory = async (params: Record<string, string | number>) => {
    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const response = await api.user.usageHistory(params);
      if (response.data.success) {
        setUsageHistory(response.data.data.history);
      } else {
        setHistoryError(response.data.message || 'Unable to load billing events');
      }
    } catch (error) {
      setHistoryError(extractErrorMessage(error as any));
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const params: Record<string, string | number> = {
      limit: filters.limit,
      skip: filters.skip,
    };
    if (filters.sessionType !== 'all') params.sessionType = filters.sessionType;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;

    loadUsageHistory(params).catch((err) => {
      console.error('Failed to load usage history', err);
    });
  }, [filters, isAuthenticated]);

  const computeRangeDates = (range: string) => {
    const now = new Date();

    if (range === 'cycle' && usageInfo?.reset_at) {
      const end = new Date(usageInfo.reset_at);
      const start = new Date(end);
      start.setMonth(start.getMonth() - 1);

      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      };
    }

    if (range === 'last30') {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);

      return {
        start: start.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
      };
    }

    return null;
  };

  const handleRangeSelection = (range: string) => {
    setSelectedRange(range);

    if (range === 'custom') {
      return;
    }

    const dates = computeRangeDates(range);

    if (!dates) {
      return;
    }

    setFilters((prev) => ({
      ...prev,
      startDate: dates.start,
      endDate: dates.end,
      skip: 0,
    }));
  };

  const handleCustomRangeApply = () => {
    if (!customRange.start || !customRange.end) return;
    setSelectedRange('custom');
    setFilters((prev) => ({
      ...prev,
      startDate: customRange.start,
      endDate: customRange.end,
      skip: 0,
    }));
  };

  const handleSessionTypeChange = (sessionType: string) => {
    setFilters((prev) => ({ ...prev, sessionType, skip: 0 }));
  };

  const getSessionTypeBadge = (sessionType: string) => {
    const colors: Record<string, string> = {
      practice: 'bg-green-100 text-green-800 border border-green-200',
      exam: 'bg-blue-100 text-blue-800 border border-blue-200',
    };
    return colors[sessionType] || 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  if (!isAuthenticated) {
    return <LoadingState message="Checking authentication..." />;
  }

  const usageSummary = useMemo(() => {
    if (usageHistory.length === 0) {
      return {
        totalCredits: 0,
        totalSessions: 0,
        averageCredits: 0,
        bySessionType: {} as Record<string, { session_count: number; credits_used: number }>,
        byActivityType: {} as Record<string, { session_count: number; credits_used: number }>,
      };
    }

    const summary = usageHistory.reduce(
      (acc, item) => {
        acc.totalCredits += item.points_deducted;
        acc.totalSessions += 1;

        if (!acc.bySessionType[item.session_type]) {
          acc.bySessionType[item.session_type] = { session_count: 0, credits_used: 0 };
        }

        acc.bySessionType[item.session_type].session_count += 1;
        acc.bySessionType[item.session_type].credits_used += item.points_deducted;

        const activityKey = item.activity_type;

        if (!acc.byActivityType[activityKey]) {
          acc.byActivityType[activityKey] = { session_count: 0, credits_used: 0 };
        }

        acc.byActivityType[activityKey].session_count += 1;
        acc.byActivityType[activityKey].credits_used += item.points_deducted;

        return acc;
      },
      {
        totalCredits: 0,
        totalSessions: 0,
        averageCredits: 0,
        bySessionType: {} as Record<string, { session_count: number; credits_used: number }>,
        byActivityType: {} as Record<string, { session_count: number; credits_used: number }>,
      }
    );

    summary.averageCredits = summary.totalSessions > 0 ? summary.totalCredits / summary.totalSessions : 0;

    return summary;
  }, [usageHistory]);

  const formattedRange = useMemo(() => {
    if (!filters.startDate && !filters.endDate) {
      return null;
    }

    const start = filters.startDate ? formatDate(filters.startDate) : '—';
    const end = filters.endDate ? formatDate(filters.endDate) : '—';

    return `${start} - ${end}`;
  }, [filters.endDate, filters.startDate]);

  const rangeOptions = useMemo(
    () =>
      RANGE_OPTIONS.map((option) => ({
        ...option,
        disabled: option.value === 'cycle' && !usageInfo?.reset_at,
      })),
    [usageInfo?.reset_at]
  );

  return (
    <PageContainer>
      <div className="app-content-container app-page-stack py-3 md:py-4 lg:py-6">
        {/* Page Header */}
        <section className="space-y-2 md:space-y-3">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">Billing Usage</h1>
          <p className="text-sm md:text-base text-gray-600">
            Review credit consumption and billing events across your school.
          </p>
        </section>

        {/* Filters and Range Selection */}
        <section>
          <Card>
            <CardContent>
              {/* Range Selection Buttons */}
              <div className="flex flex-wrap gap-2">
                {rangeOptions.map(({ value, label, icon, disabled }) => (
                  <button
                    key={value}
                    onClick={() => !disabled && handleRangeSelection(value)}
                    disabled={disabled}
                    className={`inline-flex items-center gap-2 rounded-md px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition ${
                      selectedRange === value
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    } ${disabled ? 'cursor-not-allowed opacity-60 hover:bg-white hover:text-gray-600' : ''}`}
                  >
                    <span className="text-sm md:text-base">{icon}</span>
                    <span className="hidden xs:inline">{label}</span>
                    <span className="xs:hidden">{icon}</span>
                  </button>
                ))}
              </div>

              {/* Custom Date Range */}
              {selectedRange === 'custom' && (
                <div className="mt-3 md:mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                  <div>
                    <label className="text-xs md:text-sm font-medium text-gray-700">Start Date</label>
                    <input
                      type="date"
                      value={customRange.start}
                      onChange={(e) => setCustomRange((prev) => ({ ...prev, start: e.target.value }))}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-2 md:px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs md:text-sm font-medium text-gray-700">End Date</label>
                    <input
                      type="date"
                      value={customRange.end}
                      onChange={(e) => setCustomRange((prev) => ({ ...prev, end: e.target.value }))}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-2 md:px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleCustomRangeApply}
                      className="w-full rounded-md bg-blue-600 px-3 md:px-4 py-2 text-sm text-white font-medium hover:bg-blue-700"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}

              {/* Range Info */}
              <div className="mt-3 md:mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-700">Showing billing events</p>
                  {formattedRange && (
                    <p className="text-[10px] md:text-xs text-gray-500">{formattedRange}</p>
                  )}
                </div>
                {usageInfo?.plan_type && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] md:text-xs font-medium text-blue-700 w-fit">
                    Plan: {usageInfo.plan_type}
                  </span>
                )}
              </div>

              {historyLoading ? (
                <LoadingState message="Loading usage summary..." />
              ) : historyError ? (
                <ErrorDisplay message={historyError} />
              ) : (
                <>
                  {/* Summary Stats - 2 cols mobile, 3 cols tablet, 4 desktop */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
                    <div className="rounded-lg border border-gray-200 bg-white p-3 md:p-4 shadow-sm">
                      <p className="text-[10px] md:text-xs font-medium uppercase tracking-wide text-gray-500">Total Credits Used</p>
                      <p className="mt-2 md:mt-3 text-lg md:text-2xl font-semibold text-gray-900">{usageSummary.totalCredits.toLocaleString()}</p>
                      <p className="mt-1 text-[10px] md:text-xs text-gray-500">Based on filtered billing events</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-3 md:p-4 shadow-sm">
                      <p className="text-[10px] md:text-xs font-medium uppercase tracking-wide text-gray-500">Total Sessions</p>
                      <p className="mt-2 md:mt-3 text-lg md:text-2xl font-semibold text-gray-900">{usageSummary.totalSessions.toLocaleString()}</p>
                      <p className="mt-1 text-[10px] md:text-xs text-gray-500">Practice and exam sessions combined</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-3 md:p-4 shadow-sm">
                      <p className="text-[10px] md:text-xs font-medium uppercase tracking-wide text-gray-500">Average Credits / Session</p>
                      <p className="mt-2 md:mt-3 text-lg md:text-2xl font-semibold text-gray-900">{usageSummary.averageCredits.toFixed(2)}</p>
                      <p className="mt-1 text-[10px] md:text-xs text-gray-500">Reflects current filters</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-3 md:p-4 shadow-sm col-span-2 sm:col-span-1">
                      <p className="text-[10px] md:text-xs font-medium uppercase tracking-wide text-gray-500">Credits Remaining</p>
                      <p className="mt-2 md:mt-3 text-lg md:text-2xl font-semibold text-gray-900">{usageInfo?.remaining_count?.toLocaleString?.() ?? '—'}</p>
                      <p className="mt-1 text-[10px] md:text-xs text-gray-500">Reset {usageInfo?.reset_at ? `on ${new Date(usageInfo.reset_at).toLocaleDateString()}` : 'schedule not available'}</p>
                    </div>
                  </div>

                  {/* Session/Activity Breakdown - 1 col mobile, 2 cols tablet+ */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <Card>
                      <CardContent>
                        <div className="mb-3 md:mb-4">
                          <h3 className="text-xs md:text-sm font-semibold text-gray-700">By session type</h3>
                          <p className="text-[10px] md:text-xs text-gray-500">Compare how practice and exam sessions consume credits.</p>
                        </div>
                        <dl className="space-y-2 text-xs md:text-sm text-gray-700">
                          {Object.entries(usageSummary.bySessionType).length === 0 ? (
                            <p className="text-[10px] md:text-xs text-gray-500">No events in the selected range.</p>
                          ) : (
                            Object.entries(usageSummary.bySessionType).map(([key, bucket]) => (
                              <div key={key} className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 md:px-3 py-2">
                                <dt className="capitalize text-gray-700 text-xs md:text-sm">{key}</dt>
                                <dd className="text-right text-gray-600 text-xs md:text-sm">
                                  <span className="font-semibold text-gray-900">{bucket.session_count}</span> sessions ·{' '}
                                  <span className="font-semibold text-gray-900">{bucket.credits_used}</span> credits
                                </dd>
                              </div>
                            ))
                          )}
                        </dl>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent>
                        <div className="mb-3 md:mb-4">
                          <h3 className="text-xs md:text-sm font-semibold text-gray-700">By activity type</h3>
                          <p className="text-[10px] md:text-xs text-gray-500">See which activities drive credit usage the most.</p>
                        </div>
                        <dl className="space-y-2 text-xs md:text-sm text-gray-700">
                          {Object.entries(usageSummary.byActivityType).length === 0 ? (
                            <p className="text-[10px] md:text-xs text-gray-500">No activity data for this period.</p>
                          ) : (
                            Object.entries(usageSummary.byActivityType).map(([key, bucket]) => (
                              <div key={key} className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 md:px-3 py-2">
                                <dt className="capitalize text-gray-700 text-xs md:text-sm">{key.replace(/_/g, ' ')}</dt>
                                <dd className="text-right text-gray-600 text-xs md:text-sm">
                                  <span className="font-semibold text-gray-900">{bucket.session_count}</span> sessions ·{' '}
                                  <span className="font-semibold text-gray-900">{bucket.credits_used}</span> credits
                                </dd>
                              </div>
                            ))
                          )}
                        </dl>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Billing Events Table */}
        <section>
          <Card>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 md:mb-4">
                <div>
                  <h2 className="text-base md:text-lg font-semibold text-gray-900">Billing events</h2>
                  <p className="text-xs md:text-sm text-gray-600">
                    Detailed list of credit deductions for the selected period.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SESSION_TYPE_OPTIONS.map(({ value, label, icon }) => (
                    <button
                      key={value}
                      onClick={() => handleSessionTypeChange(value)}
                      className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs md:text-sm transition ${
                        filters.sessionType === value
                          ? 'bg-blue-600 text-white shadow'
                          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <span>{icon}</span>
                      <span className="hidden xs:inline">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {historyLoading ? (
                <LoadingState message="Loading billing events..." />
              ) : historyError ? (
                <ErrorDisplay message={historyError} />
              ) : usageHistory.length === 0 ? (
                <p className="text-xs md:text-sm text-gray-500">No billing events found for the selected filters.</p>
              ) : (
                <div className="overflow-x-auto -mx-3 md:-mx-4">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">Session</th>
                        <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                        <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                        <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {usageHistory.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-900">
                            <span className={`inline-flex items-center gap-1 md:gap-2 px-2 md:px-2.5 py-1 rounded-full text-[10px] md:text-xs font-medium ${getSessionTypeBadge(item.session_type)}`}>
                              {item.session_type === 'practice' ? 'Practice' : 'Exam'}
                            </span>
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 capitalize">
                            {item.activity_type.replace('_', ' ')}
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-semibold text-red-600">
                            -{item.points_deducted}
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-500 hidden sm:table-cell">
                            {formatDate(item.timestamp)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </PageContainer>
  );
};

export default ConsumptionHistoryView;
