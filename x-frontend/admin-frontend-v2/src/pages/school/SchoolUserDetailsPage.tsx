/**
 * School User Details Page
 * Comprehensive user details view for school admins
 * Similar to admin user details but scoped to school
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { schoolApi, SchoolUserUpdateRequest } from '../../services/schoolApi';
import { useLanguages } from '../../hooks/useLanguages';


interface ComprehensiveUserDetails {
  user_id: string;
  email: string;
  name: string;
  current_level: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string | null;
  last_login: string | null;
  preferred_language_id: string;
  school_id: string;
  phone_number?: string;
  favorite_activities?: string[];
  daily_goal?: number;
  user_custom_school?: {
    student_code?: string;
    batch?: string;
    remark?: string;
  };

  usage_info: {
    allocated_count: number;
    used_count: number;
    remaining_count: number;
    plan_type: string;
    status: string;
    reserved_credits: number;
    reset_at: string | null;
    last_used: string | null;
  };

  practice_count: number;
  exam_count: number;
  last_practice_date: string | null;
  last_exam_date: string | null;

  preferences: {
    preferred_level: string;
    favorite_activities: string[];
    daily_goal: number;
    session_duration: number;
    difficulty_preference: string;
    preferred_language_id: string;
  };
}

const SchoolUserDetailsPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [userDetails, setUserDetails] = useState<ComprehensiveUserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [isEditingOtherDetails, setIsEditingOtherDetails] = useState(false);
  const [otherDetailsLoading, setOtherDetailsLoading] = useState(false);
  const [otherDetailsError, setOtherDetailsError] = useState('');
  const { languages: availableLanguages, loading: languagesLoading, getLanguageById } = useLanguages();
  
  // Edit form state
  const [editForm, setEditForm] = useState<SchoolUserUpdateRequest>({
    name: '',
    email: '',
    current_level: '',
    preferred_language_id: '',
    is_active: true
  });

  // Other Details form state (separate from main edit form)
  const [otherDetailsForm, setOtherDetailsForm] = useState({
    student_code: '',
    batch: '',
    remark: ''
  });

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const result = await schoolApi.getComprehensiveUserDetails(userId!);
      
      if (result.success && result.data) {
        setUserDetails(result.data);
        // Initialize edit form with current data
        setEditForm({
          name: result.data.name || '',
          email: result.data.email || '',
          current_level: result.data.current_level || '',
          preferred_language_id: result.data.preferred_language_id || '',
          is_active: result.data.is_active
        });

        // Initialize other details form
        setOtherDetailsForm({
          student_code: result.data.user_custom_school?.student_code || '',
          batch: result.data.user_custom_school?.batch || '',
          remark: result.data.user_custom_school?.remark || ''
        });
      } else {
        setError(result.message || 'Failed to load user details');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };


  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setEditLoading(true);
      setEditError('');
      
      const result = await schoolApi.updateUser(userId!, editForm);
      
      if (result.success) {
        setIsEditing(false);
        fetchUserDetails(); // Refresh data
      } else {
        setEditError(result.message || 'Failed to update user');
      }
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      setEditLoading(false);
    }
  };

  const handleActivateDeactivate = async () => {
    if (!userDetails) return;
    
    const action = userDetails.is_active ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }

    try {
      let result;
      if (userDetails.is_active) {
        // Deactivate user
        result = await schoolApi.deactivateUser(userId!);
      } else {
        // Activate user by updating is_active to true
        result = await schoolApi.updateUser(userId!, { is_active: true });
      }
      
      if (result.success) {
        fetchUserDetails(); // Refresh data
      } else {
        alert(result.message || `Failed to ${action} user`);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : `Failed to ${action} user`);
    }
  };

  const handleOtherDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setOtherDetailsLoading(true);
      setOtherDetailsError('');
      
      const result = await schoolApi.updateUser(userId!, {
        user_custom_school: otherDetailsForm
      });
      
      if (result.success) {
        setIsEditingOtherDetails(false);
        fetchUserDetails(); // Refresh data
      } else {
        setOtherDetailsError(result.message || 'Failed to update other details');
      }
    } catch (error) {
      setOtherDetailsError(error instanceof Error ? error.message : 'Failed to update other details');
    } finally {
      setOtherDetailsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading user details</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => navigate('/school/users')}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
              >
                Back to Users
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!userDetails) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">User not found</h3>
        <p className="mt-1 text-sm text-gray-500">The user you're looking for doesn't exist in your school.</p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/school/users')}
            className="bg-blue-600 px-4 py-2 rounded-md text-sm font-medium text-white hover:bg-blue-700"
          >
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-lg font-medium text-blue-600">
                    {userDetails.name?.charAt(0) || userDetails.email.charAt(0)}
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {userDetails.name || 'No name'}
                </h1>
                <p className="text-sm text-gray-500">{userDetails.email}</p>
                <div className="mt-1 flex items-center space-x-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    userDetails.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {userDetails.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    Level {userDetails.current_level}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="bg-blue-600 px-4 py-2 rounded-md text-sm font-medium text-white hover:bg-blue-700"
              >
                {isEditing ? 'Cancel Edit' : 'Edit User'}
              </button>
              <button
                onClick={handleActivateDeactivate}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  userDetails.is_active
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {userDetails.is_active ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => navigate('/school/users')}
                className="bg-gray-100 px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Back to Users
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information / Edit Form */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {isEditing ? 'Edit User Information' : 'Basic Information'}
            </h3>
            
            {isEditing ? (
              <form onSubmit={handleEditSubmit} className="space-y-4">
                {editError && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="text-sm text-red-700">{editError}</div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Level</label>
                  <select
                    value={editForm.current_level}
                    onChange={(e) => setEditForm(prev => ({ ...prev, current_level: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Preferred Language</label>
                  <select
                    value={editForm.preferred_language_id}
                    onChange={(e) => setEditForm(prev => ({ ...prev, preferred_language_id: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={languagesLoading}
                  >
                    <option value="">Select a language...</option>
                    {availableLanguages.map((lang) => (
                      <option key={lang.language_id} value={lang.language_id}>
                        {lang.language_name} {lang.native_name && `(${lang.native_name})`}
                      </option>
                    ))}
                  </select>
                </div>

                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <dl className="divide-y divide-gray-100">
                <div className="py-3 first:pt-0 last:pb-0">
                  <dt className="text-sm font-medium text-gray-600 mb-1">Email</dt>
                  <dd className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{userDetails.email}</dd>
                </div>
                <div className="py-3">
                  <dt className="text-sm font-medium text-gray-600 mb-1">Name</dt>
                  <dd className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{userDetails.name || 'Not provided'}</dd>
                </div>
                <div className="py-3">
                  <dt className="text-sm font-medium text-gray-600 mb-1">Current Level</dt>
                  <dd className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{userDetails.current_level}</dd>
                </div>
                <div className="py-3">
                  <dt className="text-sm font-medium text-gray-600 mb-1">Preferred Language</dt>
                  <dd className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                    {getLanguageById(userDetails.preferred_language_id)?.language_name || 'Not set'}
                  </dd>
                </div>
                <div className="py-3">
                  <dt className="text-sm font-medium text-gray-600 mb-1">Phone Number</dt>
                  <dd className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{userDetails.phone_number || 'Not provided'}</dd>
                </div>
                <div className="py-3">
                  <dt className="text-sm font-medium text-gray-600 mb-1">Email Verified</dt>
                  <dd className="text-sm text-gray-900">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                      userDetails.email_verified 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {userDetails.email_verified ? 'Verified' : 'Not Verified'}
                    </span>
                  </dd>
                </div>
                <div className="py-3">
                  <dt className="text-sm font-medium text-gray-600 mb-1">Created</dt>
                  <dd className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                    {userDetails.created_at ? new Date(userDetails.created_at).toLocaleDateString() : 'Unknown'}
                  </dd>
                </div>
                <div className="py-3 last:pb-0">
                  <dt className="text-sm font-medium text-gray-600 mb-1">Last Login</dt>
                  <dd className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                    {userDetails.last_login ? new Date(userDetails.last_login).toLocaleDateString() : 'Never'}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </div>

        {/* Other Details Section - Separate and Editable */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Other Details</h3>
              <button
                onClick={() => setIsEditingOtherDetails(!isEditingOtherDetails)}
                className="bg-blue-600 px-3 py-1 rounded-md text-sm font-medium text-white hover:bg-blue-700"
              >
                {isEditingOtherDetails ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {isEditingOtherDetails ? (
              <form onSubmit={handleOtherDetailsSubmit} className="space-y-4">
                {otherDetailsError && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="text-sm text-red-700">{otherDetailsError}</div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Student Code</label>
                    <input
                      type="text"
                      value={otherDetailsForm.student_code}
                      onChange={(e) => setOtherDetailsForm(prev => ({ ...prev, student_code: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter student code"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Batch</label>
                    <input
                      type="text"
                      value={otherDetailsForm.batch}
                      onChange={(e) => setOtherDetailsForm(prev => ({ ...prev, batch: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter batch"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Remark</label>
                  <textarea
                    value={otherDetailsForm.remark}
                    onChange={(e) => setOtherDetailsForm(prev => ({ ...prev, remark: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Enter remarks"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditingOtherDetails(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={otherDetailsLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {otherDetailsLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <dl className="divide-y divide-gray-100">
                <div className="py-3 first:pt-0">
                  <dt className="text-sm font-medium text-gray-600 mb-1">Student Code</dt>
                  <dd className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md font-mono">
                    {userDetails.user_custom_school?.student_code || 'Not provided'}
                  </dd>
                </div>
                <div className="py-3">
                  <dt className="text-sm font-medium text-gray-600 mb-1">Batch</dt>
                  <dd className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                    {userDetails.user_custom_school?.batch || 'Not provided'}
                  </dd>
                </div>
                <div className="py-3">
                  <dt className="text-sm font-medium text-gray-600 mb-1">Remark</dt>
                  <dd className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                    {userDetails.user_custom_school?.remark || 'No remarks'}
                  </dd>
                </div>
                <div className="py-3 last:pb-0">
                  <dt className="text-sm font-medium text-gray-600 mb-1">Favorite Activities</dt>
                  <dd className="text-sm text-gray-900">
                    {userDetails.preferences.favorite_activities && userDetails.preferences.favorite_activities.length > 0 ? (
                      <div className="bg-gray-50 px-3 py-2 rounded-md">
                        <div className="flex flex-wrap gap-2">
                          {userDetails.preferences.favorite_activities.map((activity, index) => (
                            <span
                              key={index}
                              className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 border border-blue-200"
                            >
                              {activity}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 px-3 py-2 rounded-md text-gray-500 italic">
                        No favorite activities set
                      </div>
                    )}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </div>
      </div>

      {/* Second Row Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Statistics */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Activity Statistics</h3>
              <button
                onClick={() => navigate(`/school/users/${userId}/activities`)}
                className="bg-blue-600 px-3 py-1 rounded-md text-sm font-medium text-white hover:bg-blue-700"
              >
                View All
              </button>
            </div>
            <dl className="divide-y divide-gray-100">
              <div className="py-3 first:pt-0">
                <dt className="text-sm font-medium text-gray-600 mb-1">Practice Sessions</dt>
                <dd className="text-sm text-gray-900 bg-blue-50 px-3 py-2 rounded-md font-semibold text-blue-800">{userDetails.practice_count}</dd>
              </div>
              <div className="py-3">
                <dt className="text-sm font-medium text-gray-600 mb-1">Exams Taken</dt>
                <dd className="text-sm text-gray-900 bg-purple-50 px-3 py-2 rounded-md font-semibold text-purple-800">{userDetails.exam_count}</dd>
              </div>
              <div className="py-3">
                <dt className="text-sm font-medium text-gray-600 mb-1">Last Practice</dt>
                <dd className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                  {userDetails.last_practice_date ? new Date(userDetails.last_practice_date).toLocaleDateString() : 'Never'}
                </dd>
              </div>
              <div className="py-3">
                <dt className="text-sm font-medium text-gray-600 mb-1">Last Exam</dt>
                <dd className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                  {userDetails.last_exam_date ? new Date(userDetails.last_exam_date).toLocaleDateString() : 'Never'}
                </dd>
              </div>
              <div className="py-3">
                <dt className="text-sm font-medium text-gray-600 mb-1">Daily Goal</dt>
                <dd className="text-sm text-gray-900 bg-green-50 px-3 py-2 rounded-md font-medium text-green-800">
                  {userDetails.preferences.daily_goal} minutes
                </dd>
              </div>
              <div className="py-3">
                <dt className="text-sm font-medium text-gray-600 mb-1">Session Duration</dt>
                <dd className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                  {userDetails.preferences.session_duration} minutes
                </dd>
              </div>
              <div className="py-3 last:pb-0">
                <dt className="text-sm font-medium text-gray-600 mb-1">Difficulty Preference</dt>
                <dd className="text-sm text-gray-900">
                  <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 capitalize">
                    {userDetails.preferences.difficulty_preference}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Usage Summary */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Usage Summary</h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-600 mb-1">Plan Type</dt>
                <dd className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md font-mono">{userDetails.usage_info.plan_type}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600 mb-1">Credits Consumed</dt>
                <dd className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{userDetails.usage_info.used_count}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600 mb-1">Practice Sessions</dt>
                <dd className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{userDetails.practice_count}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600 mb-1">Exam Sessions</dt>
                <dd className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{userDetails.exam_count}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600 mb-1">Last Usage</dt>
                <dd className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                  {userDetails.usage_info.last_used ? new Date(userDetails.usage_info.last_used).toLocaleDateString() : 'Never'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600 mb-1">Access Expires</dt>
                <dd className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                  {userDetails.usage_info.access_expires ? new Date(userDetails.usage_info.access_expires).toLocaleDateString() : 'Not set'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

    </div>
  );
};

export default SchoolUserDetailsPage;
