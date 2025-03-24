
import React from 'react';
import { ArrowRight, BookmarkIcon, BriefcaseIcon, MapPinIcon, DollarSignIcon, CalendarIcon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { JobPosting } from './JobSearchAPI';

interface JobResultCardProps {
  job: JobPosting;
  onSaveJob?: (jobId: string) => void;
  onQuickApply?: (jobId: string) => void;
}

const JobResultCard: React.FC<JobResultCardProps> = ({ 
  job, 
  onSaveJob, 
  onQuickApply 
}) => {
  return (
    <Card key={job.id} className="overflow-hidden border border-border bg-card shadow-sm hover:shadow transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-sm">{job.title}</h3>
            <p className="text-xs text-muted-foreground">{job.company}</p>
          </div>
          <div className="flex items-center gap-2">
            {job.matchScore && (
              <Badge variant="match" className="text-xs">
                {job.matchScore}% Match
              </Badge>
            )}
            {job.isNew && (
              <Badge variant="new" className="text-xs">
                New
              </Badge>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <MapPinIcon className="h-3 w-3" />
            <span>{job.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <BriefcaseIcon className="h-3 w-3" />
            <span>{job.type}</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSignIcon className="h-3 w-3" />
            <span>{job.salary}</span>
          </div>
          <div className="flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            <span>{job.posted}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1 mt-2">
          {job.keySkills.slice(0, 5).map((skill, idx) => (
            <Badge key={idx} variant="skill" className="text-[0.65rem]">
              {skill}
            </Badge>
          ))}
        </div>
        
        <div className="flex items-center gap-2 mt-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="default" className="text-xs h-8 rounded-md">
                  View Job
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View complete job details</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs h-8 rounded-md"
                  onClick={() => onQuickApply && onQuickApply(job.id)}
                >
                  <Check className="mr-1 h-3 w-3" />
                  Quick Apply
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Apply with your saved resume</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button 
            size="sm" 
            variant="ghost" 
            className="ml-auto h-8 w-8 p-0" 
            title="Save job"
            onClick={() => onSaveJob && onSaveJob(job.id)}
          >
            <BookmarkIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default JobResultCard;
