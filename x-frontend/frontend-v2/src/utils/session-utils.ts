import { ExamTemplate } from '@/services/api';

/**
 * Parametric helper function to extract templates by type from API response
 * Used by both ExamView and PracticeView to parse template data
 */
export const extractTemplatesFromResponse = (
  apiResponse: Record<string, unknown>, 
  templateType: 'exam' | 'practice'
): ExamTemplate[] => {
  // Handle both legacy format and new format
  const templatesData = (apiResponse as Record<string, unknown>)?.templates as Record<string, unknown> | undefined;
  const templatesObject = templatesData?.[templateType] || templatesData || {};
  // Parse templates from API response

  // If it's already an array of templates, use it directly
  if (Array.isArray(templatesObject)) {
    return templatesObject as ExamTemplate[];
  }

  const templatesArray = Object.values(templatesObject as Record<string, unknown>).map((template): ExamTemplate => {
    const templateData = template as Record<string, unknown>;
    return {
      template_id: String(templateData.template_id || ''),
      template_name: String(templateData.template_name || templateData.name || ''),
      total_questions: Number(templateData.reading || 0) + Number(templateData.writing || 0) + Number(templateData.grammar || 0) + Number(templateData.hearing || 0) + Number(templateData.speaking || 0),
      breakdown: {
        reading: Number(templateData.reading || 0),
        writing: Number(templateData.writing || 0),
        grammar: Number(templateData.grammar || 0),
        hearing: Number(templateData.hearing || 0),
        speaking: Number(templateData.speaking || 0)
      }
    };
  });

  // Return parsed templates array
  return templatesArray;
};

/**
 * Common filter options for session lists
 */
export const getCommonQuickFilters = () => [
  { value: 1, label: 'Today' },
  { value: 7, label: 'Week' },
  { value: 30, label: 'Month' },
  { value: 0, label: 'All' }
];

export const getCommonLevelOptions = () => [
  { value: 'all', label: 'All Levels' },
  { value: 'A1', label: 'A1', color: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'A2', label: 'A2', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'B1', label: 'B1', color: 'bg-purple-50 text-purple-700 border-purple-200' }
];

export const getCommonStatusOptions = () => [
  { value: 'all', label: 'All Status' },
  { value: 'completed', label: 'Completed' },
  { value: 'analyzed', label: 'Analyzed' }
];

/**
 * Common session filtering and sorting logic
 */
export const filterAndSortSessions = <T extends { created_at: string; status: string }>(
  sessions: T[],
  status: string | string[],
  limit?: number
): T[] => {
  const statusArray = Array.isArray(status) ? status : [status];
  
  return sessions
    .filter(session => statusArray.includes(session.status))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
};

/**
 * Generate robust session names with consistent formatting
 * Format: "German A1 Reading 09 Nov 25 15:58" or "German A1 Exam 09 Nov 25 15:58"
 */
export const generateSessionName = (options: {
  languageName?: string;
  level?: string;
  activityType?: string;
  sessionType: 'practice' | 'exam';
  availableLevels?: string[];
}): string => {
  const { languageName, level, activityType, sessionType, availableLevels = ['A1'] } = options;
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  
  const parts = [];
  
  // Add language name (fallback to "Language" if not available)
  parts.push(languageName || 'Language');
  
  // Add level (fallback to first available level or "A1")
  parts.push(level || availableLevels[0] || 'A1');
  
  // Add activity type or session type
  if (sessionType === 'practice' && activityType) {
    // Capitalize first letter for activity type
    const activityName = activityType.charAt(0).toUpperCase() + activityType.slice(1);
    parts.push(activityName);
  } else if (sessionType === 'practice') {
    parts.push('Practice');
  } else {
    parts.push('Exam');
  }
  
  // Add date and time
  parts.push(dateStr);
  parts.push(timeStr);
  
  return parts.join(' ');
};
