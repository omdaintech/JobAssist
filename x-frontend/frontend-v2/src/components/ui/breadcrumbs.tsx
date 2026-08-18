/**
 * Breadcrumbs Component
 * 
 * Provides navigation breadcrumbs for better user orientation.
 * Automatically generates breadcrumbs based on current route.
 */

import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  className?: string;
  showHomeIcon?: boolean;
  maxItems?: number;
}

// Route configuration for breadcrumb labels
const ROUTE_LABELS: Record<string, string> = {
  '': 'Dashboard',
  'dashboard': 'Dashboard',
  'practice': 'Practice',
  'exam': 'Exams',
  'practice-log': 'Session History',
  'settings': 'Settings',
  'faq': 'FAQ',
  'feedback': 'Feedback',
  'consumption-history': 'Credit History',
  'results': 'Results',
  'session': 'Session',
  'onboarding': 'Welcome',
  'profile': 'Profile',
};

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  className,
  showHomeIcon = true,
  maxItems = 4,
}) => {
  const location = useLocation();

  const getBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
    // Remove leading/trailing slashes and split
    const paths = pathname.split('/').filter(Boolean);
    
    // Always start with Dashboard
    const crumbs: BreadcrumbItem[] = [
      { 
        label: showHomeIcon ? '🏠' : 'Dashboard', 
        path: '/dashboard',
        icon: showHomeIcon ? undefined : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        )
      }
    ];

    // Build breadcrumb trail
    let currentPath = '';
    paths.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Skip UUIDs and other non-meaningful segments
      if (segment.match(/^[0-9a-f-]{36}$/i)) {
        // This is a UUID, skip it but keep building path
        return;
      }

      // Get label for this segment
      const label = ROUTE_LABELS[segment] || segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      // Don't add if it's a duplicate of the last crumb
      const lastCrumb = crumbs[crumbs.length - 1];
      if (lastCrumb && lastCrumb.label === label) {
        return;
      }

      crumbs.push({
        label,
        path: currentPath,
      });
    });

    // Limit breadcrumbs if too many
    if (crumbs.length > maxItems) {
      return [
        crumbs[0], // Home
        { label: '...', path: '#' },
        ...crumbs.slice(-(maxItems - 2))
      ];
    }

    return crumbs;
  };

  const crumbs = getBreadcrumbs(location.pathname);

  // Don't show breadcrumbs on home/dashboard
  if (crumbs.length <= 1) {
    return null;
  }

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn(
        "flex items-center gap-1.5 md:gap-2 text-xs md:text-sm mb-3 md:mb-4",
        className
      )}
    >
      <ol className="flex items-center gap-1.5 md:gap-2">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const isEllipsis = crumb.label === '...';

          return (
            <li key={crumb.path} className="flex items-center gap-1.5 md:gap-2">
              {/* Separator */}
              {index > 0 && (
                <svg 
                  className="w-3 h-3 md:w-4 md:h-4 text-gray-400 flex-shrink-0" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}

              {/* Breadcrumb Link/Text */}
              {isLast ? (
                <span className={cn(
                  "font-medium text-gray-900 truncate max-w-[150px] md:max-w-none",
                  crumb.icon && "flex items-center gap-1.5"
                )}>
                  {crumb.icon}
                  {crumb.label}
                </span>
              ) : isEllipsis ? (
                <span className="text-gray-400 px-1">...</span>
              ) : (
                <Link
                  to={crumb.path}
                  className={cn(
                    "text-gray-600 hover:text-blue-600 transition-colors truncate max-w-[100px] md:max-w-none",
                    crumb.icon && "flex items-center gap-1.5"
                  )}
                >
                  {crumb.icon}
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export { Breadcrumbs, type BreadcrumbItem };

