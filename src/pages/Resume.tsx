
import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ResumeBuilder from '@/components/resume/ResumeBuilder';
import { Button } from '@/components/ui/button';
import { Upload, FileText, MessageSquare } from 'lucide-react';

const Resume = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-medium mb-8">Resume Builder</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="space-y-8">
                <div className="glass rounded-2xl p-6 md:p-8">
                  <h3 className="text-xl font-medium mb-4">Upload Resume</h3>
                  <p className="text-muted-foreground mb-6">
                    Already have a resume? Upload it to use as a starting point.
                  </p>
                  
                  <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                      <Upload className="text-primary w-6 h-6" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Drag and drop your file here, or click to browse
                    </p>
                    <Button variant="outline" size="sm">
                      Choose File
                    </Button>
                  </div>
                </div>
                
                <div className="glass rounded-2xl p-6 md:p-8">
                  <h3 className="text-xl font-medium mb-4">Profile Information</h3>
                  <p className="text-muted-foreground mb-6">
                    Complete your profile to generate better resumes and cover letters.
                  </p>
                  
                  <div className="space-y-3">
                    {[
                      { icon: FileText, label: 'Work Experience', status: 'Incomplete' },
                      { icon: FileText, label: 'Education', status: 'Complete' },
                      { icon: FileText, label: 'Skills', status: 'Incomplete' },
                      { icon: MessageSquare, label: 'Personal Statement', status: 'Not Started' },
                    ].map((item) => (
                      <div 
                        key={item.label} 
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                      >
                        <div className="flex items-center">
                          <item.icon className="w-5 h-5 text-muted-foreground mr-3" />
                          <span>{item.label}</span>
                        </div>
                        <span className={`text-sm ${
                          item.status === 'Complete' 
                            ? 'text-emerald-500' 
                            : item.status === 'Incomplete' 
                              ? 'text-amber-500' 
                              : 'text-muted-foreground'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <Button className="w-full mt-6 rounded-lg">
                    Complete Profile
                  </Button>
                </div>
              </div>
              
              <div className="lg:col-span-2">
                <ResumeBuilder />
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Resume;
