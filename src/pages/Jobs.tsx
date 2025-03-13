
import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import JobPreferences from '@/components/jobs/JobPreferences';
import JobList from '@/components/jobs/JobList';
import ChatSearch from '@/components/jobs/ChatSearch';

const Jobs = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-medium mb-8">Job Discovery</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <ChatSearch />
              
              <div className="lg:col-span-2">
                <JobList />
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Jobs;
