/**
 * School Session Detail Page
 * Detailed view of a specific session with user management capabilities
 * Shows session overview, current users, and allows adding new users
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  schoolApi, 
  SessionDetail, 
  SessionUser,
  AvailableUser 
} from '../../services/schoolApi';

const SchoolSessionDetailPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'add-users'>('users');

  // Session Users Tab
  const [sessionUsers, setSessionUsers] = useState<SessionUser[]>([]);
  const [sessionUsersLoading, setSessionUsersLoading] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Add Users Tab
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [availableUsersLoading, setAvailableUsersLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [addUserSearchTerm, setAddUserSearchTerm] = useState('');
  const [addingUsers, setAddingUsers] = useState(false);

  // Load session detail on mount
  useEffect(() => {
    if (!sessionId) {
      setError('Session ID is required');
      setLoading(false);
      return;
    }
    fetchSessionDetail();
  }, [sessionId]);

  // Load session users when users tab is active
  useEffect(() => {
    if (activeTab === 'users' && sessionDetail) {
      fetchSessionUsers();
    }
  }, [activeTab, sessionDetail]);

  // Load available users when add-users tab is active
  useEffect(() => {
    if (activeTab === 'add-users' && sessionDetail) {
      fetchAvailableUsers();
    }
  }, [activeTab, sessionDetail, addUserSearchTerm]);

  const fetchSessionDetail = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await schoolApi.getSessionDetail(sessionId!);
      
      if (result.success && result.data) {
        setSessionDetail(result.data.session);
      } else {
        setError(result.message || 'Failed to load session detail');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load session detail');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionUsers = async () => {
    if (!sessionId) return;

    try {
      setSessionUsersLoading(true);
      
      const result = await schoolApi.getSessionUsers(sessionId, {
        search: userSearchTerm || undefined
      });
      
      if (result.success && result.data) {
        setSessionUsers(result.data.session.users);
      } else {
        setError(result.message || 'Failed to load session users');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load session users');
    } finally {
      setSessionUsersLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    if (!sessionId) return;

    try {
      setAvailableUsersLoading(true);
      
      const result = await schoolApi.getSessionAvailableUsers(sessionId, {
        search: addUserSearchTerm || undefined
      });
      
      if (result.success && result.data) {
        setAvailableUsers(result.data.users);
      } else {
        setError(result.message || 'Failed to load available users');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load available users');
    } finally {
      setAvailableUsersLoading(false);
    }
  };

  const handleAddUsersToSession = async () => {
    if (selectedUserIds.size === 0) return;

    try {
      setAddingUsers(true);
      setError('');

      const result = await schoolApi.addUsersToSession(sessionId!, {
        user_ids: Array.from(selectedUserIds)
      });
      
      if (result.success) {
        // Clear selection and refresh data
        setSelectedUserIds(new Set());
        fetchSessionDetail(); // Refresh session stats
        fetchAvailableUsers(); // Refresh available users
        setActiveTab('users'); // Switch to users tab to see added users
      } else {
        setError(result.message || 'Failed to add users to session');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add users to session');
    } finally {
      setAddingUsers(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const selectAllAvailableUsers = () => {
    setSelectedUserIds(new Set(availableUsers.map(user => user.id)));
  };

  const clearAllSelection = () => {
    setSelectedUserIds(new Set());
  };

  // Filter session users based on search
  const filteredSessionUsers = useMemo(() => {
    if (!userSearchTerm.trim()) return sessionUsers;
    
    const searchLower = userSearchTerm.toLowerCase();
    return sessionUsers.filter(user => 
      user.user_name?.toLowerCase().includes(searchLower) ||
      user.user_email?.toLowerCase().includes(searchLower)
    );
  }, [sessionUsers, userSearchTerm]);

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'started':
        return 'bg-blue-100 text-blue-800';
      case 'analyzed':
        return 'bg-purple-100 text-purple-800';
      case 'pending':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!sessionDetail) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Session not found</h3>
        <p className="mt-1 text-sm text-gray-500">The requested session could not be found.</p>
        <div className="mt-6">
          <button
            onClick={() => navigate(-1)}
            className="bg-blue-600 px-4 py-2 rounded-md text-sm font-medium text-white hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Navigation */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{sessionDetail.session_name}</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Session Detail - {sessionDetail.template_name}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Session Overview */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Session Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500">Template</div>
              <div className="text-lg font-semibold text-gray-900">{sessionDetail.template_name}</div>
              <div className="text-sm text-gray-600">{sessionDetail.level} • {sessionDetail.session_type}</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500">Total Users</div>
              <div className="text-2xl font-bold text-blue-600">{sessionDetail.total_users}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500">Started</div>
              <div className="text-2xl font-bold text-green-600">{sessionDetail.started_users}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500">Completed</div>
              <div className="text-2xl font-bold text-purple-600">{sessionDetail.completed_users}</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-500">
              Created: {new Date(sessionDetail.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => setError('')}
                  className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 Session Users ({sessionDetail.total_users})
            </button>
            <button
              onClick={() => setActiveTab('add-users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'add-users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ➕ Add Users
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              {/* Users Table */}
              {sessionUsersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredSessionUsers.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No users in session</h3>
                  <p className="mt-1 text-sm text-gray-500">Add users to this session to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Started
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Completed
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Score
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredSessionUsers.map((user) => (
                        <tr key={user.user_id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {user.user_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {user.user_email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(user.status)}`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.started_at ? new Date(user.started_at).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.completed_at ? new Date(user.completed_at).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.overall_score !== undefined ? `${user.overall_score}%` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'add-users' && (
            <div className="space-y-4">
              {/* Filter and Search */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">Showing Users</label>
                  <div className="mt-1 px-3 py-2 text-sm text-gray-600 bg-gray-50 border border-gray-300 rounded-md">
                    Users without this session
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">Search</label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={addUserSearchTerm}
                      onChange={(e) => setAddUserSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Selection Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={selectAllAvailableUsers}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearAllSelection}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Clear Selection
                  </button>
                </div>
                <div className="text-sm text-gray-500">
                  {selectedUserIds.size} users selected
                </div>
              </div>

              {/* Available Users */}
              {availableUsersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No available users</h3>
                  <p className="mt-1 text-sm text-gray-500">All users may already be assigned to this session.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.has(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                          <div className="text-sm text-gray-400">
                            Credits available
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Users Button */}
              {selectedUserIds.size > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={handleAddUsersToSession}
                    disabled={addingUsers}
                    className="bg-blue-600 px-6 py-2 rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingUsers ? 'Adding...' : `Add ${selectedUserIds.size} User${selectedUserIds.size === 1 ? '' : 's'} to Session`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchoolSessionDetailPage;