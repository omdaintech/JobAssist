import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, LoadingState, ErrorDisplay, HowToButton } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { api, PaymentTransaction } from '@/services/api';
import { formatDate } from '@/utils/frontend-utils';
import { getResultsUrl } from '@/utils/navigation-utils';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface UsageItem {
  id: string;
  user_id: string;
  session_type: 'practice' | 'exam';
  activity_type: 'reading' | 'writing' | 'grammar' | 'hearing' | 'full_exam' | 'multiple' | 'any';
  level: 'A1' | 'A2' | 'B1';
  points_deducted: number;
  points_remaining: number;
  timestamp: string;
  session_id?: string;
  description?: string;
  status: 'pending' | 'completed' | 'failed';
  language_name?: string;
  language_flag_emoji?: string;
}



export const ConsumptionHistoryViewSimple: React.FC = () => {
  const { isAuthenticated, usageInfo, remainingUsage, totalUsage, usagePercentage } = useAuth();
  const navigate = useNavigate();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'activities' | 'orders'>('activities');
  
  // Recent Activities state
  const [usageHistory, setUsageHistory] = useState<UsageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Order History state  
  const [orderHistory, setOrderHistory] = useState<PaymentTransaction[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderPage, setOrderPage] = useState(0);
  const [orderHasMore, setOrderHasMore] = useState(true);
  const [orderTotal, setOrderTotal] = useState(0);
  
  const itemsPerPage = 50;

  // Set page title
  useEffect(() => {
    document.title = 'Usage History | One-CEFR';
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    loadUsageHistory();
  }, [isAuthenticated, navigate]);

  const loadUsageHistory = async (pageNum: number = 0, append: boolean = false) => {
    if (!append) {
      setLoading(true);
      setError(null);
    }
    
    try {
      const response = await api.user.usageHistory({
        limit: itemsPerPage,
        skip: pageNum * itemsPerPage
      });
      
      if (response.data.success) {
        const newItems = response.data.practice_log || [];
        if (append) {
          setUsageHistory(prev => [...prev, ...newItems]);
        } else {
          setUsageHistory(newItems);
        }
        
        // Check if there are more items
        setHasMore(newItems.length === itemsPerPage);
      } else {
        setError(response.data.message || 'Failed to load usage history');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load usage history');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadUsageHistory(nextPage, true);
  };

  const loadOrderHistory = async (pageNum: number = 0, append: boolean = false) => {
    if (!append) {
      setOrderLoading(true);
      setOrderError(null);
    }
    
    try {
      const response = await api.payments.getHistory(itemsPerPage, pageNum * itemsPerPage);
      
      if (response.data.success) {
        const newItems = response.data.transactions || [];
        if (append) {
          setOrderHistory(prev => [...prev, ...newItems]);
        } else {
          setOrderHistory(newItems);
        }
        
        setOrderTotal(response.data.total || 0);
        setOrderHasMore(newItems.length === itemsPerPage);
      } else {
        setOrderError(response.data.message || 'Failed to load order history');
      }
    } catch (err: any) {
      setOrderError(err.message || 'Failed to load order history');
    } finally {
      setOrderLoading(false);
    }
  };

  const handleLoadMoreOrders = () => {
    const nextPage = orderPage + 1;
    setOrderPage(nextPage);
    loadOrderHistory(nextPage, true);
  };

  const getSessionTypeBadge = (sessionType: 'practice' | 'exam'): string => {
    return sessionType === 'practice' 
      ? 'bg-green-100 text-green-800 border border-green-200'
      : 'bg-blue-100 text-blue-800 border border-blue-200';
  };

  const formatActivityType = (activityType: string): string => {
    if (activityType === 'multiple') return 'Mixed';
    if (activityType === 'any') return 'General';
    return activityType.charAt(0).toUpperCase() + activityType.slice(1);
  };

  const formatCreditsUsed = (points: number): string => {
    return points === 0 ? 'FREE' : `-${points}`;
  };

  const handleViewResults = (item: UsageItem) => {
    if (item.session_id && item.status === 'completed') {
      const url = getResultsUrl(item.session_id, item.session_type);
      navigate(url);
    }
  };

  const renderRecentActivitiesContent = () => {
    if (usageHistory.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-gray-400 text-lg mb-2">📊</div>
          <p className="text-gray-500">No usage history found</p>
          <p className="text-sm text-gray-400 mt-1">
            Start practicing or taking exams to see your activity history here.
          </p>
        </div>
      );
    }

    return (
      <>
        <div className="hidden md:block">
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-28 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Activity
                  </th>
                  <th className="w-44 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Language
                  </th>
                  <th className="w-24 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Level
                  </th>
                  <th className="w-28 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Credits Used
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Date & Time
                  </th>
                  <th className="w-28 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {usageHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getSessionTypeBadge(item.session_type)}`}>
                        {item.session_type === 'practice' ? '📚 Practice' : '📝 Exam'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatActivityType(item.activity_type)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.language_flag_emoji && <span className="mr-2">{item.language_flag_emoji}</span>}
                      {item.language_name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {item.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {item.points_deducted === 0 ? (
                        <span className="text-green-600">FREE</span>
                      ) : (
                        <span className="text-red-600">-{item.points_deducted}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(item.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        item.status === 'completed' ? 'bg-green-100 text-green-800' :
                        item.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.session_id && item.status === 'completed' && (
                        <button
                          onClick={() => handleViewResults(item)}
                          className="inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border bg-background hover:text-accent-foreground h-9 rounded-md min-h-[32px] text-xs px-3 border-green-200 text-green-700 hover:bg-green-50"
                        >
                          View Results
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4 md:hidden">
          {usageHistory.map((item) => (
            <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getSessionTypeBadge(item.session_type)}`}>
                  {item.session_type === 'practice' ? '📚 Practice' : '📝 Exam'}
                </span>
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  item.status === 'completed' ? 'bg-green-100 text-green-800' :
                  item.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {item.status}
                </span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">
                {formatActivityType(item.activity_type)}
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">Language</dt>
                  <dd className="text-gray-900">
                    {item.language_flag_emoji && <span className="mr-1">{item.language_flag_emoji}</span>}
                    {item.language_name || 'N/A'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">Level</dt>
                  <dd>
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {item.level}
                    </span>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">Credits</dt>
                  <dd className="font-medium">
                    {item.points_deducted === 0 ? (
                      <span className="text-green-600">FREE</span>
                    ) : (
                      <span className="text-red-600">-{item.points_deducted}</span>
                    )}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-gray-500">Date</dt>
                  <dd className="text-right text-gray-600">{formatDate(item.timestamp)}</dd>
                </div>
              </dl>
              {item.session_id && item.status === 'completed' && (
                <button
                  onClick={() => handleViewResults(item)}
                  className="mt-3 w-full inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border bg-background hover:text-accent-foreground h-9 rounded-md min-h-[32px] text-xs px-3 border-green-200 text-green-700 hover:bg-green-50"
                >
                  View Results
                </button>
              )}
            </div>
          ))}
        </div>

        {hasMore && (
          <div className="text-center mt-6">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md"
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}

        <div className="mt-6 border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-500">
            Showing {usageHistory.length} activities
            {hasMore && ' • Tap "Load More" to see older activities'}
          </p>
        </div>
      </>
    );
  };

  const renderOrderHistoryContent = () => {
    if (orderLoading && orderHistory.length === 0) {
      return <LoadingState message="Loading order history..." />;
    }

    if (orderError) {
      return <ErrorDisplay message={orderError} />;
    }

    if (orderHistory.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-gray-400 text-lg mb-2">🛒</div>
          <p className="text-gray-500">No purchase history found</p>
          <p className="text-sm text-gray-400 mt-1">
            Your credit purchases will appear here once you make a payment.
          </p>
          <div className="mt-4">
            <button
              onClick={() => navigate('/buy-credits')}
              className="inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md"
            >
              Buy Credits
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="hidden md:block">
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-40 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Order ID
                  </th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Amount
                  </th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Credits
                  </th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Payment
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {orderHistory.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">
                      {transaction.gateway_order_id.slice(-12)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      €{transaction.amount_value.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-green-600">
                      +{transaction.credits_purchased}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                        transaction.status === 'failed' ? 'bg-red-100 text-red-800' :
                        transaction.status === 'refunded' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {transaction.gateway_provider}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(transaction.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4 md:hidden">
          {orderHistory.map((transaction) => (
            <div key={transaction.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-900">
                  €{transaction.amount_value.toFixed(2)}
                </span>
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                  transaction.status === 'failed' ? 'bg-red-100 text-red-800' :
                  transaction.status === 'refunded' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {transaction.status}
                </span>
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">Order ID</dt>
                  <dd className="font-mono text-gray-600">{transaction.gateway_order_id.slice(-12)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">Credits</dt>
                  <dd className="font-medium text-green-600">+{transaction.credits_purchased}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">Payment</dt>
                  <dd>
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {transaction.gateway_provider}
                    </span>
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-gray-500">Date</dt>
                  <dd className="text-right text-gray-600">{formatDate(transaction.created_at)}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>

        {orderHasMore && (
          <div className="text-center mt-6">
            <button
              onClick={handleLoadMoreOrders}
              disabled={orderLoading}
              className="inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md"
            >
              {orderLoading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}

        <div className="mt-6 border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-500">
            Showing {orderHistory.length} of {orderTotal} transactions
            {orderHasMore && ' • Tap "Load More" to see older orders'}
          </p>
        </div>
      </>
    );
  };

  if (!isAuthenticated) {
    return <LoadingState message="Checking authentication..." />;
  }

  if (loading && usageHistory.length === 0) {
    return <LoadingState message="Loading usage history..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageContainer className="py-8">
        <div className="app-page-stack">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 md:gap-3">
              <h1 className="text-3xl font-bold text-gray-900">Usage History</h1>
              <HowToButton pageId="credit" size="md" />
            </div>
            <p className="mt-2 text-gray-600">
              View your recent learning activities and purchase history.
            </p>
          </div>

          {/* Credit Summary */}
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Your Credits</h2>
                {usageInfo?.reset_at && (
                  <span className="text-sm text-gray-500">Credits reset on: {new Date(usageInfo.reset_at).toLocaleDateString()}</span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{totalUsage || 0}</p>
                  <p className="text-sm text-gray-600">Total Allocated</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{(totalUsage || 0) - (remainingUsage || 0)}</p>
                  <p className="text-sm text-gray-600">Used</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{remainingUsage || 0}</p>
                  <p className="text-sm text-gray-600">Remaining</p>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Usage Progress</span>
                  <span>{usagePercentage || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(usagePercentage || 0, 100)}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card>
              <CardContent className="py-4">
                <ErrorDisplay message={error} />
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <Card>
            <CardContent className="p-0">
              {/* Tab Headers */}
              <div className="border-b border-gray-200">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('activities')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'activities'
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Recent Activities
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('orders');
                      if (orderHistory.length === 0 && !orderLoading) {
                        loadOrderHistory();
                      }
                    }}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'orders'
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Order History
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'activities' && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h2>
                    {/* Recent Activities content will go here */}
                    {renderRecentActivitiesContent()}
                  </div>
                )}

                {activeTab === 'orders' && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Order History</h2>
                    {/* Order History content will go here */}
                    {renderOrderHistoryContent()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </div>
  );
};

export default ConsumptionHistoryViewSimple;