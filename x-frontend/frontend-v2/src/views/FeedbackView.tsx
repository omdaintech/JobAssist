import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/services/api';
import { CheckCircle, AlertCircle } from 'lucide-react';

export const FeedbackView: React.FC = () => {
  const [formData, setFormData] = useState({
    category: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setError('');

    try {
      const response = await api.feedback.submit({
        ...formData,
        captcha_token: '' // Not needed for authenticated users
      });

      if (response.data.success) {
        setSuccess(true);
        setFormData({ category: '', subject: '', message: '' });
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => setSuccess(false), 5000);
      } else {
        throw new Error(response.data.message || 'Failed to submit feedback');
      }
    } catch (err: any) {
      console.error('Feedback submission error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <PageContainer className="py-8">
      <div className="app-page-stack max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Share Your Feedback
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            We'd love to hear your thoughts! Your feedback helps us improve Lingali.
          </p>
        </div>

        {/* Incentive Banner */}
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <span className="text-2xl">🎁</span>
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Help Us Improve - Get Free Credits!</h3>
                <p className="text-sm text-blue-800">
                  Give us genuine feedback and we'll reward you with free credits almost immediately. 
                  Your honest insights help us make Lingali better for everyone!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Success Message */}
        {success && (
          <Card className="mb-6 bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">Feedback Submitted!</p>
                  <p className="text-sm text-green-700">Thank you for helping us improve. We'll review your feedback soon.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <Card className="mb-6 bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feedback Form */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category */}
              <div>
                <Label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </Label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Select a category</option>
                  <option value="bug_report">Bug Report</option>
                  <option value="feature_request">Feature Request</option>
                  <option value="user_experience">User Experience Issue</option>
                  <option value="content_quality">Content Quality</option>
                  <option value="general_feedback">General Feedback</option>
                </select>
              </div>

              {/* Subject */}
              <div>
                <Label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </Label>
                <Input
                  id="subject"
                  name="subject"
                  type="text"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  minLength={5}
                  maxLength={200}
                  disabled={loading}
                  placeholder="Brief summary of your feedback"
                  className="w-full"
                />
              </div>

              {/* Message */}
              <div>
                <Label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Details *
                </Label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  minLength={20}
                  rows={6}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-100"
                  placeholder="Please provide as much detail as possible. For bugs, include steps to reproduce."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 20 characters
                </p>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};
