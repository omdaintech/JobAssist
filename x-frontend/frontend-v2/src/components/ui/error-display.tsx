import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"

export type ErrorType = 
  | 'NETWORK_ERROR' 
  | 'INSUFFICIENT_CREDITS' 
  | 'SESSION_NOT_FOUND' 
  | 'SESSION_ALREADY_COMPLETED'
  | 'UNAUTHORIZED'
  | 'SERVER_ERROR'
  | 'VALIDATION_ERROR'
  | 'GENERIC';

interface ErrorAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'destructive';
  icon?: React.ReactNode;
}

interface ErrorDisplayProps {
    title?: string
    message?: string
    errorType?: ErrorType
    onRetry?: () => void
    onBack?: () => void
    customActions?: ErrorAction[]
    retryText?: string
    backText?: string
    className?: string
    showIcon?: boolean
    availableCredits?: number
    requiredCredits?: number
}

// Error type configurations
const ERROR_CONFIGS: Record<ErrorType, {
  defaultTitle: string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
}> = {
  NETWORK_ERROR: {
    defaultTitle: 'Connection Problem',
    iconBgColor: 'bg-orange-100',
    iconColor: 'text-orange-600',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
      </svg>
    ),
  },
  INSUFFICIENT_CREDITS: {
    defaultTitle: 'Not Enough Credits',
    iconBgColor: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  SESSION_NOT_FOUND: {
    defaultTitle: 'Session Not Found',
    iconBgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  SESSION_ALREADY_COMPLETED: {
    defaultTitle: 'Session Already Completed',
    iconBgColor: 'bg-green-100',
    iconColor: 'text-green-600',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  UNAUTHORIZED: {
    defaultTitle: 'Access Denied',
    iconBgColor: 'bg-red-100',
    iconColor: 'text-red-600',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  SERVER_ERROR: {
    defaultTitle: 'Server Error',
    iconBgColor: 'bg-red-100',
    iconColor: 'text-red-600',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    ),
  },
  VALIDATION_ERROR: {
    defaultTitle: 'Invalid Input',
    iconBgColor: 'bg-orange-100',
    iconColor: 'text-orange-600',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 6.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
  },
  GENERIC: {
    defaultTitle: 'Something Went Wrong',
    iconBgColor: 'bg-red-100',
    iconColor: 'text-red-600',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 6.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
  },
};

// Default messages for each error type
const getDefaultMessage = (errorType: ErrorType, availableCredits?: number, requiredCredits?: number): string => {
  switch (errorType) {
    case 'NETWORK_ERROR':
      return "We're having trouble reaching our servers. Please check your internet connection and try again.";
    case 'INSUFFICIENT_CREDITS':
      return `You need ${requiredCredits || 'more'} credits but only have ${availableCredits || 0} available. Contact your school admin to request more credits.`;
    case 'SESSION_NOT_FOUND':
      return 'This session may have been deleted or moved. Try refreshing your sessions list.';
    case 'SESSION_ALREADY_COMPLETED':
      return 'This session was already completed. You can view the results instead of retaking it.';
    case 'UNAUTHORIZED':
      return 'You do not have permission to access this resource. Please log in again.';
    case 'SERVER_ERROR':
      return 'Our server encountered an error. Our team has been notified. Please try again later.';
    case 'VALIDATION_ERROR':
      return 'Some of the information you provided is invalid. Please check your input and try again.';
    default:
      return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
  }
};

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
    title,
    message,
    errorType = 'GENERIC',
    onRetry,
    onBack,
    customActions,
    retryText = "Retry",
    backText = "← Go Back", 
    className,
    showIcon = true,
    availableCredits,
    requiredCredits,
}) => {
    const navigate = useNavigate();
    const config = ERROR_CONFIGS[errorType];
    const finalTitle = title || config.defaultTitle;
    const finalMessage = message || getDefaultMessage(errorType, availableCredits, requiredCredits);

    // Generate smart default actions based on error type
    const getDefaultActions = (): ErrorAction[] => {
      const actions: ErrorAction[] = [];

      switch (errorType) {
        case 'NETWORK_ERROR':
          if (onRetry) {
            actions.push({
              label: 'Check Connection',
              onClick: () => window.open('https://www.google.com', '_blank'),
              variant: 'outline',
            });
          }
          break;
        case 'INSUFFICIENT_CREDITS':
          actions.push({
            label: 'View Credit Balance',
            onClick: () => navigate('/settings'),
            variant: 'outline',
          });
          actions.push({
            label: 'Contact Support',
            onClick: () => navigate('/feedback'),
            variant: 'default',
          });
          break;
        case 'SESSION_NOT_FOUND':
          actions.push({
            label: 'Back to Sessions',
            onClick: () => navigate('/practice'),
            variant: 'default',
          });
          break;
        case 'SESSION_ALREADY_COMPLETED':
          actions.push({
            label: 'View Results',
            onClick: onRetry || (() => navigate('/practice-log')),
            variant: 'default',
          });
          break;
        case 'UNAUTHORIZED':
          actions.push({
            label: 'Log In Again',
            onClick: () => navigate('/login'),
            variant: 'default',
          });
          break;
      }

      return actions;
    };

    const actions = customActions || getDefaultActions();
    const showDefaultButtons = !customActions && (onRetry || onBack);

    return (
        <div className={cn("flex items-center justify-center min-h-[50vh] p-3 md:p-4", className)}>
            <Card className="max-w-md w-full">
                <CardContent className="p-4 md:p-6">
                    <div className="text-center">
                        {showIcon && (
                            <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4",
                                config.iconBgColor
                            )}>
                                <div className={config.iconColor}>
                                    {config.icon}
                                </div>
                            </div>
                        )}
                        <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">{finalTitle}</h3>
                        <p className="text-sm md:text-base text-gray-600 mb-4">{finalMessage}</p>
                        
                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-2 justify-center">
                            {showDefaultButtons && (
                                <>
                                    {onBack && (
                                        <Button onClick={onBack} variant="outline" size="sm" className="w-full sm:w-auto">
                                            {backText}
                                        </Button>
                                    )}
                                    {onRetry && (
                                        <Button onClick={onRetry} variant="outline" size="sm" className="w-full sm:w-auto">
                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            {retryText}
                                        </Button>
                                    )}
                                </>
                            )}
                            {actions.map((action, index) => (
                                <Button
                                    key={index}
                                    onClick={action.onClick}
                                    variant={action.variant || 'outline'}
                                    size="sm"
                                    className="w-full sm:w-auto"
                                >
                                    {action.icon && <span className="mr-1">{action.icon}</span>}
                                    {action.label}
                                </Button>
                            ))}
                        </div>

                        {/* Help Link */}
                        <p className="text-xs text-gray-500 mt-4">
                            Still having trouble?{' '}
                            <button 
                                onClick={() => navigate('/feedback')}
                                className="text-blue-600 hover:text-blue-800 underline"
                            >
                                Contact Support
                            </button>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export { ErrorDisplay, type ErrorType, type ErrorAction } 