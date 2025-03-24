
import React from 'react';
import { Button } from '@/components/ui/button';

interface SuggestedQueriesProps {
  queries: string[];
  onQueryClick?: (query: string) => void;
}

const SuggestedQueries: React.FC<SuggestedQueriesProps> = ({ 
  queries, 
  onQueryClick 
}) => {
  return (
    <div className="mt-4">
      <p className="text-xs text-muted-foreground mb-2">Try searching for:</p>
      <div className="flex flex-wrap gap-2">
        {queries.map((query, idx) => (
          <Button 
            key={idx} 
            variant="outline" 
            size="sm" 
            className="text-xs h-7 rounded-full"
            onClick={() => onQueryClick && onQueryClick(query)}
          >
            {query}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default SuggestedQueries;
