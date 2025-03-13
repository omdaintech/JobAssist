
import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Hero = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-24 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 -z-10 bg-texture"></div>
      <div className="absolute top-1/3 -right-64 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 -left-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
      
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium animate-fade-in">
            Introducing Job Assistant AI
          </div>
          
          <h1 className="mb-6 font-medium leading-tight animate-fade-in animate-delay-100">
            <span className="block">Find your dream job with</span>
            <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              AI-powered assistance
            </span>
          </h1>
          
          <p className="mb-10 text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in animate-delay-200">
            Your personal AI job assistant that helps you discover opportunities, create professional resumes, and prepare for interviews—all in one place.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in animate-delay-300">
            <Button size="lg" className="rounded-full text-base px-8">
              Get Started
              <ArrowRight size={18} className="ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="rounded-full text-base px-8">
              See How It Works
            </Button>
          </div>
        </div>
        
        <div className="mt-16 relative max-w-5xl mx-auto animate-fade-in animate-delay-400">
          <div className="aspect-video overflow-hidden rounded-xl shadow-2xl glass">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-xl font-medium text-foreground/80">
                [AI Job Assistant Dashboard Preview]
              </div>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute -top-6 -left-6 w-12 h-12 bg-blue-100 rounded-lg rotate-12 animate-pulse-slow hidden md:block"></div>
          <div className="absolute -bottom-8 -right-8 w-16 h-16 bg-primary/20 rounded-full animate-pulse-slow hidden md:block"></div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
