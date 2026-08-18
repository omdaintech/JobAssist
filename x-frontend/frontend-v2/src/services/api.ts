import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

// Extend the AxiosRequestConfig to include _retry property
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: "", // Use empty baseURL to allow Vite proxy to handle /api/* routing
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Create a separate client for long-running operations like exam analysis
const longRunningApiClient = axios.create({
  baseURL: "", // Use empty baseURL to allow Vite proxy to handle /api/* routing
  timeout: 300000, // 5 minutes for exam analysis with LLM processing
  headers: {
    "Content-Type": "application/json",
  },
});

// Apply the same interceptors to the long-running client
// Request interceptor removed for production

// Request interceptor for adding auth token
longRunningApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
longRunningApiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {

    const originalRequest = error.config as CustomAxiosRequestConfig;

    // Handle 401 errors (unauthorized)
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      // Clear auth data
      localStorage.removeItem("authToken");
      delete longRunningApiClient.defaults.headers.common["Authorization"];

      // Note: Don't redirect here - let the AuthContext handle it
      // This prevents page refresh during authentication flows

      return Promise.reject(error);
    }

    // Handle 429 errors (rate limiting) - client should retry
    if (error.response?.status === 429) {
      // Rate limited
    }

    return Promise.reject(error);
  }
);

// Request interceptor removed for production
apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Types for API responses
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface UserInfo {
  user_id: string;
  email: string;
  name?: string;
  created_at?: string;
  status?: string;
  school_id?: string;
  school_name?: string;
  auth_provider?: string;
  firebase_uid?: string;
  has_password?: boolean;
  current_level?: string | null;
  target_level?: 'A1' | 'A2' | 'B1' | null;
  is_onboarded?: boolean;
  onboarding_goal?: string | null;
  practice_frequency_per_week?: number | null;
  preferred_language_id?: string | null;
}

export interface UsageInfo {
  allocated_count: number;
  used_count: number;
  remaining_count: number;
  plan_type: string;
  reset_at?: string;
}

export interface BillingCyclePeriod {
  start: string;
  end: string;
}

export interface UsageBucket {
  session_count: number;
  credits_used: number;
}

export interface BillingPackSummary {
  id?: string;
  name?: string;
  credits?: number;
  price_euros?: number;
  per_credit_rate: number;
  currency: string;
}

export interface SchoolUsageData {
  school_id: string;
  period: BillingCyclePeriod;
  total_credits: number;
  total_sessions: number;
  average_credits_per_session: number;
  last_usage_at?: string | null;
  by_session_type: Record<string, UsageBucket>;
  by_activity_type: Record<string, UsageBucket>;
}

export interface SchoolBillingOverviewData {
  school_id: string;
  school_name: string;
  billing_cycle: string;
  current_cycle: BillingCyclePeriod;
  usage_data: SchoolUsageData;
  billing_pack?: BillingPackSummary | null;
  student_pack?: BillingPackSummary | null;
  projected_charges: number;
  last_billed_at?: string | null;
}

export interface SchoolBillingOverviewResponse {
  success: boolean;
  message: string;
  data: SchoolBillingOverviewData;
}

export interface SchoolUsageResponse {
  success: boolean;
  message: string;
  data: SchoolUsageData;
}

export interface BillingComputationData {
  billing_pack?: BillingPackSummary | null;
  student_pack?: BillingPackSummary | null;
  per_credit_rate: number;
  projected_charges: number;
}

export interface BillingCycleDetail {
  billing_cycle: string;
  start: string;
  end: string;
  last_billed_at?: string | null;
}

// User Dashboard Data Types (replacing school-specific types)
export interface UserUsageData {
  user_id: string;
  total_credits: number;
  total_sessions: number;
  average_credits_per_session: number;
  period: BillingCyclePeriod;
  by_session_type: Record<string, UsageBucket>;
  by_activity_type: Record<string, UsageBucket>;
}

export interface UserDashboardOverviewData {
  user_id: string;
  current_cycle: BillingCyclePeriod;
  projected_usage: number;
  usage_data: UserUsageData;
  learning_stats: {
    total_sessions: number;
    current_streak: number;
    average_score: number;
    favorite_activity: string;
    last_session_date: string | null;
    improvement_trend: string;
  };
}

export interface UserDashboardOverviewResponse {
  success: boolean;
  message: string;
  data: UserDashboardOverviewData;
}

