/**
 * useExamAnalysis Hook
 * 
 * Handles exam analysis logic with countdown timer.
 * Extracted from ExamResultsView.tsx lines 21-22, 25-26, 109-137, 147-154, 200-234.
 * Keeps exact same logic.
 */

import { useState, useEffect } from 'react';
import { api } from '@/services/api';

export const useExamAnalysis = () => {
  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Countdown timer state
  const [countdown, setCountdown] = useState(60); // 60 seconds
  const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null);

  // Countdown timer effect - cleanup function
  useEffect(() => {
    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [countdownInterval]);

  const startCountdown = () => {
    setCountdown(60); // Reset to 60 seconds
    const interval = setInterval(() => {
      setCountdown(prevCountdown => {
        if (prevCountdown <= 1) {
          clearInterval(interval);
          setCountdownInterval(null);
          return 0;
        }
        return prevCountdown - 1;
      });
    }, 1000);
    setCountdownInterval(interval);
  };

  const stopCountdown = () => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      setCountdownInterval(null);
    }
  };

  const getCountdownProgress = (): number => {
    return Math.round(((60 - countdown) / 60) * 100);
  };

  const getCurrentAnalysisStep = (): number => {
    const elapsed = 60 - countdown;
    if (elapsed < 15) return 1; // 0-15s: Step 1
    if (elapsed < 30) return 2; // 15-30s: Step 2
    if (elapsed < 45) return 3; // 30-45s: Step 3
    return 4; // 45s+: Step 4
  };

  // Handle starting analysis 
  const handleStartAnalysis = async (
    examId: string,
    onComplete: () => Promise<void>
  ) => {
    if (!examId) return;
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    startCountdown();
    
    try {
      const response = await api.sessions.analyze(examId);
      
      if (response.data.success) {
        // Reload exam data to get updated status
        await onComplete();
      } else {
        setAnalysisError('Analysis failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Error starting analysis:', err);
      setAnalysisError(err.response?.data?.detail || 'Failed to start analysis');
    } finally {
      setIsAnalyzing(false);
      setCountdown(60);
      if (countdownInterval) {
        clearInterval(countdownInterval);
        setCountdownInterval(null);
      }
    }
  };

  return {
    isAnalyzing,
    analysisError,
    countdown,
    countdownInterval,
    setAnalysisError,
    handleStartAnalysis,
    startCountdown,
    stopCountdown,
    getCountdownProgress,
    getCurrentAnalysisStep
  };
};

