
import React, { useState } from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const mockQuestions = [
  {
    id: '1',
    question: 'Describe a challenging project you worked on and how you overcame obstacles.',
    category: 'Experience',
  },
  {
    id: '2',
    question: 'How do you stay updated with the latest trends and technologies in your field?',
    category: 'Professional Development',
  },
  {
    id: '3',
    question: 'Can you explain a time when you had to make a difficult decision with limited information?',
    category: 'Decision Making',
  },
  {
    id: '4',
    question: 'How do you handle conflicts within a team?',
    category: 'Team Skills',
  },
  {
    id: '5',
    question: 'What are your salary expectations for this role?',
    category: 'Negotiation',
  },
];

const InterviewPrep = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  
  const handleNextQuestion = () => {
    setCurrentQuestion((prev) => (prev + 1) % mockQuestions.length);
  };
  
  const handlePrevQuestion = () => {
    setCurrentQuestion((prev) => (prev - 1 + mockQuestions.length) % mockQuestions.length);
  };
  
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-border">
        <h3 className="text-xl font-medium">Interview Preparation</h3>
        <p className="text-muted-foreground">
          Practice with AI-generated questions tailored to your job search.
        </p>
      </div>
      
      <div className="p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">
              Question {currentQuestion + 1} of {mockQuestions.length}
            </span>
            <span className="text-sm font-medium px-3 py-1 rounded-full bg-secondary">
              {mockQuestions[currentQuestion].category}
            </span>
          </div>
          
          <Card className="p-5 bg-secondary/50 border-0">
            <p className="text-lg font-medium">
              {mockQuestions[currentQuestion].question}
            </p>
          </Card>
          
          <div className="flex justify-between mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs" 
              onClick={handlePrevQuestion}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs" 
              onClick={handleNextQuestion}
            >
              Next
            </Button>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center py-8 px-4 bg-secondary/30 rounded-xl">
            <div className={`relative mb-6 w-20 h-20 rounded-full ${
              isRecording ? 'bg-red-500/10 animate-pulse' : 'bg-secondary'
            } flex items-center justify-center`}>
              <Button 
                variant="ghost"
                size="icon"
                className={`w-16 h-16 rounded-full ${
                  isRecording ? 'bg-red-500 text-white' : 'bg-primary/10 text-primary'
                }`}
                onClick={() => setIsRecording(!isRecording)}
              >
                <MessageSquare size={24} />
              </Button>
              {isRecording && (
                <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-red-500"></span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {isRecording ? 'Recording...' : 'Tap to start recording your answer'}
            </p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={!isRecording} 
                className="text-xs"
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                disabled={!isRecording} 
                className="text-xs"
              >
                Finish
              </Button>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-3">Sample Answer</h4>
            <Card className="p-4 bg-background border border-border">
              <div className="flex justify-between items-start mb-3">
                <span className="text-sm font-medium">AI Assistant</span>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Volume2 size={16} />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                When answering this question, focus on describing a specific project, the challenges you faced, the actions you took to overcome them, and the results you achieved. Use the STAR method (Situation, Task, Action, Result) to structure your response and highlight your problem-solving abilities.
              </p>
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ThumbsDown size={16} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ThumbsUp size={16} />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewPrep;