export interface UserUsageResponse {
  success: boolean;
  message: string;
  data: UserUsageData;
}

// Dashboard Response Types (matching backend dashboard models)
// Dashboard stats response (simplified - only returns what UI uses)
export interface DashboardStatsResponse {
  activity_performance: ActivityPerformance[];
  generated_at: string;
  cache_duration: number;
  success?: boolean;
}

export interface DashboardSummaryResponse {
  success: boolean;
  total_sessions: number;
  current_streak: number;
  average_score: number;
  favorite_level: string;  // Changed from favorite_activity
  last_session_date?: string | null;
  improvement_trend?: string;
}

// Activity-specific performance data (NEW - for Practice by Skill cards)
export interface ActivityPerformance {
  activity_type: 'reading' | 'writing' | 'grammar' | 'hearing';
  sessions_done: number;
  practice_sessions: number;
  exam_sessions: number;
  avg_score: number;
  best_score: number;
  has_activity: boolean;
}

// Exam readiness data (NEW - for Exam Readiness section)
export interface ActivityBreakdown {
  sessions: number;
  avg_score: number;
}

export interface CurrentLevelData {
  level: string;
  display_name: string;
  total_exams: number;
  avg_score: number;
  last_exam_date: string | null;
}

export interface NextLevelData {
  level: string;
  display_name: string;
  message: string;
  // Optional performance data (only if user has taken exams for this level)
  total_exams?: number;
  avg_score?: number;
  last_exam_date?: string;
}

export interface ExamReadinessData {
  current_level: CurrentLevelData;
  next_level: NextLevelData | null;
}

export interface ExamReadinessResponse {
  success: boolean;
  data: ExamReadinessData;
  message: string;
}

// Language data
export interface Language {
  language_id: string;
  language_name: string;
  native_name: string;
  code: string;
  flag_emoji: string;
  is_active: boolean;
  supported_levels: string[];
  display_order: number;
}

export interface LanguagesResponse {
  success: boolean;
  languages: Language[];
  message: string | null;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  error?: string; // Added for error handling
  access_token?: string;
  user_id?: string;
  email?: string;
  name?: string;
  preferred_language_info?: Record<string, unknown>;
  current_level?: string;
  target_level?: 'A1' | 'A2' | 'B1' | null;
  is_onboarded?: boolean;
  onboarding_goal?: 'exam_prep' | 'level_check' | 'skill_improvement' | null;
  practice_frequency_per_week?: number | null;
  preferred_language_id?: string | null;
  expires_in?: number;
}

export interface SignupRequest {
  email: string;
  password: string;
  confirm_password: string;
  captcha_token: string;
}

export interface SignupResponse {
  success: boolean;
  message: string;
  user_id?: string;
  verification_sent?: boolean;
}

export interface EmailVerificationRequest {
  email_hash: string;
  verification_code: string;
}

export interface EmailVerificationResponse {
  success: boolean;
  message: string;
  user_activated?: boolean;
}

// Payment interfaces
export interface PricingPack {
  id: string;
  pack_name: string;
  credits: number;
  price_euros: number;
  original_price?: number;
  discount_percentage: number;
  description?: string;
  features?: string[];
  is_popular: boolean;
  is_active: boolean;
}

