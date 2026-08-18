import { useEffect, useMemo, useState } from 'react'
import {
  BillingCyclePeriod,
  SchoolBillingOverviewData,
  SchoolBillingReportData,
  SchoolUsageData,
  schoolApi,
} from '../../services/schoolApi'

const formatCurrency = (value: number, currency: string = 'EUR') =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value || 0)

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatDateInput = (value?: string | null) => {
  if (!value) return ''
  return value.slice(0, 10)
}

type BillingTab = 'overview' | 'usage' | 'projection' | 'report'

export default function SchoolBillingPage() {
  const [activeTab, setActiveTab] = useState<BillingTab>('overview')

  const [overviewLoading, setOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState<string | null>(null)
  const [overviewData, setOverviewData] = useState<SchoolBillingOverviewData | null>(null)

  const [usageLoading, setUsageLoading] = useState(false)
  const [usageError, setUsageError] = useState<string | null>(null)
  const [usageRange, setUsageRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [usageData, setUsageData] = useState<SchoolUsageData | null>(null)

  const [projectionLoading, setProjectionLoading] = useState(false)
  const [projectionError, setProjectionError] = useState<string | null>(null)
  const [projectionData, setProjectionData] = useState<SchoolBillingReportData | null>(null)

  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportRange, setReportRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [reportData, setReportData] = useState<SchoolBillingReportData | null>(null)

  useEffect(() => {
    const loadOverview = async () => {
      setOverviewLoading(true)
      setOverviewError(null)
      try {
        const result = await schoolApi.getBillingOverview()
        if (result.success && result.data) {
          setOverviewData(result.data)
          const start = formatDateInput(result.data.current_cycle?.start)
          const end = formatDateInput(result.data.current_cycle?.end)
          if (start && end) {
            setUsageRange({ start, end })
            setReportRange({ start, end })
          }
        } else {
          setOverviewData(null)
          setOverviewError(result.message || 'Unable to load billing overview')
        }
      } catch (error) {
        setOverviewData(null)
        setOverviewError(error instanceof Error ? error.message : 'Unable to load billing overview')
      } finally {
        setOverviewLoading(false)
      }
    }

    loadOverview()
  }, [])

  useEffect(() => {
    if (activeTab === 'usage' && !usageData && usageRange.start && usageRange.end) {
      void loadUsage()
    }
    if (activeTab === 'projection' && !projectionData) {
      void loadProjection()
    }
    if (activeTab === 'report' && !reportData && reportRange.start && reportRange.end) {
      void loadReport()
    }
  }, [activeTab])

  const loadUsage = async () => {
    if (!usageRange.start || !usageRange.end) {
      setUsageError('Select a start and end date to view usage')
      return
    }

    setUsageLoading(true)
    setUsageError(null)
    try {
      const result = await schoolApi.getBillingUsage(usageRange.start, usageRange.end)
      if (result.success && result.data) {
        setUsageData(result.data)
      } else {
        setUsageData(null)
        setUsageError(result.message || 'Unable to load usage for selected period')
      }
    } catch (error) {
      setUsageData(null)
      setUsageError(error instanceof Error ? error.message : 'Unable to load usage for selected period')
    } finally {
      setUsageLoading(false)
    }
  }

  const loadProjection = async () => {
    setProjectionLoading(true)
    setProjectionError(null)
    try {
      const result = await schoolApi.getBillingProjection()
      if (result.success && result.data) {
        setProjectionData(result.data)
      } else {
        setProjectionData(null)
        setProjectionError(result.message || 'Unable to load projection')
      }
    } catch (error) {
      setProjectionData(null)
      setProjectionError(error instanceof Error ? error.message : 'Unable to load projection')
    } finally {
      setProjectionLoading(false)
    }
  }

  const loadReport = async () => {
    if (!reportRange.start || !reportRange.end) {
      setReportError('Select a start and end date to generate a report')
      return
    }

    setReportLoading(true)
    setReportError(null)
    try {
      const result = await schoolApi.getBillingReport(reportRange.start, reportRange.end)
      if (result.success && result.data) {
        setReportData(result.data)
      } else {
        setReportData(null)
        setReportError(result.message || 'Unable to generate report for selected period')
      }
    } catch (error) {
      setReportData(null)
      setReportError(error instanceof Error ? error.message : 'Unable to generate report for selected period')
    } finally {
      setReportLoading(false)
    }
  }

  const cycleLabel = useMemo(() => {
    if (!overviewData?.current_cycle) return 'Current cycle'
    const { start, end } = overviewData.current_cycle
    return `${formatDate(start)} → ${formatDate(end)}`
  }, [overviewData])

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Billing</h1>
          <p className="mt-2 text-sm text-gray-700">
            Track credit consumption, monitor projected charges, and export billing reports for your school.
          </p>
        </div>
      </div>

      <div className="mt-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {(
            [
              { key: 'overview', label: 'Overview' },
              { key: 'usage', label: 'Usage' },
              { key: 'projection', label: 'Projection' },
              { key: 'report', label: 'Report' },
            ] as Array<{ key: BillingTab; label: string }>
          ).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium'
              }
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'overview' && (
          <OverviewTab loading={overviewLoading} error={overviewError} data={overviewData} cycleLabel={cycleLabel} />
        )}

        {activeTab === 'usage' && (
          <UsageTab
            loading={usageLoading}
            error={usageError}
            data={usageData}
            range={usageRange}
            onRangeChange={setUsageRange}
            onRefresh={loadUsage}
          />
        )}

        {activeTab === 'projection' && (
          <ProjectionTab loading={projectionLoading} error={projectionError} data={projectionData} />
        )}

        {activeTab === 'report' && (
          <ReportTab
            loading={reportLoading}
            error={reportError}
            data={reportData}
            range={reportRange}
            onRangeChange={setReportRange}
            onRefresh={loadReport}
          />
        )}
      </div>
    </div>
  )
}

