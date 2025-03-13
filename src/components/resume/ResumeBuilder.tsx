
import React, { useState } from 'react';
import { FileText, Download, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ResumeBuilder = () => {
  const [activeTab, setActiveTab] = useState('resume');
  
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-border">
        <h3 className="text-xl font-medium">AI Document Generator</h3>
        <p className="text-muted-foreground">
          Create tailored resumes and cover letters optimized for each job application.
        </p>
      </div>
      
      <Tabs defaultValue="resume" onValueChange={setActiveTab}>
        <div className="px-6 pt-5">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="resume" className="text-sm">Resume / CV</TabsTrigger>
            <TabsTrigger value="cover" className="text-sm">Cover Letter</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="resume" className="px-6 pb-6 animate-fade-in">
          <div className="mb-6">
            <div className="aspect-[8.5/11] bg-white rounded-lg overflow-hidden shadow-md relative">
              <div className="absolute inset-0 flex flex-col">
                <div className="bg-primary/10 p-6">
                  <div className="h-8 w-48 bg-gray-800 rounded mb-2"></div>
                  <div className="h-4 w-36 bg-gray-600 rounded"></div>
                </div>
                <div className="p-6 flex-1">
                  <div className="h-4 w-full bg-gray-200 rounded mb-3"></div>
                  <div className="h-4 w-full bg-gray-200 rounded mb-3"></div>
                  <div className="h-4 w-2/3 bg-gray-200 rounded mb-6"></div>
                  
                  <div className="h-5 w-32 bg-gray-400 rounded mb-4"></div>
                  <div className="h-4 w-full bg-gray-200 rounded mb-3"></div>
                  <div className="h-4 w-full bg-gray-200 rounded mb-3"></div>
                  <div className="h-4 w-3/4 bg-gray-200 rounded mb-6"></div>
                  
                  <div className="h-5 w-32 bg-gray-400 rounded mb-4"></div>
                  <div className="h-4 w-full bg-gray-200 rounded mb-3"></div>
                  <div className="h-4 w-full bg-gray-200 rounded mb-3"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between gap-3">
              <Button className="flex-1 rounded-lg">
                <FileText size={18} className="mr-2" />
                Generate Resume
              </Button>
              <Button variant="outline" size="icon" className="rounded-lg">
                <Download size={18} />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Our AI will create a tailored resume based on your profile and job description.
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="cover" className="px-6 pb-6 animate-fade-in">
          <div className="mb-6">
            <div className="aspect-[8.5/11] bg-white rounded-lg overflow-hidden shadow-md relative">
              <div className="absolute inset-0 flex flex-col p-6">
                <div className="h-4 w-1/3 bg-gray-800 rounded-sm mb-8"></div>
                <div className="h-5 w-40 bg-gray-800 rounded mb-2"></div>
                <div className="h-4 w-36 bg-gray-600 rounded mb-8"></div>
                
                <div className="h-4 w-full bg-gray-200 rounded mb-3"></div>
                <div className="h-4 w-full bg-gray-200 rounded mb-3"></div>
                <div className="h-4 w-full bg-gray-200 rounded mb-3"></div>
                <div className="h-4 w-full bg-gray-200 rounded mb-3"></div>
                <div className="h-4 w-full bg-gray-200 rounded mb-3"></div>
                <div className="h-4 w-3/4 bg-gray-200 rounded mb-8"></div>
                
                <div className="h-4 w-1/3 bg-gray-200 rounded mb-6"></div>
                <div className="h-5 w-40 bg-gray-600 rounded"></div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between gap-3">
              <Button className="flex-1 rounded-lg">
                <FileText size={18} className="mr-2" />
                Generate Cover Letter
              </Button>
              <Button variant="outline" size="icon" className="rounded-lg">
                <Copy size={18} />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Create a personalized cover letter that highlights your relevant skills and experience.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ResumeBuilder;
