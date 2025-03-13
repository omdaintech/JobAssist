
import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import InterviewPrep from '@/components/interview/InterviewPrep';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, Clock, Award, ArrowRight } from 'lucide-react';

const Interview = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-medium mb-8">Interview Preparation</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="space-y-8">
                <div className="glass rounded-2xl p-6 md:p-8">
                  <h3 className="text-xl font-medium mb-4">Interview Progress</h3>
                  <p className="text-muted-foreground mb-6">
                    Track your interview preparation progress for upcoming interviews.
                  </p>
                  
                  <div className="space-y-5">
                    <div className="relative pt-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-sm font-medium">Technical Questions</span>
                        </div>
                        <div className="text-sm text-muted-foreground">75%</div>
                      </div>
                      <div className="h-2 bg-secondary rounded-full">
                        <div className="h-2 bg-primary rounded-full" style={{ width: '75%' }}></div>
                      </div>
                    </div>
                    
                    <div className="relative pt-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-sm font-medium">Behavioral Questions</span>
                        </div>
                        <div className="text-sm text-muted-foreground">40%</div>
                      </div>
                      <div className="h-2 bg-secondary rounded-full">
                        <div className="h-2 bg-primary rounded-full" style={{ width: '40%' }}></div>
                      </div>
                    </div>
                    
                    <div className="relative pt-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-sm font-medium">Company Research</span>
                        </div>
                        <div className="text-sm text-muted-foreground">20%</div>
                      </div>
                      <div className="h-2 bg-secondary rounded-full">
                        <div className="h-2 bg-primary rounded-full" style={{ width: '20%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="glass rounded-2xl p-6 md:p-8">
                  <h3 className="text-xl font-medium mb-4">Upcoming Interviews</h3>
                  <div className="space-y-4">
                    <Card className="p-4 bg-background border border-border">
                      <div className="flex items-center mb-2">
                        <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center mr-3">
                          <span className="text-lg font-medium">T</span>
                        </div>
                        <div>
                          <h4 className="font-medium">TechCorp</h4>
                          <p className="text-sm text-muted-foreground">Frontend Developer</p>
                        </div>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground mb-3">
                        <Clock size={14} className="mr-1" />
                        <span>Tomorrow, 2:00 PM</span>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs w-full rounded-lg">
                        Prepare Now
                        <ArrowRight size={12} className="ml-1" />
                      </Button>
                    </Card>
                    
                    <Card className="p-4 bg-background border border-border">
                      <div className="flex items-center mb-2">
                        <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center mr-3">
                          <span className="text-lg font-medium">D</span>
                        </div>
                        <div>
                          <h4 className="font-medium">DesignHub</h4>
                          <p className="text-sm text-muted-foreground">UX Designer</p>
                        </div>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground mb-3">
                        <Clock size={14} className="mr-1" />
                        <span>Next Monday, 11:30 AM</span>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs w-full rounded-lg">
                        Prepare Now
                        <ArrowRight size={12} className="ml-1" />
                      </Button>
                    </Card>
                  </div>
                </div>
              </div>
              
              <div className="lg:col-span-2">
                <InterviewPrep />
                
                <div className="glass rounded-2xl p-6 md:p-8 mt-8">
                  <h3 className="text-xl font-medium mb-6">Interview Tips</h3>
                  
                  <div className="space-y-5">
                    {[
                      {
                        icon: CheckCircle,
                        title: "Research the Company",
                        description: "Understanding the company's values, products, and culture shows your interest and helps you tailor your answers accordingly."
                      },
                      {
                        icon: Clock,
                        title: "Mind Your Timing",
                        description: "Aim to keep your answers between 1-2 minutes. Practice concise responses that highlight your key points without rambling."
                      },
                      {
                        icon: Award,
                        title: "Highlight Achievements",
                        description: "Use the STAR method (Situation, Task, Action, Result) to structure your responses and showcase your accomplishments."
                      }
                    ].map((tip) => (
                      <div key={tip.title} className="flex">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                          <tip.icon className="text-primary w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">{tip.title}</h4>
                          <p className="text-sm text-muted-foreground">{tip.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Interview;
