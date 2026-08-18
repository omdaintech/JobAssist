import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  schoolApi,
  TemplateUsageAnalyticsResponse,
  TemplateUsageSessionsResponse,
  TemplateUsageTemplate,
} from '../../services/schoolApi'

const TEMPLATE_PAGE_SIZE = 10
const DETAIL_PAGE_SIZE = 10

interface PaginationState {
  page: number
  per_page: number
  total_pages: number
  has_more: boolean
}

type DetailTab = 'analytics' | 'sessions'

interface SessionGroup {
  sessionName: string;
  sessions: any[];
  totalUsers: number;
  startedUsers: number;
  completedUsers: number;
  status: string;
  createdDate: string;
}

type SessionsRecord = NonNullable<TemplateUsageSessionsResponse['data']>
type AnalyticsRecord = NonNullable<TemplateUsageAnalyticsResponse['data']>

export default function SchoolTemplateUsagePage() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  
  const [templates, setTemplates] = useState<TemplateUsageTemplate[]>([])
  const [templatePagination, setTemplatePagination] = useState<PaginationState | null>(null)
  const [templateLoading, setTemplateLoading] = useState(true)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [templatePage, setTemplatePage] = useState(1)
  const [totalTemplates, setTotalTemplates] = useState(0)
  const [levelFilter, setLevelFilter] = useState('')
  const [sessionTypeFilter, setSessionTypeFilter] = useState('')

  const [activeTemplate, setActiveTemplate] = useState<TemplateUsageTemplate | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTab>('analytics')

  const [sessionsData, setSessionsData] = useState<SessionsRecord | null>(null)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [sessionsPage, setSessionsPage] = useState(1)

  const [analyticsData, setAnalyticsData] = useState<AnalyticsRecord | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)

  // Search filter for sessions
  const [sessionSearchTerm, setSessionSearchTerm] = useState('')

  useEffect(() => {
    const fetchTemplates = async () => {
      setTemplateLoading(true)
      setTemplateError(null)
      try {
        const result = await schoolApi.getTemplateUsageTemplates({
          page: templatePage,
          per_page: TEMPLATE_PAGE_SIZE,
          level: levelFilter || undefined,
          session_type: sessionTypeFilter || undefined,
        })

        if (result.success && result.data) {
          setTemplates(result.data.templates)
          setTotalTemplates(result.data.total_count)
          setTemplatePagination(result.data.pagination)
          
          // If we have a templateId from URL, find and set that template as active
          if (templateId) {
            const targetTemplate = result.data.templates.find(t => t.template_id === templateId)
            if (targetTemplate) {
              setActiveTemplate(targetTemplate)
            } else {
              setTemplateError(`Template with ID ${templateId} not found`)
            }
          } else {
            // Preselect first template when none selected
            if (!activeTemplate && result.data.templates.length > 0) {
              setActiveTemplate(result.data.templates[0])
            }
            if (activeTemplate) {
              const stillExists = result.data.templates.find(t => t.template_id === activeTemplate.template_id)
              if (!stillExists) {
                setActiveTemplate(result.data.templates[0] ?? null)
              }
            }
          }
        } else {
          setTemplates([])
          setTotalTemplates(0)
          setActiveTemplate(null)
          setTemplatePagination(null)
          setTemplateError(result.message || 'Failed to load template usage data')
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load template usage data'
        setTemplates([])
        setTotalTemplates(0)
        setActiveTemplate(null)
        setTemplatePagination(null)
        setTemplateError(message)
      } finally {
        setTemplateLoading(false)
      }
    }

    fetchTemplates()
  }, [templatePage, levelFilter, sessionTypeFilter, templateId])

  useEffect(() => {
    // Reset detail state when template changes
    if (!activeTemplate) {
      setSessionsData(null)
      setAnalyticsData(null)
      setSessionsError(null)
      setAnalyticsError(null)
      setDetailTab('analytics')
      setSessionsPage(1)
      return
    }

    setSessionsData(null)
    setAnalyticsData(null)
    setSessionsError(null)
    setAnalyticsError(null)
    setDetailTab('analytics')
    setSessionsPage(1)
  }, [activeTemplate?.template_id])

  useEffect(() => {
    if (!activeTemplate) return
    const templateId = activeTemplate.template_id

    const loadAnalytics = async () => {
      setAnalyticsLoading(true)
      setAnalyticsError(null)
      try {
        const result = await schoolApi.getTemplateUsageTemplateAnalytics(templateId)
        if (activeTemplate?.template_id !== templateId) return
        if (result.success && result.data) {
          setAnalyticsData(result.data)
        } else {
          setAnalyticsData(null)
          setAnalyticsError(result.message || 'Failed to load analytics')
        }
      } catch (error) {
        if (activeTemplate?.template_id !== templateId) return
        setAnalyticsData(null)
        setAnalyticsError(error instanceof Error ? error.message : 'Failed to load analytics')
      } finally {
        if (activeTemplate?.template_id === templateId) {
          setAnalyticsLoading(false)
        }
      }
    }

    const loadSessions = async (page: number) => {
      setSessionsLoading(true)
      setSessionsError(null)
      try {
        const result = await schoolApi.getTemplateUsageTemplateSessions(templateId, {
          page,
          per_page: DETAIL_PAGE_SIZE,
        })
        if (activeTemplate?.template_id !== templateId) return
        if (result.success && result.data) {
          setSessionsData(result.data)
        } else {
          setSessionsData(null)
          setSessionsError(result.message || 'Failed to load sessions')
        }
      } catch (error) {
        if (activeTemplate?.template_id !== templateId) return
        setSessionsData(null)
        setSessionsError(error instanceof Error ? error.message : 'Failed to load sessions')
      } finally {
        if (activeTemplate?.template_id === templateId) {
          setSessionsLoading(false)
        }
      }
    }

    if (detailTab === 'analytics') {
      loadAnalytics()
    }

    if (detailTab === 'sessions') {
      loadSessions(sessionsPage)
    }
  }, [activeTemplate, detailTab, sessionsPage])

  const handleTemplateSelect = (template: TemplateUsageTemplate) => {
    setActiveTemplate(template)
  }

  const handleFilterChange = (type: 'level' | 'session', value: string) => {
    if (type === 'level') {
      setLevelFilter(value)
    } else {
      setSessionTypeFilter(value)
    }
    setTemplatePage(1)
  }

  const handleTabChange = (tab: DetailTab) => {
    setDetailTab(tab)
    if (tab === 'sessions') {
      setSessionsPage(1)
    }
  }

  const handleCreateSession = () => {
    if (!activeTemplate) {
      return
    }

    const params = new URLSearchParams({
      createSessionTemplate: activeTemplate.template_id,
    })

    if (activeTemplate.template_name) {
      params.append('templateName', activeTemplate.template_name)
    }

    if (activeTemplate.level) {
      params.append('templateLevel', activeTemplate.level)
    }

    if (activeTemplate.session_type) {
      params.append('templateSessionType', activeTemplate.session_type)
    }

    navigate({
      pathname: '/school/users',
      search: `?${params.toString()}`,
    })
  }

  // Filter sessions based on search term
  const filteredSessions = useMemo(() => {
    if (!sessionsData?.sessions) return []
    if (!sessionSearchTerm.trim()) return sessionsData.sessions

    const searchLower = sessionSearchTerm.toLowerCase()
    return sessionsData.sessions.filter(session =>
      (session.user.user_name?.toLowerCase().includes(searchLower)) ||
      (session.user.user_email?.toLowerCase().includes(searchLower)) ||
      (session.exam_name?.toLowerCase().includes(searchLower))
    )
  }, [sessionsData?.sessions, sessionSearchTerm])

  // Helper function to group sessions by session name
  const getGroupedSessions = (sessions: any[]): SessionGroup[] => {
    const grouped = sessions.reduce((acc, session) => {
      const sessionName = session.exam_name || 'Untitled Session';
      if (!acc[sessionName]) {
        acc[sessionName] = {
          sessionName,
          sessions: [],
          totalUsers: 0,
          startedUsers: 0,
          completedUsers: 0,
          status: 'pending',
          createdDate: ''
        };
      }
      
      acc[sessionName].sessions.push(session);
      acc[sessionName].totalUsers += 1;
      
      if (session.status === 'started') {
        acc[sessionName].startedUsers += 1;
      }
      if (session.status === 'completed') {
        acc[sessionName].completedUsers += 1;
      }
      
      // Set overall status based on majority
      const total = acc[sessionName].totalUsers;
      const completed = acc[sessionName].completedUsers;
      const started = acc[sessionName].startedUsers;
      
      if (completed === total) {
        acc[sessionName].status = 'completed';
      } else if (started > 0) {
        acc[sessionName].status = 'started';
      } else {
        acc[sessionName].status = 'pending';
      }
      
      // Use earliest created date
      if (!acc[sessionName].createdDate || session.created_at < acc[sessionName].createdDate) {
        acc[sessionName].createdDate = session.created_at ? new Date(session.created_at).toLocaleDateString() : '';
      }
      
      return acc;
    }, {} as Record<string, SessionGroup>);
    
    return Object.values(grouped);
  };

  const templateTable = useMemo(() => {
    if (templateLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )
    }

    if (templateError) {
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
              <h3 className="text-sm font-medium text-red-800">Error loading templates</h3>
              <div className="mt-2 text-sm text-red-700">{templateError}</div>
            </div>
          </div>
        </div>
      )
    }

    if (!templates.length) {
      return (
        <div className="rounded-md border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          No templates found for the selected filters.
        </div>
      )
    }

    return (
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Template
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Level
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sessions
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unique Users
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Completion Rate
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {templates.map(template => {
              const isActive = activeTemplate?.template_id === template.template_id
              return (
                <tr
                  key={template.template_id}
                  className={
                    isActive
                      ? 'bg-blue-50 cursor-pointer'
                      : 'hover:bg-gray-50 cursor-pointer'
                  }
                  onClick={() => handleTemplateSelect(template)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{template.template_name}</div>
                    <div className="text-sm text-gray-500">{template.template_id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {template.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize text-sm text-gray-700">
                    {template.session_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {template.created_at ? new Date(template.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {template.usage_stats.total_sessions.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {template.usage_stats.unique_users.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {template.usage_stats.completion_rate.toFixed(1)}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }, [templateLoading, templateError, templates, activeTemplate])

  const renderDetailContent = () => {
    if (!activeTemplate) {
      return (
        <div className="rounded-md border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          Select a template to view usage details.
        </div>
      )
    }

    if (detailTab === 'analytics') {
      if (analyticsLoading) {
        return (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )
      }

      if (analyticsError) {
        return (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{analyticsError}</div>
          </div>
        )
      }

      if (!analyticsData) {
        return null
      }

      const { analytics } = analyticsData
      return (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-700">Sessions</h3>
            <dl className="mt-4 space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <dt>Total sessions</dt>
                <dd className="font-semibold text-gray-900">{analytics.total_sessions.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Completed</dt>
                <dd className="font-semibold text-gray-900">{analytics.completed_sessions.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Analyzed</dt>
                <dd className="font-semibold text-gray-900">{analytics.analyzed_sessions.toLocaleString()}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-700">Performance</h3>
            <dl className="mt-4 space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <dt>Completion rate</dt>
                <dd className="font-semibold text-gray-900">{analytics.completion_rate.toFixed(2)}%</dd>
              </div>
              <div className="flex justify-between">
                <dt>Average score</dt>
                <dd className="font-semibold text-gray-900">{analytics.average_score.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Score range</dt>
                <dd className="font-semibold text-gray-900">
                  {analytics.score_distribution.lowest_score} - {analytics.score_distribution.highest_score}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Scored sessions</dt>
                <dd className="font-semibold text-gray-900">{analytics.score_distribution.total_scored_sessions.toLocaleString()}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-700">Engagement</h3>
            <dl className="mt-4 space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <dt>Average duration</dt>
                <dd className="font-semibold text-gray-900">{analytics.average_duration_minutes.toFixed(1)} minutes</dd>
              </div>
              <div className="flex justify-between">
                <dt>Created</dt>
                <dd className="font-semibold text-gray-900">
                  {analyticsData.template_info.created_at
                    ? new Date(analyticsData.template_info.created_at).toLocaleDateString()
                    : '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )
    }

    if (sessionsLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )
    }

    if (sessionsError) {
      return (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{sessionsError}</div>
        </div>
      )
    }

    if (!sessionsData || !sessionsData.sessions.length) {
      return (
        <div className="rounded-md border border-dashed border-gray-300 p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="text-sm text-gray-500">No sessions found for this template.</div>
            <p className="max-w-md text-sm text-gray-500">
              Assign this template to users to launch your first session. You&apos;ll be able to pick the users and confirm the details on the Users page.
            </p>
            <button
              type="button"
              onClick={handleCreateSession}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Session
            </button>
          </div>
        </div>
      )
    }

    if (filteredSessions.length === 0 && sessionSearchTerm.trim()) {
      return (
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by user name, email, or session name..."
              value={sessionSearchTerm}
              onChange={(e) => setSessionSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div className="rounded-md border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
            No sessions found matching "{sessionSearchTerm}". Try a different search term.
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {/* Sessions Header with Create Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search sessions..."
              value={sessionSearchTerm}
              onChange={(e) => setSessionSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleCreateSession}
            className="flex items-center space-x-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Session</span>
          </button>
        </div>

        {sessionSearchTerm.trim() && (
          <div className="text-sm text-gray-500">
            Showing {filteredSessions.length} of {sessionsData.sessions.length} sessions
          </div>
        )}

        {/* Sessions Summary Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{sessionsData.sessions.length}</div>
            <div className="text-sm text-gray-500">Total Sessions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {sessionsData.sessions.filter(s => s.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {sessionsData.sessions.filter(s => s.status === 'started').length}
            </div>
            <div className="text-sm text-gray-500">Active</div>
          </div>
        </div>

        {/* Group sessions by name and show as cards */}
        <div className="space-y-4">
          {getGroupedSessions(filteredSessions).map((sessionGroup) => (
            <div key={sessionGroup.sessionName} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      📝 {sessionGroup.sessionName || 'Untitled Session'}
                    </h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      sessionGroup.status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : sessionGroup.status === 'started'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {sessionGroup.status}
                    </span>
                  </div>
                  
                  <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <span>👥</span>
                      <span>{sessionGroup.totalUsers} users</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>👤</span>
                      <span>{sessionGroup.startedUsers} started</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>✅</span>
                      <span>{sessionGroup.completedUsers} completed</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>📅</span>
                      <span>Created: {sessionGroup.createdDate}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      // Navigate to session detail page using the first session ID in the group
                      const firstSessionId = sessionGroup.sessions[0].session_id;
                      navigate(`/school/sessions/${firstSessionId}`);
                    }}
                    className="bg-white border border-gray-300 px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <span>📊</span>
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <DetailPagination
          page={sessionsData.pagination.page}
          totalPages={sessionsData.pagination.total_pages}
          hasMore={sessionsData.pagination.has_more}
          onPageChange={setSessionsPage}
        />
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          {templateId ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link
                  to="/school/templates"
                  className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Templates
                </Link>
              </div>
              <h1 className="text-2xl font-semibold text-gray-900">Template Usage Analytics</h1>
              <p className="mt-2 text-sm text-gray-700">
                Detailed analytics for {activeTemplate?.template_name || 'selected template'}
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Template Usage</h1>
              <p className="mt-2 text-sm text-gray-700">
                Monitor how your school's templates are used, track performance, and understand engagement.
              </p>
            </div>
          )}
        </div>
      </div>

      {!templateId && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Filter by level</label>
            <select
              value={levelFilter}
              onChange={event => handleFilterChange('level', event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="">All levels</option>
              <option value="A1">A1</option>
              <option value="A2">A2</option>
              <option value="B1">B1</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Filter by session type</label>
            <select
              value={sessionTypeFilter}
              onChange={event => handleFilterChange('session', event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="">All session types</option>
              <option value="exam">Exam</option>
              <option value="practice">Practice</option>
            </select>
          </div>
          <div className="flex flex-col justify-end">
            <div className="text-sm text-gray-500">
              Showing {(templatePage - 1) * TEMPLATE_PAGE_SIZE + 1}–
              {Math.min(templatePage * TEMPLATE_PAGE_SIZE, totalTemplates)} of {totalTemplates} templates
            </div>
          </div>
        </div>
      )}

      {!templateId && <div className="mt-6">{templateTable}</div>}

      {!templateId && templatePagination && templatePagination.total_pages > 1 && (
        <div className="mt-6 flex justify-end">
          <div className="inline-flex rounded-md shadow-sm -space-x-px">
            <button
              onClick={() => setTemplatePage(prev => Math.max(prev - 1, 1))}
              disabled={templatePage <= 1}
              className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
              Page {templatePage} of {templatePagination.total_pages}
            </span>
            <button
              onClick={() => setTemplatePage(prev => (templatePagination.has_more ? prev + 1 : prev))}
              disabled={!templatePagination.has_more}
              className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <div className="mt-10 space-y-4">
        {activeTemplate && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{activeTemplate.template_name}</h2>
                <p className="text-sm text-gray-500">
                  {activeTemplate.session_type.toUpperCase()} · Level {activeTemplate.level} ·{' '}
                  {activeTemplate.usage_stats.total_sessions.toLocaleString()} sessions ·{' '}
                  {activeTemplate.usage_stats.unique_users.toLocaleString()} users
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Completion rate</span>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                  {activeTemplate.usage_stats.completion_rate.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="mt-6 border-b border-gray-200">
              <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                {(
                  [
                    { name: 'Analytics', key: 'analytics' },
                    { name: 'Sessions', key: 'sessions' },
                  ] as Array<{ name: string; key: DetailTab }>
                ).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key)}
                    className={
                      detailTab === tab.key
                        ? 'border-blue-500 text-blue-600 whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium'
                    }
                  >
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            <div className="mt-6">{renderDetailContent()}</div>
          </div>
        )}

        {!activeTemplate && (
          <div className="rounded-md border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
            Select a template from the list above to explore usage insights.
          </div>
        )}
      </div>
    </div>
  )
}

interface DetailPaginationProps {
  page: number
  totalPages: number
  hasMore: boolean
  onPageChange: (page: number) => void
}

function DetailPagination({ page, totalPages, hasMore, onPageChange }: DetailPaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="flex justify-between text-sm text-gray-600">
      <div>
        Page {page} of {totalPages}
      </div>
      <div className="inline-flex rounded-md shadow-sm -space-x-px">
        <button
          onClick={() => onPageChange(Math.max(page - 1, 1))}
          disabled={page <= 1}
          className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(hasMore ? page + 1 : page)}
          disabled={!hasMore}
          className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}
