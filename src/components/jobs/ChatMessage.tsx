
import React from 'react';
import { JobPosting } from './JobSearchAPI';
import JobResultsList from './JobResultsList';
import SuggestedQueries from './SuggestedQueries';

interface ChatMessageProps {
  type: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
  jobs?: JobPosting[];
  analyticsInsight?: string;
  suggestedQueries?: string[];
  onSuggestedQueryClick?: (query: string) => void;
  onSaveJob?: (jobId: string) => void;
  onQuickApply?: (jobId: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  type,
  content,
  isTyping,
  jobs,
  analyticsInsight,
  suggestedQueries,
  onSuggestedQueryClick,
  onSaveJob,
  onQuickApply
}) => {
  return (
    <div className="space-y-2">
      <div className={`flex ${type === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[85%] rounded-lg p-3 ${
            type === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          }`}
        >
          {isTyping ? (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-foreground/70 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-foreground/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-foreground/70 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : (
            <p className="text-sm">{content}</p>
          )}
        </div>
      </div>
      
      {jobs && jobs.length > 0 && (
        <div className="pl-2 mt-3 space-y-3">
          {analyticsInsight && (
            <div className="mb-3 px-2 py-1.5 bg-primary/5 rounded-md border-l-2 border-primary">
              <p className="text-xs text-muted-foreground">
                <strong>Insight:</strong> {analyticsInsight}
              </p>
            </div>
          )}
          
          <JobResultsList 
            jobs={jobs} 
            onSaveJob={onSaveJob} 
            onQuickApply={onQuickApply} 
          />
          
          {suggestedQueries && suggestedQueries.length > 0 && (
            <SuggestedQueries 
              queries={suggestedQueries} 
              onQueryClick={onSuggestedQueryClick} 
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
