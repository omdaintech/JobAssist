
// This file simulates a backend API for job searches
import { useState, useEffect } from 'react';

// Types
export interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  posted: string;
  description: string;
  requirements: string[];
  benefits: string[];
  matchScore?: number;
  keySkills: string[];
  isNew?: boolean;
  applicationUrl?: string;
  companyLogoUrl?: string;
}

export interface SearchQuery {
  query: string;
  filters?: {
    location?: string;
    minSalary?: number;
    remote?: boolean;
    recency?: 'day' | 'week' | 'month' | 'any';
  }
}

export interface SearchResults {
  jobs: JobPosting[];
  totalMatches: number;
  suggestedQueries?: string[];
  analyticsInsight?: string;
}

// Mock job database
const jobDatabase: JobPosting[] = [
  {
    id: '1',
    title: 'Senior Frontend Developer',
    company: 'TechCorp',
    location: 'San Francisco, CA',
    salary: '$120,000 - $150,000',
    type: 'Full-time',
    posted: '2 days ago',
    description: 'TechCorp is seeking a Senior Frontend Developer to join our growing team. You will be responsible for building user interfaces for our web applications using React, TypeScript, and modern CSS.',
    requirements: ['5+ years experience with JavaScript', 'Experience with React', 'Experience with TypeScript', 'Experience with CSS/SCSS', 'Bachelor\'s degree in Computer Science or equivalent'],
    benefits: ['Health, dental, and vision insurance', '401(k) matching', 'Flexible work hours', 'Remote work options', 'Professional development stipend'],
    matchScore: 95,
    keySkills: ['React', 'TypeScript', 'CSS', 'JavaScript', 'UI/UX'],
    isNew: true,
    applicationUrl: 'https://techcorp.com/careers',
    companyLogoUrl: '/placeholder.svg',
  },
  {
    id: '2',
    title: 'UX Designer',
    company: 'DesignHub',
    location: 'Remote',
    salary: '$90,000 - $110,000',
    type: 'Full-time',
    posted: '1 week ago',
    description: 'DesignHub is looking for a UX Designer to create amazing user experiences for our clients. You will work closely with our product team and developers to design intuitive and engaging interfaces.',
    requirements: ['3+ years of UX design experience', 'Proficiency with Figma or similar design tools', 'Experience conducting user research', 'Portfolio demonstrating your design process'],
    benefits: ['Fully remote', 'Flexible schedule', 'Health benefits', 'Design stipend', 'Continuing education allowance'],
    matchScore: 87,
    keySkills: ['Figma', 'UI/UX', 'User Research', 'Wireframing', 'Prototyping'],
    applicationUrl: 'https://designhub.com/jobs',
    companyLogoUrl: '/placeholder.svg',
  },
  {
    id: '3',
    title: 'Product Manager',
    company: 'InnovateCo',
    location: 'New York, NY',
    salary: '$130,000 - $160,000',
    type: 'Full-time',
    posted: '3 days ago',
    description: 'InnovateCo is seeking an experienced Product Manager to lead our product development initiatives. You will work cross-functionally to define product strategy and roadmap.',
    requirements: ['5+ years of product management experience', 'Experience with agile methodology', 'Strong analytical skills', 'Excellent communication skills'],
    benefits: ['Competitive salary', 'Health, dental, and vision insurance', 'Stock options', 'Unlimited PTO', 'Work from home Fridays'],
    matchScore: 82,
    keySkills: ['Product Strategy', 'Agile', 'Roadmapping', 'User Stories', 'Market Analysis'],
    applicationUrl: 'https://innovateco.com/careers',
    companyLogoUrl: '/placeholder.svg',
  },
  {
    id: '4',
    title: 'Data Scientist',
    company: 'AnalyticsPro',
    location: 'Boston, MA',
    salary: '$115,000 - $145,000',
    type: 'Full-time',
    posted: '1 day ago',
    description: 'AnalyticsPro is looking for a Data Scientist to join our team. You will analyze complex data sets, build machine learning models, and extract actionable insights for our clients.',
    requirements: ['Masters or PhD in Statistics, Computer Science, or related field', 'Experience with Python, R, and SQL', 'Knowledge of machine learning techniques', 'Experience with data visualization tools'],
    benefits: ['Competitive salary', 'Comprehensive benefits package', 'Flexible work arrangements', 'Continuous learning opportunities', 'Modern office space'],
    matchScore: 78,
    keySkills: ['Python', 'Machine Learning', 'SQL', 'Data Visualization', 'Statistics'],
    isNew: true,
    applicationUrl: 'https://analyticspro.com/jobs',
    companyLogoUrl: '/placeholder.svg',
  },
  {
    id: '5',
    title: 'DevOps Engineer',
    company: 'CloudSystems',
    location: 'Seattle, WA',
    salary: '$125,000 - $155,000',
    type: 'Full-time',
    posted: '5 days ago',
    description: 'CloudSystems is seeking a DevOps Engineer to help us build and maintain our cloud infrastructure. You will work with our engineering team to automate deployments, manage infrastructure, and optimize system performance.',
    requirements: ['3+ years experience in DevOps or SRE roles', 'Experience with AWS or Azure', 'Knowledge of containerization (Docker, Kubernetes)', 'Familiarity with CI/CD pipelines', 'Infrastructure as Code experience (Terraform, CloudFormation)'],
    benefits: ['Competitive salary', 'Health, dental, and vision insurance', '401(k) with company match', 'Flexible work hours', 'Remote work options'],
    matchScore: 89,
    keySkills: ['AWS', 'Kubernetes', 'Docker', 'Terraform', 'CI/CD'],
    applicationUrl: 'https://cloudsystems.com/careers',
    companyLogoUrl: '/placeholder.svg',
  },
  {
    id: '6',
    title: 'Full Stack Engineer',
    company: 'WebWizards',
    location: 'Remote',
    salary: '$110,000 - $140,000',
    type: 'Full-time',
    posted: '2 days ago',
    description: 'WebWizards is looking for a Full Stack Engineer comfortable working with both frontend and backend technologies. You will develop features across the entire stack and help us build scalable web applications.',
    requirements: ['4+ years of full stack development experience', 'Proficiency in JavaScript/TypeScript', 'Experience with React or similar frontend frameworks', 'Experience with Node.js, Express, or similar backend technologies', 'Knowledge of SQL and NoSQL databases'],
    benefits: ['100% remote work', 'Flexible hours', 'Home office stipend', 'Health and wellness benefits', 'Professional development budget'],
    matchScore: 92,
    keySkills: ['React', 'Node.js', 'TypeScript', 'MongoDB', 'Express'],
    isNew: true,
    applicationUrl: 'https://webwizards.com/jobs',
    companyLogoUrl: '/placeholder.svg',
  },
];

