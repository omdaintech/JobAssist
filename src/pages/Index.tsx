
import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/home/Hero';
import Features from '@/components/home/Features';
import { Button } from '@/components/ui/button';
import { ArrowRight, Briefcase, FileText, MessageSquare, ArrowUpRight } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <Hero />
        <Features />
        
        {/* How it works section */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center mb-16">
              <h2 className="mb-4">How JobAssist works</h2>
              <p className="text-lg text-muted-foreground">
                Our AI-powered platform streamlines your job search from discovery to landing the job.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
              {[
                {
                  icon: Briefcase,
                  title: 'Find Jobs',
                  description: 'Discover tailored job opportunities that match your experience and preferences.',
                  link: '/jobs',
                },
                {
                  icon: FileText,
                  title: 'Perfect Your Resume',
                  description: 'Create customized resumes and cover letters optimized for each application.',
                  link: '/resume',
                },
                {
                  icon: MessageSquare,
                  title: 'Prepare for Interviews',
                  description: 'Practice with AI-powered interview questions and get feedback on your responses.',
                  link: '/interview',
                },
              ].map((step, index) => (
                <div key={step.title} className="relative">
                  {index < 2 && (
                    <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-primary/60 to-primary/0 -z-10"></div>
                  )}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <step.icon className="text-primary w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-medium mb-2">{step.title}</h3>
                    <p className="text-muted-foreground mb-4">{step.description}</p>
                    <Button variant="link" asChild>
                      <a href={step.link} className="inline-flex items-center">
                        Learn more
                        <ArrowRight size={14} className="ml-1" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-24 bg-secondary/50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto glass rounded-3xl p-10 md:p-16 text-center">
              <h2 className="mb-4">Ready to supercharge your job search?</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of job seekers who have found their dream jobs with the help of our AI-powered assistant.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="rounded-full text-base px-8">
                  Get Started
                  <ArrowUpRight size={18} className="ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="rounded-full text-base px-8">
                  View Demo
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
