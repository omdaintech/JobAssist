import * as React from 'react';

import { cn } from '@/lib/utils';

export type PageContainerProps = React.HTMLAttributes<HTMLDivElement>;

export const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('app-page-container', className)}
      {...props}
    />
  )
);

PageContainer.displayName = 'PageContainer';