// Simulated AI response templates for different search contexts
export const aiResponseTemplates = {
  default: "I've found some job postings that might interest you. Here are a few matches:",
  salary: "I found jobs matching your salary requirements. Here are some positions:",
  remote: "I've found remote positions that match your skills. Take a look:",
  specific: "Based on your specific requirements, I found these potential matches:",
  noResults: "I couldn't find exact matches for your criteria. Consider broadening your search or try these alternatives:",
  skills: "Based on your skills and experience, these positions might be a good fit:",
  location: "I found jobs in your preferred location. Here are some opportunities:",
  senior: "Here are senior-level positions that match your experience:",
  junior: "I found entry-level and junior positions that might be a good fit:",
  recommend: "Based on your profile and previous searches, I recommend these jobs:",
};

// Simulate an API call with artificial delay
export const searchJobs = async (searchQuery: SearchQuery): Promise<SearchResults> => {
  console.log('Searching for jobs with query:', searchQuery);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Simple keyword matching for demo purposes
  const query = searchQuery.query.toLowerCase();
  let filteredJobs = [...jobDatabase];
  let responseType = 'default';
  
  // Apply basic filters
  if (query.includes('developer') || query.includes('engineer') || query.includes('programming')) {
    filteredJobs = filteredJobs.filter(job => 
      job.title.toLowerCase().includes('developer') || 
      job.title.toLowerCase().includes('engineer') ||
      job.keySkills.some(skill => ['javascript', 'python', 'java', 'c++', 'react', 'node'].includes(skill.toLowerCase()))
    );
    
    if (query.includes('frontend') || query.includes('front-end') || query.includes('ui')) {
      filteredJobs = filteredJobs.filter(job => 
        job.title.toLowerCase().includes('frontend') || 
        job.title.toLowerCase().includes('ui') ||
        job.keySkills.some(skill => ['react', 'vue', 'angular', 'css', 'html'].includes(skill.toLowerCase()))
      );
      responseType = 'specific';
    }
    
    if (query.includes('backend') || query.includes('back-end') || query.includes('api')) {
      filteredJobs = filteredJobs.filter(job => 
        job.title.toLowerCase().includes('backend') || 
        job.title.toLowerCase().includes('api') ||
        job.keySkills.some(skill => ['node', 'python', 'java', 'c#', 'sql'].includes(skill.toLowerCase()))
      );
      responseType = 'specific';
    }
  }
  
  if (query.includes('design') || query.includes('ux') || query.includes('ui')) {
    filteredJobs = filteredJobs.filter(job => 
      job.title.toLowerCase().includes('design') || 
      job.title.toLowerCase().includes('ux') ||
      job.title.toLowerCase().includes('ui') ||
      job.keySkills.some(skill => ['figma', 'sketch', 'adobe', 'user research'].includes(skill.toLowerCase()))
    );
    responseType = 'specific';
  }
  
  if (query.includes('remote') || query.includes('work from home') || query.includes('telecommute')) {
    filteredJobs = filteredJobs.filter(job => job.location.toLowerCase().includes('remote'));
    responseType = 'remote';
  }
  
  if (query.includes('salary') || query.includes('pay') || query.includes('compensation')) {
    // This would typically be more sophisticated with actual salary parsing
    responseType = 'salary';
  }
  
  if (query.includes('senior') || query.includes('experienced') || query.includes('lead')) {
    filteredJobs = filteredJobs.filter(job => 
      job.title.toLowerCase().includes('senior') || 
      job.title.toLowerCase().includes('lead') ||
      parseInt(job.requirements[0].split('+')[0]) >= 5
    );
    responseType = 'senior';
  }
  
  if (query.includes('junior') || query.includes('entry') || query.includes('graduate')) {
    filteredJobs = filteredJobs.filter(job => 
      job.title.toLowerCase().includes('junior') || 
      job.title.toLowerCase().includes('associate') ||
      !job.title.toLowerCase().includes('senior')
    );
    responseType = 'junior';
  }
  
  // Location filtering
  ['san francisco', 'new york', 'seattle', 'boston', 'chicago'].forEach(city => {
    if (query.includes(city)) {
      filteredJobs = filteredJobs.filter(job => job.location.toLowerCase().includes(city));
      responseType = 'location';
    }
  });
  
  // If no results, provide some fallbacks
  if (filteredJobs.length === 0) {
    responseType = 'noResults';
    filteredJobs = jobDatabase.slice(0, 3); // Just return some jobs
  }
  
  // Sort by match score (in a real system, this would be more sophisticated)
  filteredJobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  
  // Limit results for demo
  filteredJobs = filteredJobs.slice(0, 4);
  
  // Return simulated search results
  return {
    jobs: filteredJobs,
    totalMatches: filteredJobs.length,
    suggestedQueries: generateSuggestedQueries(query),
    analyticsInsight: generateAnalyticsInsight(filteredJobs),
    responseType: responseType,
  };
};

