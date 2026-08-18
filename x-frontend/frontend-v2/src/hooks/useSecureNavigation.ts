import { useAuth } from "@/context/AuthContext";
import { NavigateOptions, useNavigate } from "react-router-dom";
import { getSessionTakingUrl, getResultsUrl, getAnalyzingUrl } from "@/utils/navigation-utils";

// Custom hook for secure navigation with authentication checks
export const useSecureNavigation = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isInitialized } = useAuth();

  const secureNavigate = (path: string, options?: NavigateOptions) => {
    // Wait for auth to initialize before making navigation decisions
    if (!isInitialized) {
      return;
    }

    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }

    navigate(path, options);
  };

  const redirectToLogin = (options?: NavigateOptions) => {
    navigate("/login", { replace: true, ...options });
  };

  const redirectToDashboard = (options?: NavigateOptions) => {
    navigate("/dashboard", { replace: true, ...options });
  };

  return {
    secureNavigate,
    redirectToLogin,
    redirectToDashboard,
    navigate: secureNavigate, // Alias for convenience
  };
};

// Hook specifically for exam navigation patterns
export const useExamNavigation = () => {
  const { secureNavigate } = useSecureNavigation();

  const navigateToExam = (examId: string) => {
    const url = getSessionTakingUrl(examId, 'exam');
    secureNavigate(url);
  };

  const navigateToExamResults = (examId: string) => {
    const url = getResultsUrl(examId, 'exam');
    secureNavigate(url);
  };

  const navigateToExamList = () => {
    secureNavigate("/exam");
  };

  const navigateToPracticeLog = (tab?: "practice" | "exam") => {
    const path = tab ? `/practice-log?tab=${tab}` : "/practice-log";
    secureNavigate(path);
  };

  return {
    navigateToExam,
    navigateToExamResults,
    navigateToExamList,
    navigateToPracticeLog,
  };
};

// Hook specifically for practice navigation patterns
export const usePracticeNavigation = () => {
  const { secureNavigate } = useSecureNavigation();

  const navigateToPracticeSelection = (options?: NavigateOptions) => {
    secureNavigate("/practice", options);
  };

  const navigateToPracticeSession = (sessionId: string, options?: NavigateOptions) => {
    const url = getSessionTakingUrl(sessionId, 'practice');
    secureNavigate(url, options);
  };

  const navigateToPracticeAnalyzing = (sessionId: string, options?: NavigateOptions) => {
    const url = getAnalyzingUrl(sessionId, 'practice');
    secureNavigate(url, options);
  };

  const navigateToPracticeResults = (sessionId: string, options?: NavigateOptions) => {
    const url = getResultsUrl(sessionId, 'practice');
    secureNavigate(url, options);
  };

  return {
    navigateToPracticeSelection,
    navigateToPracticeSession,
    navigateToPracticeAnalyzing,
    navigateToPracticeResults,
  };
};
