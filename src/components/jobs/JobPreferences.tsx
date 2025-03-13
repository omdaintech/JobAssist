
import React, { useState } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

const JobPreferences = () => {
  const [jobTitle, setJobTitle] = useState('');
  const [location, setLocation] = useState('');
  const [salaryRange, setSalaryRange] = useState([50000]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [currentKeyword, setCurrentKeyword] = useState('');

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentKeyword.trim() !== '' && !keywords.includes(currentKeyword.trim())) {
      setKeywords([...keywords, currentKeyword.trim()]);
      setCurrentKeyword('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  return (
    <div className="glass rounded-2xl p-6 md:p-8">
      <div className="space-y-6">
        <div>
          <h3 className="text-2xl font-medium mb-4">Job Preferences</h3>
          <p className="text-muted-foreground">
            Tell us what you're looking for and we'll find the best matches for you.
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title or Role</Label>
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                placeholder="e.g. Software Engineer"
                className="h-12"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. New York or Remote"
                className="h-12"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="salaryRange">Salary Range</Label>
              <span className="text-sm text-muted-foreground">
                ${salaryRange[0].toLocaleString()}
              </span>
            </div>
            <Slider
              id="salaryRange"
              value={salaryRange}
              min={30000}
              max={200000}
              step={5000}
              onValueChange={setSalaryRange}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>$30,000</span>
              <span>$200,000</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="keywords">Skills or Keywords</Label>
            <form onSubmit={handleAddKeyword} className="flex">
              <Input
                id="keywords"
                value={currentKeyword}
                onChange={e => setCurrentKeyword(e.target.value)}
                placeholder="e.g. React, Remote, Part-time"
                className="h-12 rounded-r-none"
              />
              <Button 
                type="submit" 
                variant="outline" 
                size="icon" 
                className="h-12 rounded-l-none"
              >
                <Plus size={18} />
              </Button>
            </form>
            
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {keywords.map(keyword => (
                  <div 
                    key={keyword}
                    className="inline-flex items-center bg-secondary text-foreground rounded-full px-3 py-1 text-sm"
                  >
                    {keyword}
                    <button
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="ml-2 text-muted-foreground hover:text-foreground"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <Button className="w-full h-12 mt-2 rounded-lg">
          <Search size={18} className="mr-2" />
          Find Jobs
        </Button>
      </div>
    </div>
  );
};

export default JobPreferences;
