import React from 'react';
import { ExamDetail } from '@/services/api';
import { getActivityIcon } from '@/constants/activity-types';

interface ExamAnalysisPDFProps {
    examDetail: ExamDetail;
    className?: string;
}

export const ExamAnalysisPDF: React.FC<ExamAnalysisPDFProps> = ({ examDetail, className = '' }) => {
    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getExamSummary = () => {
        if (!examDetail.exam_summary) return null;
        try {
            return typeof examDetail.exam_summary === 'string'
                ? JSON.parse(examDetail.exam_summary)
                : examDetail.exam_summary;
        } catch {
            return null;
        }
    };

    const summary = getExamSummary();

    return (
        <div className={`bg-white p-8 font-sans ${className}`} style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            lineHeight: '1.6',
            color: '#1f2937'
        }}>
            {/* PDF Header */}
            <div className="text-center mb-8 border-b-4 border-blue-600 pb-6">
                <h1 className="text-3xl font-bold text-blue-900 mb-2">
                    🎓 German Language Assessment Report
                </h1>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                    {examDetail.exam_name}
                </h2>
                <div className="text-gray-600">
                    <p><strong>Level:</strong> {examDetail.level} • <strong>Completed:</strong> {formatDate(examDetail.completed_at || examDetail.created_at)}</p>
                    <p><strong>Template:</strong> {examDetail.template.template_name}</p>
                </div>
            </div>

            {summary && (
                <>
                    {/* Executive Summary Stats */}
                    {summary.overall && (
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span>📊</span> Performance Overview
                            </h3>
                            <div className="grid grid-cols-4 gap-4 mb-6">
                                {summary.overall.overall_score !== undefined && (
                                    <div className="text-center bg-red-50 p-4 rounded-lg border-2 border-red-200">
                                        <div className="text-2xl font-bold text-red-600 mb-1">📈</div>
                                        <div className="text-sm font-semibold text-gray-800">Overall Score</div>
                                        <div className="text-xl text-red-600 font-bold">{summary.overall.overall_score}%</div>
                                    </div>
                                )}
                                {summary.overall.cefr_level_assessment && (
                                    <div className="text-center bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                                        <div className="text-2xl font-bold text-purple-700 mb-1">🎯</div>
                                        <div className="text-sm font-semibold text-gray-800">CEFR Level</div>
                                        <div className="text-lg text-purple-700 font-medium">{summary.overall.cefr_level_assessment}</div>
                                    </div>
                                )}
                                {summary.overall.completed_activities && (
                                    <div className="text-center bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                                        <div className="text-2xl font-bold text-blue-700 mb-1">✅</div>
                                        <div className="text-sm font-semibold text-gray-800">Activities</div>
                                        <div className="text-lg text-blue-700 font-medium">{summary.overall.completed_activities}/{summary.overall.total_activities}</div>
                                    </div>
                                )}
                                {summary.analysis_metadata?.processing_time && (
                                    <div className="text-center bg-green-50 p-4 rounded-lg border-2 border-green-200">
                                        <div className="text-2xl font-bold text-green-700 mb-1">⚡</div>
                                        <div className="text-sm font-semibold text-gray-800">AI Analysis</div>
                                        <div className="text-lg text-green-700 font-medium">{Math.round(summary.analysis_metadata.processing_time)}s</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Activity Analysis Section */}
                    {summary.activities && (
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <span>🎨</span> Detailed Activity Analysis
                            </h3>

                            <div className="space-y-6">
                                {Object.entries(summary.activities).map(([activityType, activityData]: [string, Record<string, unknown>]) => (
                                    <div key={activityType} className="border-2 border-gray-200 rounded-xl p-6 bg-gray-50">
                                        {/* Activity Header */}
                                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-300">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border-2 border-blue-200">
                                                    <span className="text-2xl">{getActivityIcon(activityType)}</span>
                                                </div>
                                                <div>
                                                    <h4 className="text-2xl font-bold text-gray-900 capitalize">{activityType}</h4>
                                                    <p className="text-gray-600">Language Assessment</p>
                                                </div>
                                            </div>
                                            {activityData.quality && (
                                                <div className={`text-lg px-4 py-2 rounded-full font-bold border-2 ${activityData.quality === 'Perfect' ? 'bg-green-100 text-green-700 border-green-300' :
                                                    activityData.quality === 'Good' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                                                        activityData.quality === 'Ok' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                                                            'bg-red-100 text-red-700 border-red-300'
                                                    }`}>
                                                    {activityData.quality}
                                                </div>
                                            )}
                                        </div>

                                        {/* Activity Content Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {/* Strengths */}
                                            {activityData.strengths && (
                                                <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="text-green-600 font-bold text-lg">✨</span>
                                                        <span className="font-bold text-green-800">Strengths</span>
                                                    </div>
                                                    <p className="text-green-700 leading-relaxed">{activityData.strengths}</p>
                                                </div>
                                            )}

                                            {/* Improvements */}
                                            {activityData.improvements && (
                                                <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="text-orange-600 font-bold text-lg">🎯</span>
                                                        <span className="font-bold text-orange-800">Areas for Improvement</span>
                                                    </div>
                                                    <p className="text-orange-700 leading-relaxed">{activityData.improvements}</p>
                                                </div>
                                            )}

                                            {/* Recommendations */}
                                            {activityData.recommendations && (
                                                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="text-blue-600 font-bold text-lg">💡</span>
                                                        <span className="font-bold text-blue-800">Recommendations</span>
                                                    </div>
                                                    <div className="text-blue-700 leading-relaxed">
                                                        {Array.isArray(activityData.recommendations) ? (
                                                            <ul className="space-y-2">
                                                                {activityData.recommendations.map((rec: string, index: number) => (
                                                                    <li key={index} className="flex items-start gap-2">
                                                                        <span className="text-blue-500 mt-1">•</span>
                                                                        <span>{rec}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <p>{activityData.recommendations}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Detailed Analysis */}
                                        {activityData.general_feedback && Array.isArray(activityData.general_feedback) && (
                                            <div className="mt-6 bg-white p-4 rounded-lg border-2 border-gray-200">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="text-gray-600 font-bold text-lg">📝</span>
                                                    <span className="font-bold text-gray-800">Comprehensive Analysis</span>
                                                </div>
                                                <div className="space-y-3">
                                                    {activityData.general_feedback.filter((feedback: string) =>
                                                        !feedback.includes('Positive Progress') &&
                                                        !feedback.includes('Executive Summary')
                                                    ).map((feedback: string, index: number) => (
                                                        <div key={index} className="text-gray-700 leading-relaxed">
                                                            {feedback.includes(':') ? (
                                                                <div className="mb-2">
                                                                    <span className="font-semibold text-gray-900">{feedback.split(':')[0]}:</span>
                                                                    <span className="ml-2">{feedback.split(':').slice(1).join(':')}</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-start gap-2">
                                                                    <span className="text-gray-400 mt-1">•</span>
                                                                    <span>{feedback}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Priority Recommendations */}
                    {summary.overall?.recommendations && summary.overall.recommendations.length > 0 && (
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span>🎯</span> Priority Recommendations
                            </h3>
                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border-2 border-blue-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {summary.overall.recommendations.map((rec: string, index: number) => (
                                        <div key={index} className="bg-white p-4 rounded-lg border border-blue-200 flex items-start gap-3">
                                            <span className="text-blue-600 font-bold text-xl">{index + 1}</span>
                                            <span className="text-blue-800 leading-relaxed">{rec}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Report Footer */}
                    <div className="border-t-2 border-gray-300 pt-6 mt-8 text-center text-gray-600">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-semibold">AI-Powered Language Assessment</p>
                                <p className="text-sm">Generated using advanced language analysis technology</p>
                            </div>
                            <div className="text-right">
                                {summary.analysis_metadata && (
                                    <>
                                        <p className="text-sm">Analysis Version: {summary.analysis_metadata.version}</p>
                                        {summary.analysis_metadata.total_tokens && (
                                            <p className="text-sm">Tokens Used: {summary.analysis_metadata.total_tokens.toLocaleString()}</p>
                                        )}
                                    </>
                                )}
                                <p className="text-sm font-medium text-green-600">✅ Complete Analysis Report</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}; 