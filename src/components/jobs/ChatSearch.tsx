
import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Filter, ArrowRight, BookmarkIcon, BriefcaseIcon, MapPinIcon, DollarSignIcon, CalendarIcon, Check, GraduationCapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useJobSearch, aiResponseTemplates, type JobPosting, type SearchQuery } from './JobSearchAPI';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';

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
            content: aiResponseTemplates[responseType as keyof typeof aiResponseTemplates], 
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
            <div key={index} className="space-y-2">
              <div
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.isTyping ? (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-foreground/70 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-foreground/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-foreground/70 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}
                </div>
              </div>
              
              {/* Jobs results section */}
              {message.jobs && message.jobs.length > 0 && (
                <div className="pl-2 mt-3 space-y-3">
                  {/* Analytics insight */}
                  {message.analyticsInsight && (
                    <div className="mb-3 px-2 py-1.5 bg-primary/5 rounded-md border-l-2 border-primary">
                      <p className="text-xs text-muted-foreground">
                        <strong>Insight:</strong> {message.analyticsInsight}
                      </p>
                    </div>
                  )}
                  
                  {/* Job listings */}
                  {message.jobs.map(job => (
                    <Card key={job.id} className="overflow-hidden border border-border bg-card shadow-sm hover:shadow transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-sm">{job.title}</h3>
                            <p className="text-xs text-muted-foreground">{job.company}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {job.matchScore && (
                              <Badge variant="match" className="text-xs">
                                {job.matchScore}% Match
                              </Badge>
                            )}
                            {job.isNew && (
                              <Badge variant="new" className="text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
                          <div className="flex items-center gap-1">
                            <MapPinIcon className="h-3 w-3" />
                            <span>{job.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <BriefcaseIcon className="h-3 w-3" />
                            <span>{job.type}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSignIcon className="h-3 w-3" />
                            <span>{job.salary}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            <span>{job.posted}</span>
                          </div>
                        </div>
                        
                        {/* Key skills */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {job.keySkills.slice(0, 5).map((skill, idx) => (
                            <Badge key={idx} variant="skill" className="text-[0.65rem]">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-3">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="default" className="text-xs h-8 rounded-md">
                                  View Job
                                  <ArrowRight className="ml-1 h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View complete job details</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-xs h-8 rounded-md"
                                  onClick={() => handleQuickApply(job.id)}
                                >
                                  <Check className="mr-1 h-3 w-3" />
                                  Quick Apply
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Apply with your saved resume</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="ml-auto h-8 w-8 p-0" 
                            title="Save job"
                            onClick={() => handleSaveJob(job.id)}
                          >
                            <BookmarkIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {/* Suggested queries */}
                  {message.suggestedQueries && message.suggestedQueries.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground mb-2">Try searching for:</p>
                      <div className="flex flex-wrap gap-2">
                        {message.suggestedQueries.map((query, idx) => (
                          <Button 
                            key={idx} 
                            variant="outline" 
                            size="sm" 
                            className="text-xs h-7 rounded-full"
                            onClick={() => handleSuggestedQueryClick(query)}
                          >
                            {query}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-center mt-2">
                    <Button variant="outline" size="sm" className="text-xs">
                      <Filter className="mr-1 h-3 w-3" />
                      Refine Results
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe the job you're looking for..."
          className="flex-1"
          disabled={isProcessing}
        />
        <Button type="submit" size="icon" disabled={isProcessing}>
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </Card>
  );
};

export default ChatSearch;
