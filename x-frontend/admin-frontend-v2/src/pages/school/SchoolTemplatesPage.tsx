/**
 * School Templates Page
 * Template management interface for school admins
 * Allows CRUD operations on exam and practice templates
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  schoolApi, 
  SchoolTemplate, 
  SchoolTemplateCreateRequest, 
  SchoolTemplateUpdateRequest 
} from '../../services/schoolApi';

const SchoolTemplatesPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [templates, setTemplates] = useState<SchoolTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SchoolTemplate | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Filter states - Initialize from URL
  const [levelFilter, setLevelFilter] = useState<string>(() => {
    const params = new URLSearchParams(location.search);
    return params.get('level') || '';
  });
  const [sessionTypeFilter, setSessionTypeFilter] = useState<string>(() => {
    const params = new URLSearchParams(location.search);
    return params.get('session_type') || '';
  });

  // Form states
  const [createForm, setCreateForm] = useState<SchoolTemplateCreateRequest>({
    template_name: '',
    level: 'A1',
    session_type: 'exam',
    template_data: {
      reading: 0,
      writing: 0,
      grammar: 0,
      hearing: 0,
      speaking: 0
    }
  });

  const [editForm, setEditForm] = useState<SchoolTemplateUpdateRequest>({});

  useEffect(() => {
    fetchTemplates();
  }, [levelFilter, sessionTypeFilter]);

  // Helper function to update URL with current filters
  const updateUrlWithFilters = (level: string, sessionType: string) => {
    const params = new URLSearchParams();
    
    if (level) params.set('level', level);
    if (sessionType) params.set('session_type', sessionType);
    
    const newUrl = params.toString() 
      ? `${location.pathname}?${params.toString()}`
      : location.pathname;
    
    navigate(newUrl, { replace: true });
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const result = await schoolApi.getTemplates(
        levelFilter || undefined, 
        sessionTypeFilter || undefined
      );
      
      if (result.success) {
        setTemplates(result.templates);
      } else {
        setError(result.message || 'Failed to load templates');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate template data
    const totalActivities = Object.values(createForm.template_data).reduce((sum, count) => sum + count, 0);
    
    if (createForm.session_type === 'practice') {
      const nonZeroActivities = Object.values(createForm.template_data).filter(count => count > 0);
      if (nonZeroActivities.length !== 1) {
        setError('Practice sessions must have exactly one activity type with count > 0');
        return;
      }
    } else if (totalActivities === 0) {
      setError('Exam sessions must have at least one activity with count > 0');
      return;
    }

    // Check max 15 activities per type
    for (const [activity, count] of Object.entries(createForm.template_data)) {
      if (count > 15) {
        setError(`Maximum 15 activities allowed per type. ${activity} has ${count}`);
        return;
      }
    }

    try {
      setCreateLoading(true);
      setError('');
      
      const result = await schoolApi.createTemplate(createForm);
      
      if (result.success) {
        setIsCreateModalOpen(false);
        setCreateForm({
          template_name: '',
          level: 'A1',
          session_type: 'exam',
          template_data: { reading: 0, writing: 0, grammar: 0, hearing: 0, speaking: 0 }
        });
        fetchTemplates();
      } else {
        setError(result.message || 'Failed to create template');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create template');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    // Validate template data if provided
    if (editForm.template_data) {
      const totalActivities = Object.values(editForm.template_data).reduce((sum, count) => sum + count, 0);
      
      const sessionType = editForm.session_type || editingTemplate.session_type;
      if (sessionType === 'practice') {
        const nonZeroActivities = Object.values(editForm.template_data).filter(count => count > 0);
        if (nonZeroActivities.length !== 1) {
          setError('Practice sessions must have exactly one activity type with count > 0');
          return;
        }
      } else if (totalActivities === 0) {
        setError('Exam sessions must have at least one activity with count > 0');
        return;
      }

      // Check max 15 activities per type
      for (const [activity, count] of Object.entries(editForm.template_data)) {
        if (count > 15) {
          setError(`Maximum 15 activities allowed per type. ${activity} has ${count}`);
          return;
        }
      }
    }

    try {
      setEditLoading(true);
      setError('');
      
      const result = await schoolApi.updateTemplate(editingTemplate.id, editForm);
      
      if (result.success) {
        setIsEditModalOpen(false);
        setEditingTemplate(null);
        setEditForm({});
        fetchTemplates();
      } else {
        setError(result.message || 'Failed to update template');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update template');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (template: SchoolTemplate) => {
    try {
      setDeleteLoading(template.id);
      
      // First try to delete normally (which will check for usage)
      const result = await schoolApi.deleteTemplate(template.id, false);
      
      if (result.success) {
        // Template was deleted successfully (no usage)
        fetchTemplates();
        return;
      }
      
      // Check if it requires confirmation for deactivation
      if (result.data?.action === 'requires_confirmation') {
        const { total_sessions, active_sessions, can_deactivate } = result.data;
        
        if (!can_deactivate) {
          setError(`Cannot deactivate template. ${active_sessions} active sessions are using this template. Please wait for sessions to complete.`);
          return;
        }
        
        const shouldDeactivate = confirm(
          `"${template.template_name}" has been used in ${total_sessions} sessions and cannot be deleted. Would you like to deactivate it instead?\n\nDeactivated templates:\n• Cannot be used for new sessions\n• Preserve all existing session data\n• Can be reactivated later if needed\n\nThis action will deactivate the template.`
        );
        
        if (shouldDeactivate) {
          // Send request to force deactivate
          const deactivateResult = await schoolApi.deleteTemplate(template.id, true);
          
          if (deactivateResult.success) {
            fetchTemplates();
          } else {
            setError(deactivateResult.message || 'Failed to deactivate template');
          }
        }
      } else {
        // Some other error occurred
        setError(result.message || 'Failed to delete template');
      }
      
    } catch (error) {
      // Network or other error
      setError(error instanceof Error ? error.message : 'Failed to delete template');
    } finally {
      setDeleteLoading(null);
    }
  };

  const openEditModal = (template: SchoolTemplate) => {
    setEditingTemplate(template);
    setEditForm({
      template_name: template.template_name,
      level: template.level as any,
      session_type: template.session_type,
      template_data: { ...template.template_data }
    });
    setIsEditModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Exam Templates</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage exam and practice session templates for your school
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 px-4 py-2 rounded-md text-sm font-medium text-white hover:bg-blue-700"
            >
              Create Template
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Level Filter</label>
              <select
                value={levelFilter}
                onChange={(e) => {
                  const newLevel = e.target.value;
                  setLevelFilter(newLevel);
                  updateUrlWithFilters(newLevel, sessionTypeFilter);
                }}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Levels</option>
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="ALL">ALL</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Session Type Filter</label>
              <select
                value={sessionTypeFilter}
                onChange={(e) => {
                  const newSessionType = e.target.value;
                  setSessionTypeFilter(newSessionType);
                  updateUrlWithFilters(levelFilter, newSessionType);
                }}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="exam">Exam</option>
                <option value="practice">Practice</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setLevelFilter('');
                  setSessionTypeFilter('');
                  navigate(location.pathname, { replace: true });
                }}
                className="bg-gray-100 px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Clear Filters
              </button>
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

      {/* Templates List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No templates</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new template.</p>
              <div className="mt-6">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-blue-600 px-4 py-2 rounded-md text-sm font-medium text-white hover:bg-blue-700"
                >
                  Create Template
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Template Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activities
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {templates.map((template) => (
                    <tr key={template.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{template.template_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {template.level}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          template.session_type === 'exam' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {template.session_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex space-x-2">
                          {template.template_data.reading > 0 && (
                            <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                              R: {template.template_data.reading}
                            </span>
                          )}
                          {template.template_data.writing > 0 && (
                            <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                              W: {template.template_data.writing}
                            </span>
                          )}
                          {template.template_data.grammar > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-1 mb-1">
                              G: {template.template_data.grammar}
                            </span>
                          )}
                          {template.template_data.hearing > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 mr-1 mb-1">
                              H: {template.template_data.hearing}
                            </span>
                          )}
                          {(template.template_data.speaking || 0) > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mr-1 mb-1">
                              S: {template.template_data.speaking}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {template.created_at ? new Date(template.created_at).toLocaleDateString() : 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditModal(template)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <Link
                            to={`/school/templates/${template.id}/usage`}
                            className="text-green-600 hover:text-green-900"
                          >
                            View Usage
                          </Link>
                          <button
                            onClick={() => handleDelete(template)}
                            disabled={deleteLoading === template.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            {deleteLoading === template.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Template Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Template</h3>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Template Name</label>
                  <input
                    type="text"
                    value={createForm.template_name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, template_name: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Level</label>
                  <select
                    value={createForm.level}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, level: e.target.value as any }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                    <option value="ALL">ALL</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Session Type</label>
                  <select
                    value={createForm.session_type}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, session_type: e.target.value as any }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="exam">Exam</option>
                    <option value="practice">Practice</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reading</label>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={createForm.template_data.reading}
                      onChange={(e) => setCreateForm(prev => ({ 
                        ...prev, 
                        template_data: { ...prev.template_data, reading: parseInt(e.target.value) || 0 }
                      }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Writing</label>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={createForm.template_data.writing}
                      onChange={(e) => setCreateForm(prev => ({ 
                        ...prev, 
                        template_data: { ...prev.template_data, writing: parseInt(e.target.value) || 0 }
                      }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Grammar</label>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={createForm.template_data.grammar}
                      onChange={(e) => setCreateForm(prev => ({ 
                        ...prev, 
                        template_data: { ...prev.template_data, grammar: parseInt(e.target.value) || 0 }
                      }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  {/* Hearing Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Listening</label>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={createForm.template_data.hearing}
                      onChange={(e) => setCreateForm(prev => ({ 
                        ...prev, 
                        template_data: { ...prev.template_data, hearing: parseInt(e.target.value) || 0 }
                      }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  {/* Speaking Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Speaking</label>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={createForm.template_data.speaking || 0}
                      onChange={(e) => setCreateForm(prev => ({ 
                        ...prev, 
                        template_data: { ...prev.template_data, speaking: parseInt(e.target.value) || 0 }
                      }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="text-xs text-gray-500">
                  <p>• Maximum 15 activities per type</p>
                  <p>• Practice sessions: exactly one activity type must be &gt; 0</p>
                  <p>• Exam sessions: at least one activity must be &gt; 0</p>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createLoading ? 'Creating...' : 'Create Template'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {isEditModalOpen && editingTemplate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Template</h3>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Template Name</label>
                  <input
                    type="text"
                    value={editForm.template_name || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, template_name: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Level</label>
                  <select
                    value={editForm.level || editingTemplate.level}
                    onChange={(e) => setEditForm(prev => ({ ...prev, level: e.target.value as any }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                    <option value="ALL">ALL</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Session Type</label>
                  <select
                    value={editForm.session_type || editingTemplate.session_type}
                    onChange={(e) => setEditForm(prev => ({ ...prev, session_type: e.target.value as any }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="exam">Exam</option>
                    <option value="practice">Practice</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reading</label>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={editForm.template_data?.reading ?? editingTemplate.template_data.reading}
                      onChange={(e) => setEditForm(prev => ({ 
                        ...prev, 
                        template_data: { 
                          ...prev.template_data, 
                          reading: parseInt(e.target.value) || 0,
                          writing: prev.template_data?.writing ?? editingTemplate.template_data.writing,
                          grammar: prev.template_data?.grammar ?? editingTemplate.template_data.grammar,
                          hearing: prev.template_data?.hearing ?? editingTemplate.template_data.hearing,
                          speaking: prev.template_data?.speaking ?? (editingTemplate.template_data.speaking || 0)
                        }
                      }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Writing</label>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={editForm.template_data?.writing ?? editingTemplate.template_data.writing}
                      onChange={(e) => setEditForm(prev => ({ 
                        ...prev, 
                        template_data: { 
                          ...prev.template_data, 
                          reading: prev.template_data?.reading ?? editingTemplate.template_data.reading,
                          writing: parseInt(e.target.value) || 0,
                          grammar: prev.template_data?.grammar ?? editingTemplate.template_data.grammar,
                          hearing: prev.template_data?.hearing ?? editingTemplate.template_data.hearing,
                          speaking: prev.template_data?.speaking ?? (editingTemplate.template_data.speaking || 0)
                        }
                      }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Grammar</label>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={editForm.template_data?.grammar ?? editingTemplate.template_data.grammar}
                      onChange={(e) => setEditForm(prev => ({ 
                        ...prev, 
                        template_data: { 
                          ...prev.template_data, 
                          reading: prev.template_data?.reading ?? editingTemplate.template_data.reading,
                          writing: prev.template_data?.writing ?? editingTemplate.template_data.writing,
                          grammar: parseInt(e.target.value) || 0,
                          hearing: prev.template_data?.hearing ?? editingTemplate.template_data.hearing,
                          speaking: prev.template_data?.speaking ?? (editingTemplate.template_data.speaking || 0)
                        }
                      }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  {/* Hearing Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Listening</label>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={editForm.template_data?.hearing ?? editingTemplate.template_data.hearing}
                      onChange={(e) => setEditForm(prev => ({ 
                        ...prev, 
                        template_data: { 
                          ...prev.template_data, 
                          reading: prev.template_data?.reading ?? editingTemplate.template_data.reading,
                          writing: prev.template_data?.writing ?? editingTemplate.template_data.writing,
                          grammar: prev.template_data?.grammar ?? editingTemplate.template_data.grammar,
                          hearing: parseInt(e.target.value) || 0,
                          speaking: prev.template_data?.speaking ?? (editingTemplate.template_data.speaking || 0)
                        }
                      }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  {/* Speaking Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Speaking</label>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={editForm.template_data?.speaking ?? (editingTemplate.template_data.speaking || 0)}
                      onChange={(e) => setEditForm(prev => ({ 
                        ...prev, 
                        template_data: { 
                          ...prev.template_data, 
                          reading: prev.template_data?.reading ?? editingTemplate.template_data.reading,
                          writing: prev.template_data?.writing ?? editingTemplate.template_data.writing,
                          grammar: prev.template_data?.grammar ?? editingTemplate.template_data.grammar,
                          hearing: prev.template_data?.hearing ?? editingTemplate.template_data.hearing,
                          speaking: parseInt(e.target.value) || 0
                        }
                      }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="text-xs text-gray-500">
                  <p>• Maximum 15 activities per type</p>
                  <p>• Practice sessions: exactly one activity type must be &gt; 0</p>
                  <p>• Exam sessions: at least one activity must be &gt; 0</p>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editLoading ? 'Updating...' : 'Update Template'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolTemplatesPage;