export interface PaymentTransaction {
  id: string;
  gateway_provider: string;
  gateway_order_id: string;
  amount_value: number;
  currency_code: string;
  credits_purchased: number;
  status: 'created' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  completed_at?: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface FirebaseUserData {
  firebase_uid: string;
  email: string | null;
  name: string | null;
  photo_url: string | null;
  email_verified: boolean;
  phone_number: string | null;
  provider_data: Array<{
    provider_id: string;
    uid: string;
    display_name: string | null;
    email: string | null;
    photo_url: string | null;
  }>;
  metadata: {
    creation_time: string | null;
    last_sign_in_time: string | null;
  };
  firebase_token: string;
}

export interface PracticeLevel {
  code: string;
  name: string;
  description: string;
  available: boolean;
}

// Language information from the new master table structure
// Updated Oct 2025 - Now includes all fields from database
export interface LanguageInfo {
  language_id: string;
  language_name: string;
  native_name?: string;
  code?: string;
  flag_emoji?: string;
  supported_levels: string[];  // CRITICAL: Dynamic levels per language (e.g., ["A1", "A2", "B1"])
  display_order?: number;
  is_active?: boolean;
}

export interface QuestionData {
  question_data: {
    // Core question fields
    text?: string;
    question?: string;
    options?: string[];
    criteria?: string[];
    expected_length?: string;
    prompt?: string;
    instruction?: string;

    // Writing-specific fields from API
    topic?: string;
    task_type?: string;
    requirements?: string;
    minimum_words?: number;
    writing_format?: string;

    // Grammar-specific fields
    grammar_topic?: string;
    explanation?: string;
    tip?: string;

    // API metadata fields (can be ignored in display)
    activity_type?: string;
    level?: string;
    difficulty_level?: string;

    // Language structure from master table
    language_id?: string;
    language_name?: string;

    schema_version?: string;
    content_hash?: string;
    date_string?: string;
  };
  session_id?: string;
  activity_type?: string;
  level?: string;
  // Enhanced with language information
  language_info?: LanguageInfo;
}

export interface FeedbackData {
  correct?: boolean;
  score?: number;
  feedback?: string;
  correct_answer?: string;
  correct_answer_reason?: string;
  explanation?: string;
  corrected_version?: string;
  word_count?: number;
  suggestions?: string;
  strengths?: string;
  grammar_notes?: string;
  grammar_learning?: string;
  // Analysis fields from AI examiner
  quality?: string; // Quality assessment: Perfect, Good, Ok, Poor
  topic?: string; // What the question is testing
  student_answer?: string; // Student's actual answer
  error_pattern?: string; // Analysis of mistakes/error patterns
  focus_area?: string; // Added for focus area recommendations
  
  // Grammar-specific feedback fields
  sentence_count?: number;
  correct_sentences?: string;
  corrections?: string;
  grammar_analysis?: string;

  // Speaking-specific feedback fields
  pronunciation_tips?: string; // Added for speaking feedback
  grammar_suggestions?: string; // Added for speaking feedback
  vocabulary_suggestions?: string; // Added for speaking feedback
  audio_feedback?: string; // Audio-specific feedback (pacing, pauses, clarity)
  is_complete?: boolean; // Whether the speaking answer is complete
  needs_transcript?: boolean; // Whether transcript is missing/needed (hearing/speaking)

