
import React from 'react';
import { ListFilter } from 'lucide-react';
import JobCard from './JobCard';
import { Button } from '@/components/ui/button';

// Mock job data
const mockJobs = [
  {
    id: '1',
    title: 'Senior Frontend Developer',
    company: 'TechCorp',
    logo: '',
    location: 'San Francisco, CA',
    salary: '$120,000 - $150,000',
    type: 'Full-time',
    posted: '2 days ago',
    description: 'We are looking for a Senior Frontend Developer to join our team. You will be responsible for building and maintaining our web applications.',
    matchScore: 95,
    isNew: true,
  },
  {
    id: '2',
    title: 'UX Designer',
    company: 'DesignHub',
    logo: '',
    location: 'Remote',
    salary: '$90,000 - $110,000',
    type: 'Full-time',
    posted: '1 week ago',
    description: 'DesignHub is seeking a talented UX Designer to create beautiful and functional user experiences for our clients.',
    matchScore: 87,
    isSaved: true,
  },
  {
    id: '3',
    title: 'Product Manager',
    company: 'InnovateCo',
    logo: '',
    location: 'New York, NY',
    salary: '$130,000 - $160,000',
    type: 'Full-time',
    posted: '3 days ago',
    description: 'We are looking for an experienced Product Manager to lead the development of our flagship product.',
  },
];

const JobList = () => {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-medium">
          Recommended Jobs <span className="text-muted-foreground">({mockJobs.length})</span>
        </h2>
        <Button variant="outline" size="sm" className="rounded-lg">
          <ListFilter size={16} className="mr-2" />
          Filters
        </Button>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {mockJobs.map(job => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
      
      <div className="text-center mt-8">
        <Button variant="outline" className="rounded-lg">
          Load More Jobs
        </Button>
      </div>
    </div>
  );
};

export default JobList;
