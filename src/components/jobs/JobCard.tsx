
import React from 'react';
import { Check, Star, BookmarkIcon, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface JobCardProps {
  job: {
    id: string;
    title: string;
    company: string;
    logo: string;
    location: string;
    salary: string;
    type: string;
    posted: string;
    description: string;
    matchScore?: number;
    isNew?: boolean;
    isSaved?: boolean;
  };
}

const JobCard = ({ job }: JobCardProps) => {
  return (
    <div className="glass rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg">
      <div className="px-6 pt-6 pb-5 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="flex">
            <div className="flex-shrink-0 w-12 h-12 rounded bg-secondary flex items-center justify-center mr-4">
              {job.logo ? (
                <img src={job.logo} alt={`${job.company} logo`} className="w-8 h-8 object-contain" />
              ) : (
                <span className="text-lg font-medium">{job.company.charAt(0)}</span>
              )}
            </div>
            <div>
              <h3 className="text-lg font-medium hover:text-primary transition-colors">
                {job.title}
              </h3>
              <p className="text-muted-foreground">{job.company}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {job.matchScore && (
              <div className="rounded-full px-3 py-1 bg-primary/10 text-primary text-sm font-medium">
                {job.matchScore}% Match
              </div>
            )}
            {job.isNew && (
              <div className="rounded-full px-3 py-1 bg-emerald-500/10 text-emerald-500 text-sm font-medium">
                New
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="px-6 py-4">
        <div className="flex flex-wrap gap-4 text-sm mb-4">
          <div className="text-muted-foreground">{job.location}</div>
          <div className="text-muted-foreground">{job.type}</div>
          <div className="text-muted-foreground">{job.salary}</div>
          <div className="text-muted-foreground">Posted {job.posted}</div>
        </div>
        
        <p className="text-foreground/80 mb-6 line-clamp-3">
          {job.description}
        </p>
        
        <div className="flex flex-wrap gap-3 mb-6">
          {['React', 'JavaScript', 'UI/UX'].map((skill) => (
            <div 
              key={skill}
              className="rounded-full px-3 py-1 bg-secondary text-foreground/80 text-sm"
            >
              {skill}
            </div>
          ))}
        </div>
      </div>
      
      <div className="px-6 pb-6 flex flex-wrap gap-3">
        <Button className="flex-1 max-w-fit rounded-lg">View Job</Button>
        <Button variant="outline" className="flex-1 max-w-fit rounded-lg">
          Quick Apply
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-lg ml-auto"
          title={job.isSaved ? "Remove from saved" : "Save job"}
        >
          <BookmarkIcon 
            size={18} 
            className={job.isSaved ? "fill-primary text-primary" : ""} 
          />
        </Button>
      </div>
    </div>
  );
};

export default JobCard;
