
import React from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isProcessing: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  value, 
  onChange, 
  onSubmit, 
  isProcessing 
}) => {
  return (
    <form onSubmit={onSubmit} className="p-4 border-t flex gap-2">
      <Input
        value={value}
        onChange={onChange}
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
  );
};

export default ChatInput;
