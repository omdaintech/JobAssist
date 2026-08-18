/**
 * School Admin Dashboard Page
 * Updated to surface billing overview and usage insights for the new per-credit model.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSchoolAuth } from '../../context/SchoolAuthContext';
import {
  BillingCyclePeriod,
  SchoolBillingOverviewData,
    SchoolDashboardStats,
  SchoolUsageData,
  UsageBucket,
  schoolApi,
} from '../../services/schoolApi';

const currencyFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
});

const formatDateRange = (period?: BillingCyclePeriod) => {
  if (!period) return 'Cycle dates not set';
  const format = (iso: string) => new Date(iso).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  return `${format(period.start)} → ${format(period.end)}`;
};

const formatLastBilled = (timestamp?: string | null) => {
  if (!timestamp) return 'Never billed';
  return new Date(timestamp).toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const renderUsageBuckets = (title: string, buckets?: Record<string, UsageBucket>) => {
  const entries = buckets ? Object.entries(buckets) : [];

  if (!entries.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
        No usage captured yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
      <dl className="mt-3 space-y-2">
        {entries.map(([key, bucket]) => (
          <div key={key} className="flex items-center justify-between text-sm text-gray-700">
            <dt className="capitalize">{key.replace(/_/g, ' ')}</dt>
            <dd className="font-medium">
              {bucket.session_count} sessions · {bucket.credits_used} credits
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

const emptyDashboard: SchoolDashboardStats = {
  total_students: 0,
  active_students: 0,
  inactive_students: 0,
  sessions_last_7_days: 0,
  total_sessions: 0,
  avg_sessions_per_student: 0,
};

const emptyUsage: SchoolUsageData = {
  school_id: '',
  period: { start: '', end: '' },
  total_credits: 0,
  total_sessions: 0,
  average_credits_per_session: 0,
  last_usage_at: null,
  by_session_type: {},
  by_activity_type: {},
};

const emptyBillingOverview: SchoolBillingOverviewData = {
  school_id: '',
  school_name: '',
  billing_cycle: 'monthly',
  current_cycle: { start: '', end: '' },
  usage_data: emptyUsage,
  billing_pack: undefined,
  student_pack: undefined,
  projected_charges: 0,
  last_billed_at: null,
};

const SchoolDashboardPage: React.FC = () => {
  const { schoolAdmin } = useSchoolAuth();
  const [dashboardStats, setDashboardStats] = useState<SchoolDashboardStats>(emptyDashboard);
  const [billingOverview, setBillingOverview] = useState<SchoolBillingOverviewData>(emptyBillingOverview);
  const [schoolName, setSchoolName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);

  const stats = useMemo(() => [
    {
      name: 'Total Users',
      value: dashboardStats.total_students,
      bg: 'bg-blue-500',
      description: 'Registered learners in this school',
    },
    {
      name: 'Active Users',
      value: dashboardStats.active_students,
      bg: 'bg-green-500',
      description: 'Users active in the last 30 days',
    },
    {
      name: 'Sessions This Cycle',
      value: billingOverview.usage_data.total_sessions,
      bg: 'bg-purple-500',
      description: 'Practice & exam sessions recorded in the current cycle',
    },
    {
      name: 'Credits Consumed',
      value: billingOverview.usage_data.total_credits,
      bg: 'bg-amber-500',
      description: 'Billable credits consumed in the current cycle',
    },
  ], [dashboardStats, billingOverview]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      setBillingError(null);

      const [analyticsResult, billingResult, schoolInfoResult] = await Promise.allSettled([
        schoolApi.getDashboardAnalytics(),
        schoolApi.getBillingOverview(),
        schoolApi.getSchoolInfo(),
      ]);

      if (analyticsResult.status === 'fulfilled') {
        if (analyticsResult.value.success && analyticsResult.value.data) {
          setDashboardStats(analyticsResult.value.data);
        } else {
          setError(analyticsResult.value.message || 'Failed to load activity statistics');
        }
      } else {
        setError((analyticsResult.reason as Error | undefined)?.message || 'Failed to load activity statistics');
      }

      if (billingResult.status === 'fulfilled') {
        if (billingResult.value.success && billingResult.value.data) {
          setBillingOverview(billingResult.value.data);
        } else {
          setBillingOverview(emptyBillingOverview);
          setBillingError(billingResult.value.message || 'Unable to load billing overview');
        }
      } else {
        setBillingOverview(emptyBillingOverview);
        setBillingError('Unable to load billing overview');
      }

      if (schoolInfoResult.status === 'fulfilled') {
        if (schoolInfoResult.value.success && schoolInfoResult.value.data) {
          setSchoolName(schoolInfoResult.value.data.school?.name ?? '');
        }
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700">
            Welcome back, {schoolAdmin?.name}! Monitor usage and billing for{' '}
            {schoolName || 'your school'}.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            to="/school/users"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Manage Users
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`${stat.bg} rounded-md p-3 text-white`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m2 4v-4m0 0V9m0 3h3m-3 0H9"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {stat.value.toLocaleString()}
                      </dd>
                      <dd className="text-xs text-gray-500 mt-1">{stat.description}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 space-y-6">
        <section className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Current Billing Cycle</h2>
              <p className="mt-1 text-sm text-gray-600">
                {billingOverview.billing_cycle?.toUpperCase() || 'BILLING'} ·{' '}
                {formatDateRange(billingOverview.current_cycle)}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Last billed: {formatLastBilled(billingOverview.last_billed_at)}
              </p>
            </div>
            <div className="text-left lg:text-right">
              <p className="text-sm font-medium text-gray-600">Projected Charge</p>
              <p className="text-3xl font-bold text-gray-900">
                {currencyFormatter.format(billingOverview.projected_charges)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Per-credit rate:{' '}
                {currencyFormatter.format(
                  billingOverview.billing_pack?.per_credit_rate ??
                    billingOverview.student_pack?.per_credit_rate ??
                    0,
                )}
              </p>
            </div>
          </div>

          {billingError && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {billingError}
            </div>
          )}

          {!billingError && (
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700">Billing Pack</h3>
                <dl className="mt-3 space-y-2 text-sm text-gray-700">
                  <div>
                    <dt className="text-gray-500">Pack ID</dt>
                    <dd className="font-mono">
                      {billingOverview.billing_pack?.id || 'Not assigned'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Pack Name</dt>
                    <dd>{billingOverview.billing_pack?.name || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Per-credit rate</dt>
                    <dd>
                      {currencyFormatter.format(
                        billingOverview.billing_pack?.per_credit_rate ??
                          billingOverview.student_pack?.per_credit_rate ??
                          0,
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700">Student Allocation Pack</h3>
                <dl className="mt-3 space-y-2 text-sm text-gray-700">
                  <div>
                    <dt className="text-gray-500">Pack ID</dt>
                    <dd className="font-mono">
                      {billingOverview.student_pack?.id || 'Not assigned'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Pack Name</dt>
                    <dd>{billingOverview.student_pack?.name || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Credits Included</dt>
                    <dd>{billingOverview.student_pack?.credits ?? '—'}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700">Usage Summary</h3>
                <dl className="mt-3 space-y-2 text-sm text-gray-700">
                  <div>
                    <dt className="text-gray-500">Total Sessions</dt>
                    <dd>{billingOverview.usage_data.total_sessions.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Total Credits</dt>
                    <dd>{billingOverview.usage_data.total_credits.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Average Credits / Session</dt>
                    <dd>
                      {billingOverview.usage_data.average_credits_per_session.toFixed(2)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {!billingError && (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {renderUsageBuckets('By session type', billingOverview.usage_data.by_session_type)}
              {renderUsageBuckets('By activity type', billingOverview.usage_data.by_activity_type)}
            </div>
          )}
        </section>

        {dashboardStats.users_by_level && Object.keys(dashboardStats.users_by_level).length > 0 && (
          <section className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Users by Level
              </h3>
              <div className="mt-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  {Object.entries(dashboardStats.users_by_level).map(([level, count]) => (
                    <div key={level} className="bg-gray-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-gray-900">{count}</div>
                      <div className="text-sm text-gray-600 mt-1">Level {level}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default SchoolDashboardPage;
