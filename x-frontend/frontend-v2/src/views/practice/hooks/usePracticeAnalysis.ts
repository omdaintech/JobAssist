/**
 * usePracticeAnalysis Hook
 * 
 * Handles practice session analysis logic.
 * Extracted from PracticeView.tsx lines 210-283 - keeps exact same logic.
 */

import { useState } from 'react';
import { api } from '@/services/api';

const MIN_ANALYSIS_DURATION_MS = 60 * 1000; // 60 seconds
const PROGRESS_INTERVAL_MS = 1000;
const STEP_COUNT = 4;

export const usePracticeAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const triggerSessionAnalysis = async (
    sessionId: string,
    onComplete: (sessionId: string) => void
  ) => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysisProgress(0);
    setCurrentStep(1);

    const startTimestamp = Date.now();

    // Simulate analysis progress
    const progressInterval = window.setInterval(() => {
      const elapsed = Date.now() - startTimestamp;
      const normalizedProgress = Math.min(1, elapsed / MIN_ANALYSIS_DURATION_MS);
      const targetProgress = normalizedProgress * 95;

      setAnalysisProgress(prev => {
        if (prev >= 95) {
          return 95;
        }

        const easedProgress = Math.max(prev, targetProgress);
        const jitter = Math.random() * 0.3;
        return Math.min(95, easedProgress + jitter);
      });
    }, PROGRESS_INTERVAL_MS);

    const stepInterval = window.setInterval(() => {
      const elapsed = Date.now() - startTimestamp;
      const stepDuration = MIN_ANALYSIS_DURATION_MS / STEP_COUNT;
      const computedStep = Math.min(STEP_COUNT, Math.floor(elapsed / stepDuration) + 1);

      setCurrentStep(prev => (prev < computedStep ? computedStep : prev));

      if (computedStep >= STEP_COUNT) {
        window.clearInterval(stepInterval);
      }
    }, PROGRESS_INTERVAL_MS);

    try {
      // Call the analysis API
      const response = await api.practice.analyzeSession(sessionId);
      
      if (response.data.success) {
        // Complete the progress immediately
        setAnalysisProgress(100);
        setCurrentStep(STEP_COUNT);
        window.clearInterval(progressInterval);
        window.clearInterval(stepInterval);
        
        // Brief delay to show completion animation, then reload results
        setTimeout(() => {
          // Force a page reload to fetch fresh analyzed data
          window.location.href = `/practice/session/${sessionId}/results`;
        }, 500);
      } else if (response.data.reason && response.data.reason.includes('already been analyzed')) {
        // Session is already analyzed, just navigate normally
        onComplete(sessionId);
      } else {
        setError('Analysis failed. Please try again.');
      }
    } catch (err: any) {
      // Check if error response indicates session is already analyzed
      if (err.response?.data?.reason && err.response.data.reason.includes('already been analyzed')) {
        setError('This session has already been analyzed. Refreshing results...');
        
        // Brief delay then reload to show fresh results
        setTimeout(() => {
          window.location.href = `/practice/session/${sessionId}/results`;
        }, 1500);
      } else {
        setError(err.response?.data?.detail || 'Failed to start analysis');
      }
    } finally {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      setIsAnalyzing(false);
    }
  };

  return {
    isAnalyzing,
    analysisProgress,
    currentStep,
    error,
    setError,
    triggerSessionAnalysis
  };
};

