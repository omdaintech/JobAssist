import { PageContainer } from '@/components/layout/PageContainer';
import { Button, LoadingSpinner, AnimatedCardWithEntrance, SkeletonDashboard } from '@/components/ui';
import { ActivityCard, ExamReadinessCards } from '@/components/dashboard';
import { useAuth } from '@/context/AuthContext';
import { useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import { motion } from 'framer-motion';
import { staggerContainer } from '@/utils/animations';
import api, { DashboardSummaryResponse, ActivityPerformance, ExamReadinessData, Language } from '@/services/api';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Simplified Dashboard View
 * 
 * Based on ui_prototype/dashboard_simplified.html
 * 
 * Sections:
 * 1. Top Stats (4 cards: Sessions, Streak, Avg Score, Most-used Level)
 * 2. Practice by Skill (4 activity cards with empty states)
 * 3. Exam Readiness (Current level + Next level)
 * 4. Quick Actions (preserved from old dashboard)
 */
export const DashboardView: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  
  useOnboardingGuard();

  // State
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummaryResponse | null>(null);
  const [activityPerformance, setActivityPerformance] = useState<ActivityPerformance[]>([]);
  const [examReadiness, setExamReadiness] = useState<ExamReadinessData | null>(null);
  const [userStatus, setUserStatus] = useState<Record<string, any> | null>(null);
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<7 | 30 | 60 | 90>(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set page title
  useEffect(() => {
    document.title = 'Dashboard | One-CEFR';
  }, []);

  // Initial load
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      navigate('/login');
      return;
    }

    if (!isAuthenticated) return;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load all data in parallel
        const [summaryRes, statsRes, readinessRes, statusRes, languagesRes] = await Promise.all([
          api.dashboard.summary(timePeriod, selectedLanguageId || undefined),
          api.dashboard.overview(timePeriod, selectedLanguageId || undefined),
          api.dashboard.examReadiness(selectedLanguageId || undefined),
          api.user.getStatus(),
          api.languages.getAll().catch(() => ({ data: { success: false, languages: [], message: null } }))
        ]);

        setDashboardSummary(summaryRes.data);
        setActivityPerformance(statsRes.data.activity_performance || []);
        setExamReadiness(readinessRes.data.data);
        setUserStatus(statusRes.data.data || statusRes.data);
        
        if (languagesRes.data.success) {
          setAvailableLanguages(languagesRes.data.languages);
        }

      } catch (err) {
        console.error('Failed to load dashboard:', err);
        setError('Unable to load dashboard. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [isAuthenticated, isLoading, navigate, timePeriod, selectedLanguageId]);

  // Set initial language to user's preferred language (only after languages are loaded)
  useEffect(() => {
    if (availableLanguages.length > 0 && userStatus?.preferred_language_info?.language_id && !selectedLanguageId) {
      setSelectedLanguageId(userStatus.preferred_language_info.language_id);
    }
  }, [availableLanguages, userStatus, selectedLanguageId]);

  // Activity icons and colors
  const getActivityConfig = (activityType: string) => {
    const configs = {
      reading: {
        icon: '📖',
        colorClasses: {
          gradient: 'bg-gradient-to-br from-blue-50 to-blue-100',
          border: 'border-blue-200',
          text: 'text-blue-700',
          iconBg: 'gradient-blue'
        }
      },
      writing: {
        icon: '✍️',
        colorClasses: {
          gradient: 'bg-gradient-to-br from-purple-50 to-purple-100',
          border: 'border-purple-200',
          text: 'text-purple-700',
          iconBg: 'gradient-purple'
        }
      },
      grammar: {
        icon: '🎯',
        colorClasses: {
          gradient: 'bg-gradient-to-br from-green-50 to-green-100',
          border: 'border-green-200',
          text: 'text-green-700',
          iconBg: 'gradient-green'
        }
      },
      hearing: {
        icon: '🎧',
        colorClasses: {
          gradient: 'bg-gradient-to-br from-orange-50 to-orange-100',
          border: 'border-orange-200',
          text: 'text-orange-700',
          iconBg: 'gradient-orange'
        }
      },
      speaking: {
        icon: '🎤',
        colorClasses: {
          gradient: 'bg-gradient-to-br from-pink-50 to-pink-100',
          border: 'border-pink-200',
          text: 'text-pink-700',
          iconBg: 'gradient-pink'
        }
      }
    };
    return configs[activityType as keyof typeof configs] || configs.reading;
  };

  // Handle practice navigation
  const handleStartPractice = (activityType: string) => {
    // Navigate to practice selection with activity and level pre-selected
    const currentLevel = userStatus?.current_level || 'A1';
    navigate(`/practice?retry=true&level=${currentLevel}&activity=${activityType}`);
  };

  // Handle exam navigation
  const handleTakeExam = (level: string) => {
    navigate(`/exam?create=true&level=${level}`);
  };

  // Top stats cards
  const statsCards = useMemo(() => {
    if (!dashboardSummary) {
      return [
        { title: 'Practice Sessions', value: '-', icon: '📚', isEmpty: true, showTimePeriod: true },
        { title: 'Average Score', value: '-', icon: '�', isEmpty: true, showTimePeriod: true },
        { title: 'Primary Language', value: '-', icon: '🌍', isEmpty: true, showTimePeriod: false },
        { title: 'Most-used Level', value: '-', icon: '🎯', isEmpty: true, showTimePeriod: true }
      ];
    }

    return [
      {
        title: 'Practice Sessions',
        value: dashboardSummary.total_sessions > 0 ? String(dashboardSummary.total_sessions) : 'Get started!',
        icon: '📚',
        isEmpty: dashboardSummary.total_sessions === 0,
        showTimePeriod: true
      },
      {
        title: 'Average Score',
        value: dashboardSummary.average_score > 0 
          ? (dashboardSummary.average_score >= 50 
              ? `${Math.round(dashboardSummary.average_score)}%` 
              : 'Improving 📈')
          : 'No data',
        icon: '📊',
        isEmpty: dashboardSummary.average_score === 0,
        showTimePeriod: true
      },
      {
        title: 'Primary Language',
        value: userStatus?.preferred_language_info?.language_name || 'Not set',
        icon: '🌍',
        isEmpty: false,
        showTimePeriod: false
      },
      {
        title: 'Most-used Level',
        value: dashboardSummary.favorite_level || 'No data',
        icon: '🎯',
        isEmpty: !dashboardSummary.favorite_level,
        showTimePeriod: true
      }
    ];
  }, [dashboardSummary, userStatus]);

  // Loading state
  if (!isAuthenticated) {
    return (
      <PageContainer className="py-20">
        <div className="flex items-center justify-center min-h-[16rem]">
          <LoadingSpinner />
        </div>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="app-content-container app-page-stack py-3 md:py-4 lg:py-6">
          <SkeletonDashboard />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer className="py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard Error</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="app-content-container app-page-stack py-3 md:py-4 lg:py-6">
        {/* Page Header */}
        <section className="mb-6 md:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Your Learning Journey 🚀</h1>
              <p className="text-gray-600">Track your progress and keep practicing!</p>
            </div>
            
            {/* Quick Stats Badges */}
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                💎 {userStatus?.usage_info?.remaining_count ?? 0} Credits
              </span>
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-green-100 text-green-700 font-semibold text-sm">
                📊 Level {userStatus?.current_level ?? 'A1'}
              </span>
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-orange-100 text-orange-700 font-semibold text-sm">
                🌍 {userStatus?.preferred_language_info?.language_name ?? 'Language'}
              </span>
            </div>
          </div>
          
          {/* Start Practice & Exam Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Button
              onClick={() => {
                const currentLevel = userStatus?.current_level || 'A1';
                navigate(`/practice?create=true&level=${currentLevel}&activity=reading`);
              }}
              className="min-h-[44px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              🧠 Start Practice Session
            </Button>
            <Button
              onClick={() => {
                const currentLevel = userStatus?.current_level || 'A1';
                navigate(`/exam?create=true&level=${currentLevel}`);
              }}
              variant="outline"
              className="min-h-[44px] border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold"
            >
              📝 Take Full Exam
            </Button>
          </div>
          
          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Language Selector (only show if multiple languages) */}
            {availableLanguages.length > 1 && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedLanguageId || 'all'}
                  onChange={(e) => {
                    const val = e.target.value === 'all' ? null : e.target.value;
                    setSelectedLanguageId(val);
                  }}
                  className="px-4 py-2 text-sm font-medium bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-all hover:border-blue-300 cursor-pointer"
                >
                  <option value="all">All Languages</option>
                  {availableLanguages.map((lang) => (
                    <option key={lang.language_id} value={lang.language_id}>
                      {lang.language_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Time Period Filter */}
            <div className="inline-flex bg-white rounded-lg shadow-sm border border-gray-200 p-1">
              <button
                onClick={() => setTimePeriod(7)}
                className={`time-period-button ${timePeriod === 7 ? 'time-period-button-active' : ''}`}
              >
                7 days
              </button>
              <button
                onClick={() => setTimePeriod(30)}
                className={`time-period-button ${timePeriod === 30 ? 'time-period-button-active' : ''}`}
              >
                30 days
              </button>
              <button
                onClick={() => setTimePeriod(60)}
                className={`time-period-button ${timePeriod === 60 ? 'time-period-button-active' : ''}`}
              >
                60 days
              </button>
              <button
                onClick={() => setTimePeriod(90)}
                className={`time-period-button ${timePeriod === 90 ? 'time-period-button-active' : ''}`}
              >
                90 days
              </button>
            </div>
          </div>
        </section>

        {/* Top Stats Cards - Hidden on mobile/tablet to reduce clutter */}
        {/* Practice by Skill Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-6 h-6 md:w-7 md:h-7 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"/>
            </svg>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              Practice by Skill{selectedLanguageId && userStatus?.preferred_language_info?.language_name ? ` - ${userStatus.preferred_language_info.language_name}` : ''}{userStatus?.user_info?.current_level ? ` ${userStatus.user_info.current_level}` : ''}
            </h2>
          </div>
          <p className="text-sm md:text-base text-gray-600 mb-6">
            Focus on individual skills and track your progress <span className="text-gray-400 text-xs ml-2">(status in {timePeriod} days{selectedLanguageId && userStatus?.preferred_language_info?.language_name ? `, ${userStatus.preferred_language_info.language_name}` : ''})</span>
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
            {activityPerformance.map((activity) => {
              const config = getActivityConfig(activity.activity_type);
              // Find weakest skill (lowest avg_score among activities with data)
              const activitiesWithData = activityPerformance.filter(a => a.has_activity);
              const weakestActivity = activitiesWithData.length > 0 
                ? activitiesWithData.reduce((min, curr) => 
                    parseFloat(curr.avg_score as any) < parseFloat(min.avg_score as any) ? curr : min
                  )
                : null;
              const isWeakest = weakestActivity?.activity_type === activity.activity_type && activity.has_activity;
              
              return (
                <ActivityCard
                  key={activity.activity_type}
                  activity={activity}
                  icon={config.icon}
                  colorClasses={config.colorClasses}
                  onStartPractice={() => handleStartPractice(activity.activity_type)}
                  isWeakest={isWeakest}
                />
              );
            })}
          </div>
        </section>

        {/* Exam Readiness Section */}
        {examReadiness && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                Exam Readiness{selectedLanguageId && userStatus?.preferred_language_info?.language_name ? ` - ${userStatus.preferred_language_info.language_name}` : ''}{userStatus?.user_info?.current_level ? ` ${userStatus.user_info.current_level}` : ''}
              </h2>
            </div>
            <p className="text-sm md:text-base text-gray-600 mb-6">
              Full 4-skill assessment <span className="text-gray-400 text-xs ml-2">(status in {timePeriod} days{selectedLanguageId && userStatus?.preferred_language_info?.language_name ? `, ${userStatus.preferred_language_info.language_name}` : ''})</span>
            </p>
            
            <ExamReadinessCards
              currentLevel={examReadiness.current_level}
              nextLevel={examReadiness.next_level}
              onTakeExam={handleTakeExam}
              languageName={userStatus?.preferred_language_info?.language_name}
            />
          </section>
        )}

        {/* Quick Actions */}
        <section className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-5">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <button 
              onClick={() => {
                const currentLevel = userStatus?.current_level || 'A1';
                navigate(`/practice?create=true&level=${currentLevel}&activity=reading`);
              }}
              className="p-3 md:p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:shadow-md transition-all flex items-center justify-center gap-3 font-medium text-sm md:text-base text-gray-700 hover:text-blue-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              Start Practice
            </button>
            <button 
              onClick={() => {
                const currentLevel = userStatus?.current_level || 'A1';
                navigate(`/exam?create=true&level=${currentLevel}`);
              }}
              className="p-3 md:p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:shadow-md transition-all flex items-center justify-center gap-3 font-medium text-sm md:text-base text-gray-700 hover:text-blue-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              Take Exam
            </button>
            <button 
              onClick={() => navigate('/practice-log')}
              className="p-3 md:p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:shadow-md transition-all flex items-center justify-center gap-3 font-medium text-sm md:text-base text-gray-700 hover:text-blue-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              View History
            </button>
          </div>
        </section>
      </div>
    </PageContainer>
  );
};

export default DashboardView;
