
import React from 'react';
import { Search, FileText, SendHorizontal, MessageSquare } from 'lucide-react';

const Features = () => {
  const features = [
    {
      icon: Search,
      title: 'Job Discovery',
      description: 'Find relevant job openings from multiple platforms with smart filters for your preferences.',
      color: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
    {
      icon: FileText,
      title: 'CV & Cover Letter',
      description: 'Generate tailored, ATS-friendly resumes and cover letters optimized for each job application.',
      color: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
    },
    {
      icon: SendHorizontal,
      title: 'One-Click Apply',
      description: 'Streamline your application process with automated form filling and application tracking.',
      color: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
    },
    {
      icon: MessageSquare,
      title: 'Interview Prep',
      description: 'Prepare for interviews with AI-generated practice questions and personalized feedback.',
      color: 'bg-purple-500/10',
      iconColor: 'text-purple-500',
    },
  ];

  return (
    <section className="py-24 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="mb-4">All-in-one job search assistant</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our AI-powered platform streamlines every aspect of your job search, from discovery to interview, saving you time and increasing your chances of success.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className="glass rounded-xl p-6 transition-all duration-300 hover:translate-y-[-5px] hover:shadow-lg"
            >
              <div className={`p-4 rounded-lg ${feature.color} w-fit mb-4`}>
                <feature.icon className={`${feature.iconColor} w-6 h-6`} />
              </div>
              <h3 className="text-xl font-medium mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