interface OverviewTabProps {
  loading: boolean
  error: string | null
  data: SchoolBillingOverviewData | null
  cycleLabel: string
}

function OverviewTab({ loading, error, data, cycleLabel }: OverviewTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-md border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
        Billing information is not available yet.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Current billing cycle</h2>
            <p className="text-sm text-gray-500">{cycleLabel}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Projected charges</div>
            <div className="text-2xl font-semibold text-gray-900">
              {formatCurrency(data.projected_charges, data.billing_pack?.currency || 'EUR')}
            </div>
            <div className="text-xs text-gray-400">Last billed {formatDate(data.last_billed_at)}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <KpiCard label="Total sessions" value={data.usage_data.total_sessions.toLocaleString()} />
          <KpiCard label="Credits consumed" value={data.usage_data.total_credits.toLocaleString()} />
          <KpiCard label="Average credits / session" value={data.usage_data.average_credits_per_session.toFixed(2)} />
          <KpiCard label="Billing cycle" value={data.billing_cycle.toUpperCase()} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PackCard title="Billing pack" pack={data.billing_pack} />
        <PackCard title="Student pack" pack={data.student_pack} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <UsageBreakdown title="Sessions by type" breakdown={data.usage_data.by_session_type} />
        <UsageBreakdown title="Activities by type" breakdown={data.usage_data.by_activity_type} />
      </div>
    </div>
  )
}

interface UsageTabProps {
  loading: boolean
  error: string | null
  data: SchoolUsageData | null
  range: { start: string; end: string }
  onRangeChange: (range: { start: string; end: string }) => void
  onRefresh: () => void
}

