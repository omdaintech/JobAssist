
import React, { useState, useEffect, useRef } from 'react';
import { BriefcaseIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useJobSearch, type JobPosting, type SearchQuery } from './JobSearchAPI';
import { toast } from '@/components/ui/use-toast';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

interface ChatMessage {
  type: 'user' | 'assistant';
  content: string;
  jobs?: JobPosting[];
  isTyping?: boolean;
  analyticsInsight?: string;
  suggestedQueries?: string[];
}

const ChatSearch = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      type: 'assistant',
      content: "Hi! I'm your AI job search assistant. Tell me what kind of job you're looking for, and I'll help you find the perfect match. For example, you can say 'Find me frontend developer jobs in New York' or 'Show me remote marketing positions that pay at least $100k'.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { search, isLoading, error } = useJobSearch();

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current;
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }, [messages]);

  // Show toast if there's an error
  useEffect(() => {
    if (error) {
      toast({
        title: "Search Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error]);

  const handleJobSearch = async (query: string) => {
    setIsProcessing(true);
    
    // Add typing indicator
    setMessages(prev => [...prev, { type: 'assistant', content: '', isTyping: true }]);
    
    try {
      // Call the simulated API
      const searchResults = await search({ query });
      
      // Remove typing indicator
      setMessages(prev => prev.filter(msg => !msg.isTyping));
      
      if (searchResults) {
        // Determine the appropriate response template
        const responseType = searchResults.responseType || 'default';
        
        // Add AI response with filtered jobs
        setMessages(prev => [
          ...prev, 
          { 
            type: 'assistant', 
            content: searchResults.responseType || 'default', 
            jobs: searchResults.jobs,
            analyticsInsight: searchResults.analyticsInsight,
            suggestedQueries: searchResults.suggestedQueries
          }
        ]);
      }
    } catch (err) {
      // Remove typing indicator and show error
      setMessages(prev => [
        ...prev.filter(msg => !msg.isTyping),
        { 
          type: 'assistant', 
          content: "I'm sorry, I encountered an error while searching for jobs. Please try again with a different query."
        }
      ]);
      
      console.error('Error in job search:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    // Add user message
    const userMessage = { type: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);

    // Clear input
    setInput('');

    // Perform job search
    await handleJobSearch(input);
  };

  const handleSuggestedQueryClick = async (query: string) => {
    if (isProcessing) return;
    
    // Add user message with the suggested query
    const userMessage = { type: 'user' as const, content: query };
    setMessages(prev => [...prev, userMessage]);
    
    // Perform job search with the suggested query
    await handleJobSearch(query);
  };

  const handleSaveJob = (jobId: string) => {
    toast({
      title: "Job Saved",
      description: "The job has been saved to your profile.",
    });
  };

  const handleQuickApply = (jobId: string) => {
    toast({
      title: "Application Started",
      description: "We're preparing your application. This would connect to our backend in a real implementation.",
    });
  };

  return (
    <Card className="glass h-[600px] flex flex-col relative overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BriefcaseIcon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-medium">AI Job Search Assistant</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">AI-Powered</Badge>
          <Badge variant="secondary" className="text-xs">Beta</Badge>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 overflow-y-auto" ref={scrollAreaRef}>
        <div className="space-y-6">
          {messages.map((message, index) => (
            <ChatMessage 
              key={index}
              type={message.type}
              content={message.content}
              isTyping={message.isTyping}
              jobs={message.jobs}
              analyticsInsight={message.analyticsInsight}
              suggestedQueries={message.suggestedQueries}
              onSuggestedQueryClick={handleSuggestedQueryClick}
              onSaveJob={handleSaveJob}
              onQuickApply={handleQuickApply}
            />
          ))}
        </div>
      </ScrollArea>

      <ChatInput 
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onSubmit={handleSubmit}
        isProcessing={isProcessing}
      />
    </Card>
  );
};

export default ChatSearch;
