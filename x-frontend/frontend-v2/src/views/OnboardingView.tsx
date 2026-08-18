import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Label, LoadingSpinner } from '@/components/ui';
import { Sparkles } from 'lucide-react';
import api, { LanguageInfo, CompleteOnboardingRequest } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

type UserGoal = 'exam_prep' | 'level_check' | 'skill_improvement';

interface OnboardingData {
  goal?: UserGoal;
  targetLevel?: 'A1' | 'A2' | 'B1' | 'B2';
  assessmentLanguageId?: string;
}

export const OnboardingView: React.FC = () => {
  const navigate = useNavigate();
  const { isOnboarded, user, preferredLanguage, checkAuthStatus } = useAuth();
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [languages, setLanguages] = useState<LanguageInfo[]>([]);
  const [isLanguagesLoading, setIsLanguagesLoading] = useState(false);
  const [languageError, setLanguageError] = useState<string | null>(null);

  // Set page title
  useEffect(() => {
    document.title = 'Getting Started | One-CEFR';
  }, []);

  // Load available assessment languages
  useEffect(() => {
    const loadLanguages = async () => {
      setIsLanguagesLoading(true);
      try {
        const response = await api.languages.getAvailable();
        if (response.data.success) {
          setLanguages(response.data.languages || []);
        } else {
          setLanguageError('Unable to load assessment languages.');
        }
      } catch (err) {
        console.error('Failed to load languages:', err);
        setLanguageError('Unable to load assessment languages.');
      } finally {
        setIsLanguagesLoading(false);
      }
    };

    loadLanguages();
  }, []);

  // Prefill onboarding data from existing user profile
  useEffect(() => {
    if (!user) return;

    setOnboardingData((prev) => {
      const next: OnboardingData = { ...prev };

      if (user.target_level && ['A1', 'A2', 'B1', 'B2'].includes(user.target_level)) {
        next.targetLevel = user.target_level as OnboardingData['targetLevel'];
      }

      if (user.onboarding_goal && ['exam_prep', 'level_check', 'skill_improvement'].includes(user.onboarding_goal)) {
        next.goal = user.onboarding_goal as UserGoal;
      }

      if (user.preferred_language_id) {
        next.assessmentLanguageId = user.preferred_language_id;
      }

      return next;
    });
  }, [user]);

  // Ensure assessment language defaults to preferred language or first available
  useEffect(() => {
    const defaultLanguageId =
      onboardingData.assessmentLanguageId ||
      preferredLanguage?.language_id ||
      user?.preferred_language_id ||
      (languages.length > 0 ? languages[0].language_id : undefined);

    if (defaultLanguageId && defaultLanguageId !== onboardingData.assessmentLanguageId) {
      setOnboardingData((prev) => ({
        ...prev,
        assessmentLanguageId: defaultLanguageId,
      }));
    }
  }, [languages, preferredLanguage, user, onboardingData.assessmentLanguageId]);

  const handleComplete = async () => {
    setIsLoading(true);
    setError(null);

    if (!onboardingData.targetLevel) {
      setError('Please select your target level to continue.');
      setIsLoading(false);
      return;
    }

    if (!onboardingData.assessmentLanguageId) {
      setError('Please select an assessment language to continue.');
      setIsLoading(false);
      return;
    }

    try {
      // Backend will set current_level = target_level if not provided
      const onboardingPayload: CompleteOnboardingRequest = {
        current_level: onboardingData.targetLevel, // Set current = target
        target_level: onboardingData.targetLevel,
        onboarding_goal: onboardingData.goal,
        practice_frequency_per_week: 3, // Default value
        preferred_language_id: onboardingData.assessmentLanguageId,
      };

      await api.user.completeOnboarding(onboardingPayload);
      await checkAuthStatus();
      
      // Navigate to practice page with pre-filled modal
      navigate(`/practice?create=true&level=${onboardingData.targetLevel}&activity=hearing`, { replace: true });
    } catch (err: any) {
      console.error('Onboarding setup error:', err);
      setError(err.response?.data?.message || 'Failed to complete onboarding. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderAlreadyOnboarded = () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <Card className="w-full max-w-xl shadow-2xl">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">You're already onboarded</CardTitle>
          <CardDescription className="text-gray-600">
            Update your details from your profile anytime. Choose where you'd like to go next.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <p className="text-sm text-blue-800">
              Need to make changes? Head to your profile to adjust your goals, levels, or language preferences.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => navigate('/dashboard')} className="flex-1">
              Go to Dashboard
            </Button>
            <Button variant="outline" onClick={() => navigate('/settings')} className="flex-1">
              Review Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (isOnboarded) {
    return renderAlreadyOnboarded();
  }

  // Single-page onboarding form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="space-y-2 pb-6 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">
            Welcome to One-CEFR! 🎉
          </CardTitle>
          <CardDescription className="text-base text-gray-600">
            Let's personalize your experience in 30 seconds
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Target Level - Required */}
          <div className="space-y-3">
            <Label htmlFor="target-level" className="text-base font-semibold flex items-center gap-2">
              What level are you aiming for? <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-4 gap-3">
              {(['A1', 'A2', 'B1', 'B2'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() =>
                    setOnboardingData((prev) => ({ ...prev, targetLevel: level }))
                  }
                  className={`p-4 rounded-lg border-2 font-semibold transition-all ${
                    onboardingData.targetLevel === level
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              💡 Choose the CEFR level you're working towards
            </p>
          </div>

          {/* Assessment Language - Required */}
          <div className="space-y-3">
            <Label htmlFor="assessment-language" className="text-base font-semibold flex items-center gap-2">
              Assessment language <span className="text-red-500">*</span>
            </Label>
            {languageError && (
              <div className="text-sm text-red-600">{languageError}</div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {isLanguagesLoading && (
                <div className="col-span-full flex items-center gap-2 text-sm text-gray-500">
                  <LoadingSpinner size="sm" /> Loading languages...
                </div>
              )}
              {!isLanguagesLoading && languages.length === 0 && (
                <div className="col-span-full text-sm text-gray-500">
                  Languages will appear here once available.
                </div>
              )}
              {languages.map((language) => {
                const isSupported = language.is_active === true;
                const isSelected = onboardingData.assessmentLanguageId === language.language_id;
                const isDisabled = !isSupported;

                return (
                  <button
                    key={language.language_id}
                    onClick={() => {
                      if (!isDisabled) {
                        setOnboardingData((prev) => ({
                          ...prev,
                          assessmentLanguageId: language.language_id,
                        }));
                      }
                    }}
                    disabled={isDisabled}
                    className={`p-4 rounded-lg border-2 font-semibold transition-all text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-700'
                    } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-300 hover:bg-blue-50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{language.language_name}</span>
                      {isDisabled && <span className="text-xs text-gray-400">Soon</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Goal - Optional */}
          <div className="space-y-3">
            <Label htmlFor="goal" className="text-base font-semibold">
              What's your goal? <span className="text-sm text-gray-500 font-normal">(Optional)</span>
            </Label>
            <div className="space-y-2">
              {[
                { value: 'exam_prep' as UserGoal, label: 'Preparing for an official exam', emoji: '📝' },
                { value: 'level_check' as UserGoal, label: 'Want to know my current level', emoji: '🎯' },
                { value: 'skill_improvement' as UserGoal, label: 'Improve specific skills', emoji: '💪' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    setOnboardingData((prev) => ({
                      ...prev,
                      goal: prev.goal === option.value ? undefined : option.value,
                    }))
                  }
                  className={`w-full p-4 rounded-lg border-2 font-medium transition-all text-left ${
                    onboardingData.goal === option.value
                      ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  <span className="mr-2">{option.emoji}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={handleComplete}
              disabled={
                isLoading ||
                !onboardingData.targetLevel ||
                !onboardingData.assessmentLanguageId
              }
              className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 font-semibold"
              size="lg"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  <span>Setting up...</span>
                </div>
              ) : (
                'Start Practicing →'
              )}
            </Button>
          </div>

          {/* Quick Info */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200 mt-4">
            <p className="text-sm text-green-800">
              ✨ <strong>10 FREE trial credits</strong> included • Full AI feedback • No credit card required
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingView;
