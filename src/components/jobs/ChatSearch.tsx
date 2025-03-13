
import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatMessage {
  type: 'user' | 'assistant';
  content: string;
}

const ChatSearch = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      type: 'assistant',
      content: "Hi! I'm your job search assistant. Tell me what kind of job you're looking for, and I'll help you find the perfect match. For example, you can say 'Find me frontend developer jobs in New York' or 'Show me remote marketing positions'.",
    },
  ]);
  const [input, setInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage = { type: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);

    // Simulate assistant response (replace with actual job search logic)
    const assistantMessage = {
      type: 'assistant' as const,
      content: "I've found some relevant job openings based on your request. Here are some positions that might interest you:",
    };
    setMessages(prev => [...prev, assistantMessage]);
    setInput('');
  };

  return (
    <Card className="glass h-[600px] flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-medium">Job Search Assistant</h2>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.type === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your job search query..."
          className="flex-1"
        />
        <Button type="submit" size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  );
};

export default ChatSearch;
