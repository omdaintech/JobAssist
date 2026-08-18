// Standardized status information for consistent display across all components
export interface StatusInfo {
  text: string;
  color: string;
}

export const getStatusInfo = (status: string): StatusInfo => {
  switch (status) {
    case 'created':
      return { text: 'Ready', color: 'bg-yellow-100 text-yellow-700' };
    case 'in_progress':
      return { text: 'In Progress', color: 'bg-blue-100 text-blue-700' };
    case 'completed':
      return { text: 'Completed', color: 'bg-green-100 text-green-700' };
    case 'analyzed':
      return { text: 'Analyzed', color: 'bg-purple-100 text-purple-700' };
    default:
      return { text: status, color: 'bg-gray-100 text-gray-700' };
  }
};

// Helper function for checking if exam is clickable based on status
export const isExamClickable = (status: string, canResume?: boolean): boolean => {
  return status === 'completed' || status === 'analyzed' || canResume === true;
};

// Helper function for determining exam click action
export const getExamClickAction = (status: string): 'view-results' | 'continue' | 'start' => {
  if (status === 'completed' || status === 'analyzed') {
    return 'view-results';
  } else if (status === 'in_progress') {
    return 'continue';
  } else {
    return 'start';
  }
};

// Helper function for exam button text
export const getExamButtonText = (status: string): string => {
  switch (status) {
    case 'completed':
    case 'analyzed':
      return 'View Results';
    case 'in_progress':
      return 'Continue';
    case 'created':
      return 'Start';
    default:
      return 'Start';
  }
};

// Helper function for exam button description
export const getExamButtonDescription = (status: string): string => {
  switch (status) {
    case 'completed':
    case 'analyzed':
      return 'Click to view';
    case 'in_progress':
      return 'Click to resume';
    case 'created':
      return 'Click to start';
    default:
      return 'Click to start';
  }
}; 