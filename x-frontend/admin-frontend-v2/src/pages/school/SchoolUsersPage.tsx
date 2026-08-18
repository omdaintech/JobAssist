/**
 * School Users Management Page
 * Manage users within the school's scope
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  schoolApi,
  SchoolSessionCreateData,
  SchoolSessionCreateRequest,
  SchoolTemplate,
  SchoolUser,
  SchoolUserCreateRequest,
  SchoolUserFilters,
} from '../../services/schoolApi';
import { useLanguages } from '../../hooks/useLanguages';

interface TemplateSessionIntent {
  templateId: string;
  templateName?: string;
  level?: 'A1' | 'A2' | 'B1';
  sessionType?: 'exam' | 'practice';
}

const SchoolUsersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<SchoolUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showCreateSessionsModal, setShowCreateSessionsModal] = useState(false);
  const [templateIntent, setTemplateIntent] = useState<TemplateSessionIntent | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState<SchoolUserFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const pageSize = 20;

  const selectedUsersCount = selectedUsers.size;
  const areAllCurrentSelected = users.length > 0 && users.every(user => selectedUsers.has(user.id));

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const toggleSelectCurrentPage = () => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (areAllCurrentSelected) {
        users.forEach(user => next.delete(user.id));
      } else {
        users.forEach(user => next.add(user.id));
      }
      return next;
    });
  };

  // Check if we should show create modal from URL params
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setShowCreateModal(true);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('action');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const templateId = searchParams.get('createSessionTemplate');
    if (!templateId) {
      return;
    }

    const templateName = searchParams.get('templateName') ?? undefined;
    const templateLevel = searchParams.get('templateLevel') ?? undefined;
    const templateSessionType = searchParams.get('templateSessionType') ?? undefined;

    const normalizedLevel =
      templateLevel === 'A1' || templateLevel === 'A2' || templateLevel === 'B1'
        ? (templateLevel as 'A1' | 'A2' | 'B1')
        : undefined;

    const normalizedSessionType =
      templateSessionType === 'exam' || templateSessionType === 'practice'
        ? (templateSessionType as 'exam' | 'practice')
        : undefined;

    setTemplateIntent({
      templateId,
      templateName,
      level: normalizedLevel,
      sessionType: normalizedSessionType,
    });

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('createSessionTemplate');
    nextParams.delete('templateName');
    nextParams.delete('templateLevel');
    nextParams.delete('templateSessionType');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const fetchUsers = async (page: number = 1, currentFilters: SchoolUserFilters = filters) => {
    try {
      setLoading(true);
      const skip = (page - 1) * pageSize;
      const result = await schoolApi.getUsers(skip, pageSize, currentFilters);
      
      if (result.success) {
        // API returns data at root level, not nested under 'data'
        const users = result.users || [];
        const totalCount = result.total_count || 0;
        setUsers(users);
        setTotalCount(totalCount);
        setCurrentPage(page);
      } else {
        setError(result.message || 'Failed to load users');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSessionsModalClose = () => {
    setShowCreateSessionsModal(false);
    setSelectedUsers(new Set());
  };

  const handleSessionCreationCompleted = () => {
    fetchUsers(currentPage);
  };

  const handleFilterChange = (key: keyof SchoolUserFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    // Reset to page 1 when filters change
    fetchUsers(1, newFilters);
  };

  const clearFilters = () => {
    const emptyFilters: SchoolUserFilters = {};
    setFilters(emptyFilters);
    fetchUsers(1, emptyFilters);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (userData: SchoolUserCreateRequest) => {
    try {
      setCreateLoading(true);
      setCreateError('');
      
      const result = await schoolApi.createUser(userData);
      
      if (result.success) {
        setShowCreateModal(false);
        fetchUsers(currentPage); // Refresh current page
      } else {
        setCreateError(result.message || 'Failed to create user');
      }
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };


  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your school's users and their access.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={selectedUsersCount === 0}
            onClick={() => setShowCreateSessionsModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Create Sessions ({selectedUsersCount})
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Add User
          </button>
        </div>
      </div>

      {templateIntent && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <div className="font-medium text-blue-900">
            Preparing a session for {templateIntent.templateName ?? 'your selected template'}
          </div>
          <div className="mt-1 text-blue-700">
            Select the users you want to include, then click “Create Sessions”. We&apos;ll preselect the template details for you.
            {templateIntent.level && (
              <span className="ml-1 font-medium">Level: {templateIntent.level}</span>
            )}
            {templateIntent.sessionType && (
              <span className="ml-1 font-medium">
                · Type: {templateIntent.sessionType === 'exam' ? 'Exam' : 'Practice'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="mt-6 bg-white shadow rounded-lg">
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="px-4 py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Active Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.is_active === undefined ? '' : filters.is_active.toString()}
                  onChange={(e) => handleFilterChange('is_active', e.target.value === '' ? undefined : e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              {/* Email Verified */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Verified
                </label>
                <select
                  value={filters.email_verified === undefined ? '' : filters.email_verified.toString()}
                  onChange={(e) => handleFilterChange('email_verified', e.target.value === '' ? undefined : e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All</option>
                  <option value="true">Verified</option>
                  <option value="false">Not Verified</option>
                </select>
              </div>

              {/* CEFR Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CEFR Level
                </label>
                <select
                  value={filters.current_level || ''}
                  onChange={(e) => handleFilterChange('current_level', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Levels</option>
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                </select>
              </div>
            </div>

            {/* Date Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Created After
                </label>
                <input
                  type="date"
                  value={filters.created_after ? filters.created_after.split('T')[0] : ''}
                  onChange={(e) => handleFilterChange('created_after', e.target.value ? `${e.target.value}T00:00:00` : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Created Before
                </label>
                <input
                  type="date"
                  value={filters.created_before ? filters.created_before.split('T')[0] : ''}
                  onChange={(e) => handleFilterChange('created_before', e.target.value ? `${e.target.value}T23:59:59` : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={areAllCurrentSelected}
                        onChange={toggleSelectCurrentPage}
                        aria-label="Select all users on this page"
                      />
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Level
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Credits
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          aria-label={`Select ${user.name || user.email}`}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {user.name?.charAt(0) || user.email.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.name || 'No name'}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {user.current_level}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span>{user.access?.used_count ?? 0} / {user.access?.allocated_count ?? 0}</span>
                          <span className="text-xs text-gray-500">{user.access?.plan_type ?? 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.last_login 
                          ? new Date(user.last_login).toLocaleDateString()
                          : 'Never'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => window.location.href = `/school/users/${user.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => fetchUsers(currentPage - 1)}
              disabled={currentPage <= 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => fetchUsers(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * pageSize, totalCount)}
                </span>{' '}
                of <span className="font-medium">{totalCount}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => fetchUsers(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => fetchUsers(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => fetchUsers(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {showCreateSessionsModal && (
        <CreateSessionsModal
          userIds={Array.from(selectedUsers)}
          onClose={handleSessionsModalClose}
          onCompleted={handleSessionCreationCompleted}
          templateIntent={templateIntent}
        />
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateUser}
          loading={createLoading}
          error={createError}
        />
      )}
    </div>
  );
};

// Create User Modal Component
interface CreateUserModalProps {
  onClose: () => void;
  onSubmit: (userData: SchoolUserCreateRequest) => void;
  loading: boolean;
  error: string;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ onClose, onSubmit, loading, error }) => {
  const [formData, setFormData] = useState<SchoolUserCreateRequest>({
    email: '',
    name: '',
    password: '',
    current_level: 'A1',
    preferred_language_id: '687b9e32e94239d063f47070', // Default to English
    plan_type: 'pp_starter',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New User</h3>
          
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Level</label>
              <select
                name="current_level"
                value={formData.current_level}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

interface CreateSessionsModalProps {
  userIds: string[];
  onClose: () => void;
  onCompleted: () => void;
  templateIntent?: TemplateSessionIntent | null;
}

const CreateSessionsModal: React.FC<CreateSessionsModalProps> = ({ userIds, onClose, onCompleted, templateIntent }) => {
  const [templates, setTemplates] = useState<SchoolTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [level, setLevel] = useState<'A1' | 'A2' | 'B1'>('A1');
  const [languageId, setLanguageId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resultSummary, setResultSummary] = useState<SchoolSessionCreateData | null>(null);
  const { languages, loading: languagesLoading, error: languagesError } = useLanguages();

  useEffect(() => {
    const loadTemplates = async () => {
      setTemplatesLoading(true);
      setTemplatesError(null);
      try {
        const result = await schoolApi.getTemplates();
        if (result.success && result.templates) {
          setTemplates(result.templates);
        } else {
          setTemplates([]);
          setTemplatesError(result.message || 'Failed to load templates');
        }
      } catch (error) {
        setTemplates([]);
        setTemplatesError(error instanceof Error ? error.message : 'Failed to load templates');
      } finally {
        setTemplatesLoading(false);
      }
    };

    loadTemplates();
  }, []);

  useEffect(() => {
    // Only check if languageId is set and languages are loaded
    if (!languageId || languagesLoading || languages.length === 0) {
      return;
    }

    const stillAvailable = languages.some(language => language.language_id === languageId);
    if (!stillAvailable) {
      setLanguageId('');
      setResultSummary(null);
    }
  }, [languages, languageId, languagesLoading]);

  useEffect(() => {
    if (!templates.length) {
      return;
    }

    if (templateIntent?.templateId) {
      const match = templates.find(t => t.id === templateIntent.templateId);
      if (match && match.id !== selectedTemplateId) {
        setSelectedTemplateId(match.id);
        return;
      }
    }

    if (!selectedTemplateId && templates.length > 0) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates, templateIntent, selectedTemplateId]);

  useEffect(() => {
    if (!templateIntent) {
      return;
    }

    if (templateIntent.templateName) {
      setSessionName(prev => (prev ? prev : `${templateIntent.templateName} session`));
    }

    if (templateIntent.level) {
      setLevel(templateIntent.level);
    }
  }, [templateIntent]);

  useEffect(() => {
    if (!selectedTemplateId) return;
    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    if (template.level === 'A1' || template.level === 'A2' || template.level === 'B1') {
      setLevel(template.level);
    }

    setSessionName(prev => (prev ? prev : `${template.template_name} session`));
  }, [selectedTemplateId, templates]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    if (!selectedTemplateId) {
      setSubmitError('Select a template');
      return;
    }

    if (!sessionName.trim()) {
      setSubmitError('Enter a session name');
      return;
    }

    if (!languageId) {
      setSubmitError('Select a language');
      return;
    }

    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) {
      setSubmitError('Selected template is no longer available');
      return;
    }

    const payload: SchoolSessionCreateRequest = {
      template_id: template.id,
      session_name: sessionName.trim(),
      user_ids: userIds,
      language_id: languageId,
      level,
      session_type: template.session_type,
    };

    try {
      setSubmitting(true);
      const result = await schoolApi.createSessionsForUsers(payload);
      if (result.success && result.data) {
        setResultSummary(result.data);
        onCompleted();
      } else {
        setSubmitError(result.message || 'Failed to create sessions');
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create sessions');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50 p-4">
      <div className="w-full max-w-2xl rounded-md border bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Create Sessions for Users</h3>
            <p className="mt-1 text-sm text-gray-500">Selected users: {userIds.length}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {templatesError && (
          <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-700">{templatesError}</div>
        )}

        {languagesError && (
          <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
            Failed to load languages: {languagesError}
          </div>
        )}

        {submitError && (
          <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-700">{submitError}</div>
        )}

        {resultSummary && (
          <div className="mt-4 rounded-md bg-green-50 p-4 text-sm text-green-700">
            <p className="font-semibold">Sessions created</p>
            <p className="mt-1">
              Successful: {resultSummary.summary.successful} · Failed: {resultSummary.summary.failed}
            </p>
            {resultSummary.failed_sessions.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-green-800">View failed users</summary>
                <ul className="mt-2 space-y-1 text-green-900">
                  {resultSummary.failed_sessions.map(item => (
                    <li key={item.user_id} className="text-sm">
                      {item.user_email || item.user_id}: {item.error}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Template</label>
            <select
              value={selectedTemplateId}
              onChange={event => {
                setSelectedTemplateId(event.target.value);
                setSessionName('');
                setResultSummary(null);
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              disabled={templatesLoading || templates.length === 0}
            >
              {templatesLoading && <option value="">Loading templates...</option>}
              {!templatesLoading && templates.length === 0 && <option value="">No templates available</option>}
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.template_name} ({template.session_type} · {template.level})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Session name</label>
            <input
              type="text"
              value={sessionName}
              onChange={event => {
                setSessionName(event.target.value);
                setResultSummary(null);
              }}
              placeholder="Exam preparation session"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Language</label>
              <select
                value={languageId}
                onChange={event => {
                  setLanguageId(event.target.value);
                  setResultSummary(null);
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                disabled={languagesLoading || languages.length === 0}
              >
                {languagesLoading && <option value="">Loading languages...</option>}
                {!languagesLoading && languages.length === 0 && <option value="">No languages available</option>}
                {!languagesLoading && languages.length > 0 && <option value="">Select language</option>}
                {languages.map(language => (
                  <option key={language.language_id} value={language.language_id}>
                    {language.language_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Level</label>
              <select
                value={level}
                onChange={event => {
                  setLevel(event.target.value as 'A1' | 'A2' | 'B1');
                  setResultSummary(null);
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              >
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={submitting || templatesLoading || languagesLoading || userIds.length === 0}
              className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Creating...' : 'Create Sessions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SchoolUsersPage;
