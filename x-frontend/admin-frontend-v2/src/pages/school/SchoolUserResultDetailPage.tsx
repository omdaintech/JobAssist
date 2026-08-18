/**
 * School User Result Detail Page (Work in Progress)
 * Shows detailed analysis results for a specific session
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const SchoolUserResultDetailPage: React.FC = () => {
  const { userId, sessionId } = useParams<{ userId: string; sessionId: string }>();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Session Analysis Detail
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Session ID: {sessionId}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate(`/school/users/${userId}/activities`)}
                className="bg-gray-100 px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Back to Activities
              </button>
              <button
                onClick={() => navigate(`/school/users/${userId}`)}
                className="bg-blue-600 px-4 py-2 rounded-md text-sm font-medium text-white hover:bg-blue-700"
              >
                User Details
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Work in Progress Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-yellow-800">
                Work in Progress
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  This page is currently under development. It will show detailed analysis results 
                  including question-by-question breakdown, AI feedback, and performance insights.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Session Overview */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Session Overview</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="text-sm text-gray-600">Coming Soon:</div>
                <ul className="mt-2 text-sm text-gray-700 space-y-1">
                  <li>• Session metadata and timing</li>
                  <li>• Overall performance score</li>
                  <li>• CEFR level assessment</li>
                  <li>• Activity breakdown</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Question Analysis */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Question Analysis</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="text-sm text-gray-600">Coming Soon:</div>
                <ul className="mt-2 text-sm text-gray-700 space-y-1">
                  <li>• Question-by-question results</li>
                  <li>• User answers vs correct answers</li>
                  <li>• AI-generated feedback</li>
                  <li>• Error pattern analysis</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Insights</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="text-sm text-gray-600">Coming Soon:</div>
                <ul className="mt-2 text-sm text-gray-700 space-y-1">
                  <li>• Strengths and weaknesses</li>
                  <li>• Study recommendations</li>
                  <li>• Progress tracking</li>
                  <li>• Comparison with previous sessions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Credit Usage Detail */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Credit Usage Detail</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="text-sm text-gray-600">Coming Soon:</div>
                <ul className="mt-2 text-sm text-gray-700 space-y-1">
                  <li>• Credit deduction breakdown</li>
                  <li>• Processing costs</li>
                  <li>• LLM usage statistics</li>
                  <li>• Billing information</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Development Notes */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            Development Roadmap
          </h3>
          <div className="text-sm text-blue-800">
            <p className="mb-2">
              This page will integrate with the existing session analysis system to provide:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <h4 className="font-medium mb-2">Phase 1 - Basic Details:</h4>
                <ul className="space-y-1 text-sm">
                  <li>✓ Navigation structure</li>
                  <li>✓ Page layout</li>
                  <li>⏳ Session metadata display</li>
                  <li>⏳ Basic performance metrics</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Phase 2 - Advanced Features:</h4>
                <ul className="space-y-1 text-sm">
                  <li>⏳ Question-level analysis</li>
                  <li>⏳ AI feedback integration</li>
                  <li>⏳ Interactive charts</li>
                  <li>⏳ Export functionality</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolUserResultDetailPage;