function UsageTab({ loading, error, data, range, onRangeChange, onRefresh }: UsageTabProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Usage period</h2>
            <p className="text-sm text-gray-500">Select a date range to review credit consumption.</p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Start</label>
              <input
                type="date"
                value={range.start}
                onChange={event => onRangeChange({ ...range, start: event.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">End</label>
              <input
                type="date"
                value={range.end}
                onChange={event => onRangeChange({ ...range, end: event.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>
            <button
              onClick={onRefresh}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {loading && (
          <div className="mt-6 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        )}

        {!loading && !error && data && (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <KpiCard label="Total sessions" value={data.total_sessions.toLocaleString()} />
              <KpiCard label="Credits consumed" value={data.total_credits.toLocaleString()} />
              <KpiCard label="Avg credits / session" value={data.average_credits_per_session.toFixed(2)} />
            </div>

            <div className="text-sm text-gray-500">
              Last usage recorded {formatDate(data.last_usage_at)}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <UsageBreakdown title="Sessions by type" breakdown={data.by_session_type} />
              <UsageBreakdown title="Activities by type" breakdown={data.by_activity_type} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface ProjectionTabProps {
  loading: boolean
  error: string | null
  data: SchoolBillingReportData | null
}

function ProjectionTab({ loading, error, data }: ProjectionTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error) {
    return <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
  }

  if (!data) {
    return (
      <div className="rounded-md border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
        Projection data is not available.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Projected charges</h2>
        <p className="text-sm text-gray-500">Based on current consumption patterns.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <KpiCard label="Projected charges" value={formatCurrency(data.billing.projected_charges || 0)} />
          <KpiCard label="Per-credit rate" value={`${formatCurrency(data.billing.per_credit_rate || 0)} / credit`} />
          <KpiCard label="Cycle" value={`${formatDate(data.cycle.start)} → ${formatDate(data.cycle.end)}`} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <UsageBreakdown title="Sessions by type" breakdown={data.usage.by_session_type} />
        <UsageBreakdown title="Activities by type" breakdown={data.usage.by_activity_type} />
      </div>
    </div>
  )
}

interface ReportTabProps {
  loading: boolean
  error: string | null
  data: SchoolBillingReportData | null
  range: { start: string; end: string }
  onRangeChange: (range: { start: string; end: string }) => void
  onRefresh: () => void
}

function ReportTab({ loading, error, data, range, onRangeChange, onRefresh }: ReportTabProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Detailed report</h2>
            <p className="text-sm text-gray-500">Generate a summarized billing report for the selected period.</p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Start</label>
              <input
                type="date"
                value={range.start}
                onChange={event => onRangeChange({ ...range, start: event.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">End</label>
              <input
                type="date"
                value={range.end}
                onChange={event => onRangeChange({ ...range, end: event.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>
            <button
              onClick={onRefresh}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Generate
            </button>
          </div>
        </div>

        {error && <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {loading && (
          <div className="mt-6 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        )}

        {!loading && !error && data && (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <KpiCard label="Total sessions" value={data.usage.total_sessions.toLocaleString()} />
              <KpiCard label="Credits consumed" value={data.usage.total_credits.toLocaleString()} />
              <KpiCard label="Projected charges" value={formatCurrency(data.billing.projected_charges || 0)} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <UsageBreakdown title="Sessions by type" breakdown={data.usage.by_session_type} />
              <UsageBreakdown title="Activities by type" breakdown={data.usage.by_activity_type} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface KpiCardProps {
  label: string
  value: string | number
}

function KpiCard({ label, value }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-gray-900">{value}</div>
    </div>
  )
}

interface PackCardProps {
  title: string
  pack: SchoolBillingOverviewData['billing_pack']
}

function PackCard({ title, pack }: PackCardProps) {
  if (!pack) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
        {title}: No pack assigned
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      <dl className="mt-4 space-y-2 text-sm text-gray-600">
        <div className="flex justify-between">
          <dt>Name</dt>
          <dd className="font-medium text-gray-900">{pack.name || '—'}</dd>
        </div>
        {typeof pack.credits === 'number' && (
          <div className="flex justify-between">
            <dt>Monthly Credit</dt>
            <dd className="font-medium text-gray-900">{pack.credits.toLocaleString()}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt>Max Monthly Pay</dt>
          <dd className="font-medium text-gray-900">
            {typeof pack.credits === 'number' 
              ? formatCurrency(Math.round(pack.credits * pack.per_credit_rate), pack.currency)
              : formatCurrency(pack.per_credit_rate, pack.currency)
            }
          </dd>
        </div>
      </dl>
    </div>
  )
}

interface UsageBreakdownProps {
  title: string
  breakdown: Record<string, { session_count: number; credits_used: number }>
}

function UsageBreakdown({ title, breakdown }: UsageBreakdownProps) {
  const entries = Object.entries(breakdown || {})
  if (!entries.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
        {title}: No data available
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      <dl className="mt-4 space-y-3 text-sm text-gray-600">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between">
            <dt className="capitalize">{key.replace(/_/g, ' ')}</dt>
            <dd className="font-medium text-gray-900">
              {value.session_count.toLocaleString()} sessions · {value.credits_used.toLocaleString()} credits
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