  // Enhanced with language information
  language_info?: LanguageInfo;
}

export interface ExamTemplate {
  template_id: string;
  template_name: string;
  total_questions: number;
  breakdown: {
    reading: number;
    writing: number;
    grammar: number;
    hearing?: number;  // Optional, added for hearing exams support
    speaking?: number; // Optional, added for speaking exams support
  };
}

export interface ExamDetail {
  exam_id: string;
  exam_name: string;
  level: string;
  template_id: string;
  template: {
    template_id: string;
    template_name: string;
    reading: number;
    writing: number;
    grammar: number;
    hearing: number;
  };
  status: "created" | "in_progress" | "completed" | "analyzed";
  created_at: string;
  started_at?: string; // When exam was started (for in_progress exams)
  duration_minutes?: number; // Duration for completed/analyzed exams
  completed_at?: string;
  analyzed_at?: string; // Added for analysis timestamp
  language_id?: string; // Language ID
  language_name?: string; // Added for language display
  language_code?: string; // Language code for compatibility
  session_type?: string; // Added for session type
  progress: {
    total_questions: number;
    completed_questions: number;
    remaining_questions: number;
    activity_breakdown: {
      [key: string]: number;
    };
  };
  next_question_available?: boolean;
  can_resume?: boolean;
  can_analyze?: boolean;
  exam_summary?: string | object; // AI-generated exam summary after analysis
  last_answered_question?: Record<string, unknown>; // Added for exam resumption
  consecutive_high_scores?: number; // Added for streak calculation
}

export interface ExamTemplatesResponse {
  success: boolean;
  templates: ExamTemplate[];
}

export interface ExamListResponse {
  success: boolean;
  exams: ExamDetail[];
  sessions?: ExamDetail[]; // Added for compatibility with session-based responses
  practice_sessions?: Record<string, unknown>[]; // Added for practice session compatibility
}

export interface ExamCreateRequest {
  language_id: string;
  exam_name?: string;  // Keep for backward compatibility with exams
  session_name?: string;  // New field for unified session system
  level: string;
  template_id: string;
  session_type?: "exam" | "practice"; // New field for unified session system
  activity_type?: "reading" | "writing" | "grammar" | "hearing"; // For practice sessions - updated to include hearing
}

export interface ExamCreateResponse {
  success: boolean;
  exam_id: string;
  session_id?: string; // Added for session compatibility
  exam_detail: ExamDetail;
  message: string;
  total_questions?: number; // Added for question count
}

export interface ExamAnswer {
  question_number: number;
  activity_type: string;
  question_data: {
    // Core question fields
    text?: string;
    question?: string;
    options?: string[];
    criteria?: string[];
    expected_length?: string;
    prompt?: string;
    instruction?: string;
    instructions?: string; // Added for backward compatibility

    // Writing-specific fields
    topic?: string;
    task_type?: string;
    requirements?: string;
    minimum_words?: number;
    writing_format?: string;

    // Grammar-specific fields
    grammar_topic?: string;
    explanation?: string;
    tip?: string;

    // Speaking-specific fields
    context?: string; // Added for speaking questions
    questions?: string[]; // Added for speaking questions

    // Reading-specific fields (for question data)
    correct_answer?: string;
    correct_answer_reason?: string;
    difficulty_level?: string;
    question_type?: string;

    // Additional fields that might be in answers
    example?: string;
    expected_output_format?: string;
  };
  user_answer: string;
  answered_at: string;
  question_id: string;
  feedback_data?: FeedbackData;
  is_correct?: boolean;
  time_taken?: number;
  created_at?: string;
}

export interface ExamAnswersResponse {
  success: boolean;
  exam_id: string;
  exam_name: string;
  level: string;
  answers: ExamAnswer[];
  total_answers: number;
}

export interface ExamAnalysisResponse {
  success: boolean;
  message: string;
  reason?: string; // Added for error messages
  exam_id: string;
  status: string;
  processing_time?: number;
  token_usage?: number;
  activity_summary?: { [activityType: string]: Record<string, unknown> };
  overall_summary?: Record<string, unknown>;
  next_steps?: string[];
}

// User profile management types
export interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  current_level: "A0" | "A1" | "A2" | "B1";
  target_level?: "A1" | "A2" | "B1" | null;
  is_onboarded?: boolean;
  onboarding_goal?: "exam_prep" | "level_check" | "skill_improvement" | null;
  practice_frequency_per_week?: number | null;
  preferred_language_id?: string | null;
  member_since: string;
  last_login?: string;
  total_sessions: number;
  current_streak: number;
}

export interface UserProfileResponse {
  success: boolean;
  user_id: string;
  name: string;
  email: string;
  current_level: "A0" | "A1" | "A2" | "B1";
  target_level?: "A1" | "A2" | "B1" | null;
  is_onboarded?: boolean;
  onboarding_goal?: "exam_prep" | "level_check" | "skill_improvement" | null;
  practice_frequency_per_week?: number | null;
  preferred_language_id?: string | null;
  member_since: string;
  last_login?: string;
  total_sessions: number;
  current_streak: number;
}

export interface UserProfileUpdateRequest {
  name?: string;
  current_level?: "A0" | "A1" | "A2" | "B1";
  target_level?: "A1" | "A2" | "B1";
  is_onboarded?: boolean;
  preferred_language_id?: string;
}

export interface LearningPreferences {
  favorite_activities: string[];
  daily_goal: number;
  preferred_language_id?: string;
  practice_frequency_per_week?: number | null;
  onboarding_goal?: "exam_prep" | "level_check" | "skill_improvement" | null;
}

export interface LearningPreferencesResponse {
  success: boolean;
  preferences: {
    favorite_activities: string[];
    daily_goal: number;
    preferred_language_id?: string;
    practice_frequency_per_week?: number | null;
    onboarding_goal?: "exam_prep" | "level_check" | "skill_improvement" | null;
  };
}

export interface PublishedLanguagesResponse {
  success: boolean;
  languages: LanguageInfo[];
  message: string;
}

export interface LearningPreferencesRequest {
  favorite_activities?: ("reading" | "writing" | "grammar" | "hearing")[];
  daily_goal?: number;
  preferred_language_id?: string;
  practice_frequency_per_week?: number;
  onboarding_goal?: "exam_prep" | "level_check" | "skill_improvement";
}

export interface CompleteOnboardingRequest {
  current_level: "A0" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  target_level?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  onboarding_goal?: "exam_prep" | "level_check" | "skill_improvement";
  practice_frequency_per_week?: number;
  preferred_language_id?: string;
}

