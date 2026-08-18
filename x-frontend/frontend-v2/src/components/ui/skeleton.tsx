/**
 * Skeleton Loaders
 * 
 * Loading placeholders that prevent layout shift and improve perceived performance.
 * Replaces generic spinners with content-aware loading states.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string;
}

/**
 * Basic Skeleton - Generic loading placeholder
 */
const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200",
        className
      )}
    />
  );
};

/**
 * Skeleton Card - For card-based content
 */
const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn("rounded-lg border border-gray-200 bg-white p-3 md:p-4 lg:p-5", className)}>
      <div className="animate-pulse space-y-3 md:space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="h-4 md:h-5 bg-gray-200 rounded w-3/4"></div>
          <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
        </div>
        
        {/* Content lines */}
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        </div>
        
        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          <div className="h-8 w-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton Session Item - For practice/exam session lists
 */
const SkeletonSessionItem: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn("rounded-lg border border-gray-200 bg-white p-3 md:p-4", className)}>
      <div className="animate-pulse">
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Left side - title and meta */}
          <div className="flex-1 space-y-2">
            <div className="h-5 md:h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="flex gap-2">
              <div className="h-5 w-12 bg-gray-200 rounded-full"></div>
              <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
            </div>
          </div>
          
          {/* Right side - button */}
          <div className="h-9 w-24 bg-gray-200 rounded"></div>
        </div>
        
        {/* Bottom meta */}
        <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
          <div className="h-3 w-20 bg-gray-200 rounded"></div>
          <div className="h-3 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton Stats Grid - For dashboard statistics
 */
const SkeletonStats: React.FC<{ count?: number; className?: string }> = ({ 
  count = 4, 
  className 
}) => {
  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-white p-3 md:p-4 lg:p-5">
          <div className="animate-pulse space-y-2 md:space-y-3">
            <div className="flex items-start justify-between">
              <div className="h-3 md:h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
            </div>
            <div className="h-8 md:h-10 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton Chart - For chart placeholders
 */
const SkeletonChart: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn("rounded-lg border border-gray-200 bg-white p-3 md:p-4 lg:p-5", className)}>
      <div className="animate-pulse space-y-4">
        {/* Chart title */}
        <div className="h-4 md:h-5 bg-gray-200 rounded w-1/3"></div>
        
        {/* Chart area */}
        <div className="h-48 md:h-64 bg-gray-100 rounded flex items-end justify-around gap-2 p-4">
          <div className="w-full h-2/3 bg-gray-200 rounded"></div>
          <div className="w-full h-4/5 bg-gray-200 rounded"></div>
          <div className="w-full h-1/2 bg-gray-200 rounded"></div>
          <div className="w-full h-3/4 bg-gray-200 rounded"></div>
          <div className="w-full h-1/3 bg-gray-200 rounded"></div>
        </div>
        
        {/* Legend */}
        <div className="flex gap-4 justify-center">
          <div className="h-3 w-16 bg-gray-200 rounded"></div>
          <div className="h-3 w-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton Table Row - For table data
 */
const SkeletonTableRow: React.FC<{ columns?: number; className?: string }> = ({ 
  columns = 4, 
  className 
}) => {
  return (
    <tr className={cn("border-b border-gray-100", className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        </td>
      ))}
    </tr>
  );
};

/**
 * Skeleton List - For list views
 */
const SkeletonList: React.FC<{ 
  count?: number; 
  itemType?: 'card' | 'session'; 
  className?: string 
}> = ({ count = 3, itemType = 'card', className }) => {
  const ItemComponent = itemType === 'session' ? SkeletonSessionItem : SkeletonCard;
  
  return (
    <div className={cn("space-y-3 md:space-y-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <ItemComponent key={i} />
      ))}
    </div>
  );
};

/**
 * Skeleton Grid - For grid layouts
 */
const SkeletonGrid: React.FC<{ 
  count?: number; 
  columns?: 1 | 2 | 3 | 4; 
  className?: string 
}> = ({ count = 6, columns = 2, className }) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4'
  };
  
  return (
    <div className={cn("grid gap-3 md:gap-4", gridCols[columns], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};

/**
 * Skeleton Text - For text content
 */
const SkeletonText: React.FC<{ 
  lines?: number; 
  className?: string 
}> = ({ lines = 3, className }) => {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className={cn(
            "h-4 bg-gray-200 rounded animate-pulse",
            i === lines - 1 ? "w-4/5" : "w-full"
          )}
        />
      ))}
    </div>
  );
};

/**
 * Skeleton Avatar - For user avatars
 */
const SkeletonAvatar: React.FC<{ 
  size?: 'sm' | 'md' | 'lg'; 
  className?: string 
}> = ({ size = 'md', className }) => {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };
  
  return (
    <div 
      className={cn(
        "rounded-full bg-gray-200 animate-pulse",
        sizes[size],
        className
      )} 
    />
  );
};

/**
 * Skeleton Dashboard - Complete dashboard loading state
 */
const SkeletonDashboard: React.FC = () => {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="animate-pulse">
        <div className="h-8 md:h-10 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
      
      {/* Stats Grid */}
      <SkeletonStats />
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkeletonChart />
        <SkeletonChart />
      </div>
      
      {/* Recent Activity */}
      <SkeletonList count={2} />
    </div>
  );
};

export {
  Skeleton,
  SkeletonCard,
  SkeletonSessionItem,
  SkeletonStats,
  SkeletonChart,
  SkeletonTableRow,
  SkeletonList,
  SkeletonGrid,
  SkeletonText,
  SkeletonAvatar,
  SkeletonDashboard,
};