// Generate suggested queries based on the original query
function generateSuggestedQueries(query: string): string[] {
  const baseSuggestions = [
    'remote developer jobs',
    'senior software engineer positions',
    'UX designer with Figma experience',
    'data science jobs with Python',
    'product manager roles in tech'
  ];
  
  // In a real system, these would be generated based on the query and user profile
  return baseSuggestions.slice(0, 3);
}

// Generate analytics insight based on the search results
function generateAnalyticsInsight(jobs: JobPosting[]): string {
  const insights = [
    `There are currently ${jobs.length * 15} similar jobs posted in the last 30 days.`,
    `Average salary for these positions is approximately $${110000 + Math.floor(Math.random() * 30000)}.`,
    `Most of these roles require ${Math.floor(Math.random() * 5) + 2}+ years of experience.`,
    `${Math.floor(Math.random() * 30) + 40}% of similar positions offer remote work options.`,
    `Companies are typically filling these roles within ${Math.floor(Math.random() * 20) + 10} days.`
  ];
  
  // Return a random insight
  return insights[Math.floor(Math.random() * insights.length)];
}

// Hook for using the job search API
export function useJobSearch() {
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const search = async (query: SearchQuery) => {
    try {
      setIsLoading(true);
      setError(null);
      const searchResults = await searchJobs(query);
      setResults(searchResults);
      return searchResults;
    } catch (err) {
      setError('Failed to search for jobs. Please try again.');
      console.error('Job search error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  return { search, results, isLoading, error };
}