export interface CompleteOnboardingResponse {
  success: boolean;
  message: string;
  user_info?: Record<string, unknown>;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface PasswordChangeResponse {
  success: boolean;
  message: string;
  changed_at: string;
}

export interface StandardResponse {
  success: boolean;
  message: string;
      data?: unknown;
}

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {

    const originalRequest = error.config as CustomAxiosRequestConfig;

    // Handle 401 errors (unauthorized)
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      // Clear auth data
      localStorage.removeItem("authToken");
      delete apiClient.defaults.headers.common["Authorization"];

      // Note: Don't redirect here - let the AuthContext handle it
      // This prevents page refresh during authentication flows

      return Promise.reject(error);
    }

    // Handle 429 errors (rate limiting) - client should retry  
    if (error.response?.status === 429) {
      // Rate limited
    }

    return Promise.reject(error);
  }
);

// Practice Session Types for NEW practice system
export interface PracticeSessionRequest {
  language_id: string;
  activity_type: "reading" | "writing" | "grammar" | "hearing";
  level: "A1" | "A2" | "B1";
  session_type?: "practice" | "exam"; // Added for unified session system
  exam_name?: string; // Added for session naming
  template_id?: string; // Added for template compatibility
}

export interface PracticeSessionResponse {
  success: boolean;
  message: string;
  session_id?: string;
  activity_type?: string;
  total_questions?: number;
  language_info?: LanguageInfo;
}

export interface PracticeSession {
  session_id: string;
  exam_id: string;  // Backend returns both session_id and exam_id for compatibility
  exam_name: string;
  session_type: string;
  level: string;
  status: "created" | "in_progress" | "completed" | "analyzed";
  activity_type: string;  // Now required since backend provides it
  language: {
    id: string;
    name: string;
    code: string;
  };
  created_at: string;
  started_at?: string;  // When session was started (for in_progress sessions)
  duration_minutes?: number;  // Duration for completed/analyzed sessions
  template?: {  // Template may not be present for all sessions
    reading: number;
    writing: number;
    grammar: number;
  };
  total_questions: number;
  current_question: number;
  score: number;
  // Legacy fields for backward compatibility
  completed_at?: string;
  language_id?: string;
  language_name?: string;
}

export interface PracticeSessionsResponse {
  success: boolean;
  sessions: PracticeSession[];  // Changed from practice_sessions to sessions to match backend response
  total_sessions: number;
}

export interface PracticeQuestionResponse {
  success: boolean;
  question_data: QuestionData["question_data"] & {
    question_number: number;
    total_questions: number;
  };
  metadata: {
    exam_id: string;
    question_number: number;
    total_questions: number;
    activity_type: string;
  };
  progress?: {
    completed_questions: number;
    total_questions: number;
    remaining_questions: number;
  };
  validation?: {
    min_answer_words: number | null;
    max_answer_words: number | null;
    requires_length_validation: boolean;
  };
  completed?: boolean;
  message?: string;
}

export interface PracticeAnswerRequest {
  question_number: number;
  activity_type: "reading" | "writing" | "grammar" | "hearing";
  question_data: {
    bank_id?: string;
    id?: string;
    [key: string]: unknown;
  };
  user_answer?: string;  // Optional - can be empty for skip
  time_spent?: number;
  is_skip?: boolean;  // Explicit flag for intentional skip
}

export interface PracticeAnswerResponse {
  success: boolean;
  message: string;
  progress: {
    activity_breakdown: {
      reading: number;
      writing: number;
      grammar: number;
    };
    total_answered: number;
  };
}

export interface PracticeLogResponse {
  success: boolean;
  practice_log: Record<string, unknown>[];
  status?: string;
  message?: string;
}

export interface PracticeAnalysisResponse {
  success?: boolean; // Added for consistency
  exam_id: string;
  status: string;
  reason?: string; // Added for error messages
  activity_results: Record<
    string,
    {
      individual_feedback: Record<number, Record<string, unknown>>;
      section_summary: Record<string, unknown>;
    }
  >;
  overall_summary: Record<string, unknown>;
  total_processing_time: number;
  total_token_usage: number;
  errors: string[];
}

