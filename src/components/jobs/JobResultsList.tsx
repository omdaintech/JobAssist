
import React from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobPosting } from './JobSearchAPI';
import JobResultCard from './JobResultCard';

interface JobResultsListProps {
  jobs: JobPosting[];
  onSaveJob?: (jobId: string) => void;
  onQuickApply?: (jobId: string) => void;
}

const JobResultsList: React.FC<JobResultsListProps> = ({ 
  jobs, 
  onSaveJob, 
  onQuickApply 
}) => {
  return (
    <div className="space-y-3">
      {jobs.map(job => (
        <JobResultCard 
          key={job.id} 
          job={job} 
          onSaveJob={onSaveJob} 
          onQuickApply={onQuickApply} 
        />
      ))}
      
      <div className="flex justify-center mt-2">
        <Button variant="outline" size="sm" className="text-xs">
          <Filter className="mr-1 h-3 w-3" />
          Refine Results
        </Button>
      </div>
    </div>
  );
};

export default JobResultsList;
