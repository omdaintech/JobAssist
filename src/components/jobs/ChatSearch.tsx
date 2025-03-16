
import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Filter, ArrowRight, BookmarkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface ChatMessage {
  type: 'user' | 'assistant';
  content: string;
  jobs?: JobPreview[];
  isTyping?: boolean;
}

interface JobPreview {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  posted: string;
  matchScore?: number;
  isNew?: boolean;
}

// Mock job data for simulation
const mockJobs = [
  {
    id: '1',
    title: 'Senior Frontend Developer',
    company: 'TechCorp',
    location: 'San Francisco, CA',
    salary: '$120,000 - $150,000',
    type: 'Full-time',
    posted: '2 days ago',
    matchScore: 95,
    isNew: true,
  },
  {
    id: '2',
    title: 'UX Designer',
    company: 'DesignHub',
    location: 'Remote',
    salary: '$90,000 - $110,000',
    type: 'Full-time',
    posted: '1 week ago',
    matchScore: 87,
  },
  {
    id: '3',
    title: 'Product Manager',
    company: 'InnovateCo',
    location: 'New York, NY',
    salary: '$130,000 - $160,000',
    type: 'Full-time',
    posted: '3 days ago',
    matchScore: 82,
  },
  {
    id: '4',
    title: 'Data Scientist',
    company: 'AnalyticsPro',
    location: 'Boston, MA',
    salary: '$115,000 - $145,000',
    type: 'Full-time',
    posted: '1 day ago',
    matchScore: 78,
    isNew: true,
  },
];

// Example responses for different user queries
const responseTemplates = {
  default: "I've found some job postings that might interest you. Here are a few matches:",
  salary: "I found jobs matching your salary requirements. Here are some positions:",
  remote: "I've found remote positions that match your skills. Take a look:",
  specific: "Based on your specific requirements, I found these potential matches:",
  noResults: "I couldn't find exact matches for your criteria. Consider broadening your search or try these alternatives:",
  skills: "Based on your skills and experience, these positions might be a good fit:",
};

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

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current;
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }, [messages]);

  const simulateAIProcessing = async (query: string) => {
    setIsProcessing(true);
    
    // Add typing indicator
    setMessages(prev => [...prev, { type: 'assistant', content: '', isTyping: true }]);
    
    // Determine response type based on query keywords
    let responseType = 'default';
    if (query.toLowerCase().includes('remote')) responseType = 'remote';
    if (query.toLowerCase().includes('salary') || query.toLowerCase().includes('pay')) responseType = 'salary';
    if (query.toLowerCase().includes('skill') || query.toLowerCase().includes('experience')) responseType = 'skills';
    if ((query.match(/\w+/g) || []).length > 7) responseType = 'specific';
    
    // Filter jobs based on query
    let filteredJobs = [...mockJobs];
    if (query.toLowerCase().includes('developer') || query.toLowerCase().includes('frontend')) {
      filteredJobs = filteredJobs.filter(job => job.title.toLowerCase().includes('developer'));
    }
    if (query.toLowerCase().includes('design')) {
      filteredJobs = filteredJobs.filter(job => job.title.toLowerCase().includes('design'));
    }
    if (query.toLowerCase().includes('remote')) {
      filteredJobs = filteredJobs.filter(job => job.location.toLowerCase().includes('remote'));
    }
    if (filteredJobs.length === 0) {
      responseType = 'noResults';
      filteredJobs = mockJobs.slice(0, 2);
    }
    
    // Simulate AI thinking time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Remove typing indicator
    setMessages(prev => prev.filter(msg => !msg.isTyping));
    
    // Add AI response with filtered jobs
    setMessages(prev => [
      ...prev, 
      { 
        type: 'assistant', 
        content: responseTemplates[responseType as keyof typeof responseTemplates], 
        jobs: filteredJobs
      }
    ]);
    
    setIsProcessing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    // Add user message
    const userMessage = { type: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);

    // Clear input
    setInput('');

    // Simulate AI response
    await simulateAIProcessing(input);
  };

  return (
    <Card className="glass h-[600px] flex flex-col relative overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-medium">AI Job Search Assistant</h2>
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
              
              {message.jobs && message.jobs.length > 0 && (
                <div className="pl-2 mt-3 space-y-3">
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
                              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-xs">
                                {job.matchScore}% Match
                              </Badge>
                            )}
                            {job.isNew && (
                              <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-2">
                          <span>{job.location}</span>
                          <span>•</span>
                          <span>{job.type}</span>
                          <span>•</span>
                          <span>{job.salary}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-3">
                          <Button size="sm" variant="default" className="text-xs h-8 rounded-md">
                            View Job
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs h-8 rounded-md">
                            Quick Apply
                          </Button>
                          <Button size="sm" variant="ghost" className="ml-auto h-8 w-8 p-0" title="Save job">
                            <BookmarkIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
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