// API endpoint methods
export const api = {
  // Auth endpoints
  auth: {
    login: (credentials: { email: string; password: string; captcha_token?: string }) =>
      apiClient.post<AuthResponse>("/api/auth/login", credentials),
    signup: (data: SignupRequest) =>
      apiClient.post<SignupResponse>("/api/auth/signup", data),
    verifyEmail: (data: EmailVerificationRequest) =>
      apiClient.post<EmailVerificationResponse>("/api/auth/verify-email", data),
    resendVerification: (data: ResendVerificationRequest) =>
      apiClient.post<SignupResponse>("/api/auth/resend-verification", data),
    status: () => apiClient.get("/api/auth/status"),
    syncFirebaseUser: (userData: FirebaseUserData) =>
      apiClient.post<AuthResponse>("/api/auth/sync-firebase-user", userData),
    forgotPassword: (email: string, captcha_token?: string) =>
      apiClient.post<{ success: boolean; message: string }>("/api/auth/forgot-password", { email, captcha_token }),
    validateResetToken: (email: string, token: string) =>
      apiClient.get<{ success: boolean; message: string }>(`/api/auth/validate-reset-token?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`),
    resetPassword: (data: { email: string; reset_token: string; new_password: string; confirm_password: string }) =>
      apiClient.post<{ success: boolean; message: string }>("/api/auth/reset-password", data),
  },

  // Practice Session endpoints (using unified session system)
  practice: {
    // Start a new practice session - uses session creation with session_type: "practice"
    startSession: (data: PracticeSessionRequest) => {
      const sessionRequest: ExamCreateRequest = {
        language_id: data.language_id,
        exam_name: `${
          data.activity_type.charAt(0).toUpperCase() +
          data.activity_type.slice(1)
        } Practice`,
        level: data.level,
        template_id: `practice_${data.activity_type}`, // Will be handled by backend
        session_type: "practice",
        activity_type: data.activity_type,
      };
      return apiClient.post<ExamCreateResponse>(
        "/api/sessions",
        sessionRequest
      );
    },

    // List user's practice sessions - using backend filtering for practice type
    getSessions: () => apiClient.get<PracticeSessionsResponse>("/api/sessions?session_type=practice"),

    // Get next question in a session - uses unified session endpoint
    getNextQuestion: (sessionId: string) =>
      apiClient.get<PracticeQuestionResponse>(
        `/api/sessions/${sessionId}/next-question`
      ),

    // Submit answer for a question - uses unified session endpoint
    submitAnswer: (sessionId: string, data: PracticeAnswerRequest) =>
      apiClient.post<PracticeAnswerResponse>(
        `/api/sessions/${sessionId}/submit-answer`,
        data
      ),

    // Analyze completed practice session - uses unified session endpoint
    analyzeSession: (sessionId: string) =>
      longRunningApiClient.post<PracticeAnalysisResponse>(
        `/api/sessions/${sessionId}/analyze`
      ),

    // Get practice log (filtered from session list or user endpoint)
    getLog: (limit = 50) =>
      apiClient.get<PracticeLogResponse>(
        `/api/users/usage-history?limit=${limit}`
      ),
  },

  // Session endpoints (unified exam and practice system)
  sessions: {
    templates: (level: string, school_id?: string) => {
      const params = new URLSearchParams({ level });
      if (school_id) params.append('school_id', school_id);
      return apiClient.get<ExamTemplatesResponse>(`/api/sessions/templates?${params.toString()}`);
    },
    features: () => apiClient.get<{ success: boolean; features: { hearing_exams: { enabled: boolean } } }>("/api/sessions/features"),
    create: (data: ExamCreateRequest) =>
      apiClient.post<ExamCreateResponse>("/api/sessions", data),
    list: () => apiClient.get<ExamListResponse>("/api/sessions"),
    listPractice: () => apiClient.get<ExamListResponse>("/api/sessions?session_type=practice"),
    listExams: () => apiClient.get<ExamListResponse>("/api/sessions?session_type=exam"),
    get: (sessionId: string) => apiClient.get(`/api/sessions/${sessionId}`),
    status: (sessionId: string) =>
      apiClient.get(`/api/sessions/${sessionId}/status`),
    nextQuestion: (sessionId: string) =>
      apiClient.get(`/api/sessions/${sessionId}/next-question`),
    getQuestion: (sessionId: string, questionId: string) =>
      apiClient.get(`/api/sessions/${sessionId}/question/${questionId}`),
    submitAnswer: (sessionId: string, data: Record<string, unknown>) =>
      apiClient.post(`/api/sessions/${sessionId}/submit-answer`, data),
    progress: (sessionId: string) =>
      apiClient.get(`/api/sessions/${sessionId}/progress`),
    answers: (sessionId: string) =>
      apiClient.get(`/api/sessions/${sessionId}/answers`),
    lastAnswer: (sessionId: string) =>
      apiClient.get(`/api/sessions/${sessionId}/last-answer`),
    delete: (sessionId: string) =>
      apiClient.delete(`/api/sessions/${sessionId}`),
    analyze: (sessionId: string) =>
      longRunningApiClient.post<ExamAnalysisResponse>(
        `/api/sessions/${sessionId}/analyze`
      ),
    createShareLink: (sessionId: string) =>
      apiClient.post<{
        success: boolean;
        share_code: string;
        share_url: string;
        message: string;
        expires_at?: string;
      }>(`/api/sessions/${sessionId}/share`),
  },

  // User endpoints
  user: {
    practiceLog: (limit = 50) =>
      apiClient.get(`/api/users/usage-history?limit=${limit}`),
    usage: async () => {
      // Use dashboard summary endpoint for usage info
      const response = await apiClient.get("/api/user/dashboard/summary");
      if (response.data.success) {
        return {
          ...response,
          data: {
            success: true,
            usage_info: {
              allocated_count: 100, // Default values - will be updated when proper usage endpoint is available
              used_count: 0,
              remaining_count: 100,
              percentage: 0
            },
          },
        };
      }
      return response;
    },
    dashboard: () => apiClient.get("/api/user/dashboard/summary"),
    dashboardStats: () => apiClient.get("/api/user/dashboard/stats"),
    dashboardWeekly: () => apiClient.get("/api/user/dashboard/weekly-improvement"),

    statistics: () => apiClient.get("/api/users/usage-statistics"),

    // Profile management
    profile: () => apiClient.get<UserProfileResponse>("/api/auth/status"),
    getStatus: () => apiClient.get("/api/auth/status"), // User status with usage info
    updateProfile: (data: UserProfileUpdateRequest) =>
      apiClient.put<StandardResponse>("/api/users/me/profile", data),

    // Onboarding - single endpoint for completion
    completeOnboarding: (data: CompleteOnboardingRequest) =>
      apiClient.post<CompleteOnboardingResponse>("/api/users/me/complete-onboarding", data),

    // Learning preferences
    preferences: () =>
      apiClient.get<LearningPreferencesResponse>("/api/users/me/preferences"),
    updatePreferences: (data: LearningPreferencesRequest) =>
      apiClient.put<StandardResponse>("/api/users/me/preferences", data),

    // Password change
    changePassword: (data: PasswordChangeRequest) =>
      apiClient.put<PasswordChangeResponse>("/api/users/me/password", data),

    // Usage history with filtering support
    usageHistory: (params?: {
      limit?: number;
      skip?: number;
      sessionType?: string;
      startDate?: string;
      endDate?: string;
    }) => {
      const queryParams = new URLSearchParams();

      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.skip) queryParams.append("skip", params.skip.toString());
      if (params?.sessionType)
        queryParams.append("session_type", params.sessionType);
      if (params?.startDate) queryParams.append("start_date", params.startDate);
      if (params?.endDate) queryParams.append("end_date", params.endDate);

      const queryString = queryParams.toString();
      const url = `/api/users/usage-history${
        queryString ? `?${queryString}` : ""
      }`;

      return apiClient.get(url);
    },

  },

  // User Dashboard APIs (actual backend endpoints)
  dashboard: {
    overview: (days: number = 30, languageId?: string) => 
      apiClient.get<DashboardStatsResponse>(
        `/api/user/dashboard/stats?days=${days}${languageId ? `&language_id=${languageId}` : ''}`
      ),
    summary: (days: number = 30, languageId?: string) => {
      const params = new URLSearchParams();
      params.append('days', days.toString());
      if (languageId) params.append('language_id', languageId);
      return apiClient.get<DashboardSummaryResponse>(`/api/user/dashboard/summary?${params.toString()}`);
    },
    examReadiness: (languageId?: string) => 
      apiClient.get<ExamReadinessResponse>(`/api/user/dashboard/exam-readiness${languageId ? `?language_id=${languageId}` : ''}`),
    usage: (_startDate: string, _endDate: string) => {
      // Dashboard stats API doesn't support date filtering like school billing
      // For now, we get all stats and let the frontend filter as needed
      return apiClient.get<DashboardStatsResponse>(`/api/user/dashboard/stats?use_cache=false`);
    },
    weeklyImprovement: () => apiClient.get<any>(`/api/user/dashboard/weekly-improvement`),
    report: () => {
      // Combined dashboard report with all user analytics
      return apiClient.get<DashboardStatsResponse>(`/api/user/dashboard/stats`);
    },
    invalidateCache: () => apiClient.post(`/api/user/dashboard/cache/invalidate`, {}),
  },

  // Languages endpoints
  languages: {
    getAvailable: () =>
      apiClient.get<PublishedLanguagesResponse>("/api/languages"),
    getAll: () => 
      apiClient.get<LanguagesResponse>("/api/languages"),
  },

  // Public endpoints (no auth required)
  public: {
    getSharedSession: (shareCode: string) =>
      apiClient.get<{
        success: boolean;
        session: {
          session_id: string;
          session_name: string;
          session_type: 'practice' | 'exam';
          level: string;
          status: 'completed' | 'analyzed';
          language_id?: string;
          language_name?: string;
          language_code?: string;
          template?: any;
          exam_summary?: any;
          created_at: string;
          completed_at?: string;
          analyzed_at?: string;
          overall_score?: number;
        };
      }>(`/api/public/sessions/shared/${shareCode}`),
    getSharedAnswers: (shareCode: string) =>
      apiClient.get<{
        success: boolean;
        answers: any[];
        section_summaries: any;
      }>(`/api/public/sessions/shared/${shareCode}/answers`),
  },

  // Payment endpoints
  payments: {
    // Get active pricing packs (from database)
    getPricingPacks: () =>
      apiClient.get<{
        success: boolean;
        pricing_packs: PricingPack[];
        promotion?: {
          active: boolean;
          title: string;
          message: string;
          badge_text: string;
        };
      }>("/api/user/payments/pricing-packs"),

    // NEW: Step 1 - Create order (unified flow)
    createOrder: (pricingPackId: string) =>
      apiClient.post<{
        success: boolean;
        transaction_id: string;
        order_id: string;
        pricing_pack: {
          id: string;
          name: string;
          credits: number;
          price_euros: number;
        };
        message?: string;
      }>("/api/user/payments/create-order", {
        pricing_pack_id: pricingPackId,
      }),

    // NEW: Step 2a - PayPal checkout (unified flow)
    checkoutWithPayPal: (transactionId: string) =>
      apiClient.post<{
        success: boolean;
        order_id: string;
        approval_url: string;
        message?: string;
      }>("/api/user/payments/paypal/checkout", {
        transaction_id: transactionId,
      }),

    // NEW: Step 2b - UPI submit (unified flow)
    submitUPIPayment: (transactionId: string, upiTransactionId: string) =>
      apiClient.post<{
        success: boolean;
        transaction_id: string;
        order_id: string;
        upi_transaction_id: string;
        whatsapp_number: string;
        whatsapp_message: string;
        message?: string;
      }>("/api/user/payments/upi/submit", {
        transaction_id: transactionId,
        upi_transaction_id: upiTransactionId,
      }),

    // OLD: Create PayPal order (kept for backward compatibility)
    createPayPalOrder: (pricingPackId: string) =>
      apiClient.post<{
        success: boolean;
        order_id: string;
        approval_url: string;
        message?: string;
      }>("/api/user/payments/paypal/create-order", {
        pricing_pack_id: pricingPackId,
      }),

    // Get payment history
    getHistory: (limit = 20, offset = 0) =>
      apiClient.get<{
        success: boolean;
        transactions: PaymentTransaction[];
        total: number;
        message?: string;
      }>(`/api/user/payments/history?limit=${limit}&offset=${offset}`),
  },

  // Feedback endpoints
  feedback: {
    // Submit user feedback
    submit: (data: {
      category: string;
      severity?: string;
      subject: string;
      message: string;
      captcha_token: string;
    }) =>
      apiClient.post<{
        success: boolean;
        message: string;
        data?: { message_id: string };
      }>("/api/users/feedback", data),

    // Get user's feedback history
    getHistory: () =>
      apiClient.get<{
        success: boolean;
        messages: Array<{
          id: string;
          category: string;
          severity: string;
          subject: string;
          message: string;
          is_read: boolean;
          admin_notes: string | null;
          created_at: string;
        }>;
      }>("/api/users/feedback/history"),
  },
};

export { apiClient };
export const authAPI = api.auth;
export default api;
