import {
  StandardizedAdminResponse,
  standardizeAdminResponse,
} from "../utils/admin-frontend-utils";

interface AdminStats {
  totalSchools: number;
  activeSchools: number;
  schoolTypes: Record<string, number>;
}

interface QuestionStats {
  total_questions: number;
  by_activity_type: Record<string, number>;
  by_level: Record<string, number>;
  by_date: Record<string, number>;
  recent_activity: Array<Record<string, any>>;
}

export interface QuestionDashboardLevelSummary {
  level: string;
  totals: {
    total: number;
    ready: number;
    pending_review: number;
  };
  by_activity_type?: Record<string, {
    total: number;
    ready: number;
    pending_review: number;
  }>;
}

export interface QuestionDashboardLanguageSummary {
  language_id: string;
  language_name: string;
  native_name?: string | null;
  totals: {
    total: number;
    ready: number;
    pending_review: number;
  };
  levels: QuestionDashboardLevelSummary[];
}

export interface QuestionDashboardSummary {
  available_languages: QuestionDashboardLanguageOption[];
  language_summary: QuestionDashboardLanguageSummary | null;
  selected_language_id?: string | null;
  generated_at?: string;
}

export interface QuestionDashboardLanguageOption {
  id: string;
  name: string;
  native_name?: string | null;
}

// ===== NEW: Admin Dashboard Analytics Interfaces =====

export interface TopActivityData {
  activity_type: string;
  count: number;
  display_name: string;
}

export interface DashboardStatsData {
  // Core metrics
  total_sessions: number;
  analyzed_sessions: number;
  total_exams: number;
  total_practice: number;
  new_users: number;
  new_feedback: number;
  new_contact: number;
  
  // Top activity
  top_activity: TopActivityData;
  
  // Calculated metrics
  analysis_success_rate: number;
  exam_percentage: number;
  practice_percentage: number;
  
  // Metadata
  start_date: string;
  end_date: string;
  time_period_label?: string;
  time_period_hours?: number;
  language_filter?: string | null;
  generated_at: string;
}

export interface AdminDashboardStatsResponse {
  success: boolean;
  data: DashboardStatsData;
  message: string;
}

export interface LanguageOption {
  id: string;
  name: string;
  code: string;
}

export interface LanguageFilterOptionsResponse {
  success: boolean;
  languages: LanguageOption[];
  message: string;
}

// ===== END: Admin Dashboard Analytics Interfaces =====

interface DashboardStats {
  totalSchools: number;
  activeSchools: number;
  totalQuestions: number;
  systemStatus: "online" | "offline";
  schoolTypes: Record<string, number>;
}

export interface AddressPayload {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
}

export interface PaymentMethodPayload {
  preferred_method?: string;
  payment_terms?: string;
  currency?: string;
  notes?: string;
}

export type BillingCycleOption = "monthly" | "quarterly" | "annual";

export interface AdminSchool {
  id: string;
  name: string;
  display_name?: string | null;
  description?: string | null;
  school_type: "b2b" | "b2c" | "enterprise";
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  admin_email?: string | null;
  admin_phone?: string | null;
  billing_email?: string | null;
  billing_contact_name?: string | null;
  billing_phone?: string | null;
  payment_method_info?: PaymentMethodPayload | null;
  physical_address?: Record<string, any> | null;
  billing_address?: Record<string, any> | null;
  tax_address?: Record<string, any> | null;
  tax_id?: string | null;
  vat_number?: string | null;
  tax_exemption_status?: boolean;
  billing_pack_id?: string | null;
  student_pack_id?: string | null;
  billing_cycle?: BillingCycleOption | null;
  cycle_start?: string | null;
  cycle_end?: string | null;
  last_billed_at?: string | null;
  priority_support?: boolean;
  account_manager_notes?: string | null;
  internal_tags?: string[] | null;
  settings?: Record<string, any> | null;
  user_count?: number;
  active_user_count?: number;
}

export interface AdminSchoolListResult {
  schools: AdminSchool[];
  total_count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface AdminSchoolUser {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  email_verified?: boolean;
  created_at?: string;
  last_login?: string;
  current_level?: string;
  preferred_language_id?: string;
  school_id: string;
  access?: {
    allocated_count: number;
    used_count: number;
    plan_type: string;
    status: string;
    reserved_credits: number;
    reset_at?: string;
  };
}

export interface SchoolUserListResult {
  users: AdminSchoolUser[];
  total_count: number;
  pagination: {
    page: number;
    per_page: number;
    has_more: boolean;
    total_pages: number;
  };
}

export interface SchoolUserFilters {
  search?: string;
  is_active?: boolean;
  email_verified?: boolean;
  current_level?: string;
  created_after?: string;
  created_before?: string;
  last_login_after?: string;
  last_login_before?: string;
}

// ===============================
// PAYMENT MANAGEMENT INTERFACES
// ===============================

export interface PaymentTransaction {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  gateway_provider: string;
  gateway_order_id: string;
  gateway_capture_id: string | null;
  amount_value: number;
  currency_code: string;
  credits_purchased: number;
  pricing_pack_id: string | null;
  pricing_pack_name: string | null;
  status: 'created' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  completed_at: string | null;
  webhook_received_at: string | null;
}

export interface PaymentTransactionDetail {
  id: string;
  user: {
    id: string;
    email: string;
    name: string;
    current_credits: number;
    used_credits: number;
    remaining_credits: number;
  };
  payment: {
    gateway_provider: string;
    gateway_order_id: string;
    gateway_capture_id: string | null;
    gateway_payer_email: string | null;
    gateway_payer_id: string | null;
    amount_value: number;
    currency_code: string;
    credits_purchased: number;
    pricing_pack: {
      id: string;
      name: string;
      price: number;
    } | null;
  };
  status: string;
  timestamps: {
    created_at: string;
    completed_at: string | null;
    webhook_received_at: string | null;
  };
  webhook_payload: any | null;
  topup_record: any | null;
}

export interface PaymentOrdersListResult {
  success: boolean;
  transactions: PaymentTransaction[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    total_pages: number;
  };
  filters_applied: {
    status: string | null;
    user_email: string | null;
    gateway: string | null;
    start_date: string | null;
    end_date: string | null;
    search: string | null;
  };
}

export interface PaymentOrderDetailsResult {
  success: boolean;
  transaction: PaymentTransactionDetail;
}

export interface ManualCaptureRequest {
  send_email: boolean;
  notes?: string;
}

export interface ManualCaptureResult {
  success: boolean;
  message: string;
  data: {
    transaction_id: string;
    credits_added: number;
    user_total_credits: number;
    email_sent: boolean;
    admin_action_logged: boolean;
  };
}

export interface ManualTopupRequest {
  credits: number;
  reason: string;
  send_email: boolean;
  pricing_pack_id?: string;
}

export interface ManualTopupResult {
  success: boolean;
  message: string;
  data: {
    user_id: string;
    credits_added: number;
    new_total_credits: number;
    remaining_credits: number;
    topup_id: string;
    email_sent: boolean;
    admin_action_logged: boolean;
  };
}

export interface ResendEmailRequest {
  email_type: string;
  admin_reason?: string;
}

export interface ResendEmailResult {
  success: boolean;
  message: string;
  data: {
    email_sent: boolean;
    recipient: string;
    admin_action_logged: boolean;
  };
}

export interface PaymentOrderFilters {
  status?: string;
  user_email?: string;
  gateway?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface AdminSchoolDetailsResult {
  school: AdminSchool;
}

export interface AdminSchoolImpersonationData {
  access_token: string;
  token_type: string;
  expires_in: number;
  school_id: string;
  school_name: string;
  impersonated_by: string;
}

export interface AdminSchoolUpdatePayload {
  name?: string;
  display_name?: string;
  description?: string;
  school_type?: "b2b" | "b2c" | "enterprise";
  contact_email?: string;
  contact_phone?: string;
  admin_email?: string;
  admin_phone?: string;
  billing_email?: string;
  billing_contact_name?: string;
  billing_phone?: string;
  billing_pack_id?: string;
  student_pack_id?: string;
  billing_cycle?: BillingCycleOption;
  cycle_start?: string;
  cycle_end?: string;
  payment_method_info?: PaymentMethodPayload;
  physical_address?: AddressPayload;
  billing_address?: AddressPayload;
  tax_address?: AddressPayload;
  tax_id?: string;
  vat_number?: string;
  tax_exemption_status?: boolean;
  priority_support?: boolean;
  account_manager_notes?: string;
  internal_tags?: string[];
  is_active?: boolean;
  settings?: Record<string, any>;
}

export interface AdminSchoolCreatePayload extends AdminSchoolUpdatePayload {
  name: string;
}

// Add comprehensive user details interface
interface ComprehensiveUserDetails {
  success: boolean;
  user_id: string;
  email: string;
  name: string | null;
  current_level: string;
  created_at: string | null;
  last_login: string | null;
  is_active: boolean;

  // Usage information
  usage_info: {
    allocated_count: number;
    used_count: number;
    remaining_count: number;
    plan_type: string;
    access_expires: string | null;
    last_used: string | null;
  };

  // Statistics
  practice_count: number;
  exam_count: number;
  last_practice_date: string | null;
  last_exam_date: string | null;

  // User preferences
  preferences: {
    preferred_level: string;
    favorite_activities: string[];
    daily_goal: number;
    session_duration: number;
    difficulty_preference: string;
    preferred_language_id: string | null;
  } | null;

  // Security information
  security_info: Record<string, any> | null;
}

/**
 * Enhanced Admin API Service with unified error handling and type safety
 */
class AdminApiService {
  private getHeaders(token: string | null) {
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Enhanced API request wrapper with standardized error handling
   */
  private async makeRequest<T>(
    url: string,
    options: RequestInit,
    context?: string
  ): Promise<StandardizedAdminResponse<T>> {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          response: {
            status: response.status,
            data: errorData,
          },
          message:
            errorData.message ||
            errorData.detail ||
            `Request failed with status ${response.status}`,
        };
      }

      const data = await response.json();
      return standardizeAdminResponse<T>(data);
    } catch (error) {
      // Re-throw with context for AdminErrorHandler
      if (context) {
        (error as any).context = context;
      }
      throw error;
    }
  }

  async getAdminStats(
    token: string
  ): Promise<StandardizedAdminResponse<AdminStats>> {
    return this.makeRequest<AdminStats>(
      "/api/admin/stats",
      { headers: this.getHeaders(token) },
      "Admin Stats"
    );
  }

  async getQuestionStats(
    token: string
  ): Promise<StandardizedAdminResponse<QuestionStats>> {
    return this.makeRequest<QuestionStats>(
      "/api/admin/questions/stats",
      { headers: this.getHeaders(token) },
      "Question Stats"
    );
  }

  async getQuestionDashboardSummary(
    token: string,
    languageId?: string
  ): Promise<StandardizedAdminResponse<QuestionDashboardSummary>> {
    const params = new URLSearchParams();
    if (languageId) {
      params.set("language_id", languageId);
    }

    const url = params.toString()
      ? `/api/admin/questions/dashboard?${params.toString()}`
      : "/api/admin/questions/dashboard";

    return this.makeRequest<QuestionDashboardSummary>(
      url,
      { headers: this.getHeaders(token) },
      "Question Dashboard"
    );
  }

  async getDashboardStats(token: string): Promise<DashboardStats> {
    try {
      // Fetch both admin and question stats in parallel
      const [adminStatsResponse, questionStatsResponse] = await Promise.all([
        this.getAdminStats(token),
        this.getQuestionStats(token),
      ]);

      console.debug("Dashboard Stats Raw Responses:", {
        adminStatsResponse,
        questionStatsResponse,
      });

      const adminStats = adminStatsResponse.success
        ? adminStatsResponse.data
        : null;
      const questionStats = questionStatsResponse.success
        ? questionStatsResponse.data
        : null;

      // Handle actual backend response structures - schools instead of users
      const stats = {
        totalSchools: adminStats?.totalSchools || 0,
        activeSchools: adminStats?.activeSchools || 0,
        totalQuestions: questionStats?.total_questions || 0, // ✅ Confirmed field name from tests
        systemStatus:
          adminStats && questionStats
            ? ("online" as const)
            : ("offline" as const),
        schoolTypes: adminStats?.schoolTypes || {},
      };

      console.debug("Dashboard Stats Processed:", stats);
      return stats;
    } catch (error) {
      console.error("Dashboard stats error:", error);
      // Return offline status if API calls fail
      return {
        totalSchools: 0,
        activeSchools: 0,
        totalQuestions: 0,
        systemStatus: "offline" as const,
        schoolTypes: {},
      };
    }
  }



  // Get comprehensive user details using the proper admin endpoint
  async getComprehensiveUserDetails(
    token: string,
    userId: string
  ): Promise<StandardizedAdminResponse<ComprehensiveUserDetails>> {
    const response = await this.makeRequest<any>(
      `/api/admin/users/${userId}/details`,
      { headers: this.getHeaders(token) },
      "Comprehensive User Details"
    );

    console.debug("User Details Raw Response:", response);

    // ✅ FIXED: Based on test analysis, backend returns response.data (not response.data.data)
    // Backend structure: { success: true, message: "...", data: { user_id: "...", email: "...", ... } }
    if (response.success && response.data) {
      const userDetails = {
        ...response,
        data: response.data, // Use response.data directly, not response.data.data
      };
      console.debug("User Details Processed:", userDetails);
      return userDetails;
    }

    return response as StandardizedAdminResponse<ComprehensiveUserDetails>;
  }

  // Get minimal user details (name, email only) for performance optimization
  async getMiniUserDetails(
    token: string,
    userId: string
  ): Promise<
    StandardizedAdminResponse<{
      user_id: string;
      name: string;
      email: string;
      current_level: string;
      is_active: boolean;
      auth_provider: string;
    }>
  > {
    const response = await this.makeRequest<any>(
      `/api/admin/users/${userId}/details?mini=true`,
      { headers: this.getHeaders(token) },
      "Mini User Details"
    );

    if (response.success && response.data) {
      return {
        ...response,
        data: response.data,
      };
    }

    return response;
  }

  async applyPricingPackage(
    token: string,
    userId: string,
    data: {
      package_name: string;
      reference_id: string;
      reason?: string;
    }
  ): Promise<StandardizedAdminResponse<any>> {
    return this.makeRequest<any>(
      `/api/admin/users/${userId}/apply-pricing-package`,
      {
        method: "PUT",
        headers: this.getHeaders(token),
        body: JSON.stringify(data),
      },
      "Apply Pricing Package"
    );
  }

  async getPricingPacks(token: string): Promise<StandardizedAdminResponse<any>> {
    return this.makeRequest<any>(
      `/api/admin/pricing-packs`,
      {
        method: "GET",
        headers: this.getHeaders(token),
      },
      "Get Pricing Packs"
    );
  }

  // ===== NEW: Admin Dashboard Analytics Methods =====

  /**
   * Get admin dashboard statistics with flexible filtering options
   * @param token - Admin JWT token
   * @param hours - Preset time filter in hours (24, 48, 168, 720)
   * @param startDate - Custom start date (ISO format: YYYY-MM-DD)
   * @param endDate - Custom end date (ISO format: YYYY-MM-DD)
   * @param languageId - Optional language filter (UUID)
   * @returns Dashboard statistics with 8 core metrics + calculated fields
   */
  async getAnalyticsDashboardStats(
    token: string,
    hours?: number,
    startDate?: string,
    endDate?: string,
    languageId?: string
  ): Promise<StandardizedAdminResponse<DashboardStatsData>> {
    const params = new URLSearchParams();
    
    if (hours !== undefined) {
      params.set("hours", hours.toString());
    }
    if (startDate) {
      params.set("start_date", startDate);
    }
    if (endDate) {
      params.set("end_date", endDate);
    }
    if (languageId) {
      params.set("language_id", languageId);
    }

    const url = params.toString()
      ? `/api/admin/dashboard/stats?${params.toString()}`
      : "/api/admin/dashboard/stats";

    return this.makeRequest<DashboardStatsData>(
      url,
      { headers: this.getHeaders(token) },
      "Analytics Dashboard Stats"
    );
  }

  /**
   * Get available language options for dashboard filtering
   * @param token - Admin JWT token
   * @returns List of languages with id, name, and code
   */
  async getDashboardLanguageOptions(
    token: string
  ): Promise<StandardizedAdminResponse<LanguageOption[]>> {
    const response = await this.makeRequest<{ languages: LanguageOption[] }>(
      "/api/admin/dashboard/languages",
      { headers: this.getHeaders(token) },
      "Dashboard Language Options"
    );

    // Transform response to return languages array directly
    if (response.success && response.data) {
      return {
        ...response,
        data: response.data.languages || [],
      } as StandardizedAdminResponse<LanguageOption[]>;
    }

    return {
      ...response,
      data: [],
    } as StandardizedAdminResponse<LanguageOption[]>;
  }

  // ===== END: Admin Dashboard Analytics Methods =====

  async createUser(
    token: string,
    data: {
      email: string;
      password: string;
      name?: string;
      level?: string;
      language_id?: string;
      school_id?: string;
      // plan_type and allocated_count are hardcoded in backend
    }
  ): Promise<StandardizedAdminResponse<any>> {
    return this.makeRequest<any>(
      "/api/admin/users",
      {
        method: "POST",
        headers: this.getHeaders(token),
        body: JSON.stringify(data),
      },
      "Create User"
    );
  }

  // Update user status (active/inactive)
  async updateUserStatus(
    token: string,
    userId: string,
    data: {
      is_active: boolean;
      reason?: string;
    }
  ): Promise<StandardizedAdminResponse<any>> {
    return this.makeRequest<any>(
      `/api/admin/users/${userId}/status`,
      {
        method: "PUT",
        headers: this.getHeaders(token),
        body: JSON.stringify(data),
      },
      "Update User Status"
    );
  }

  // Edit user information
  async editUserInformation(
    token: string,
    userId: string,
    data: {
      name?: string;
      email?: string;
      current_level?: string;
    }
  ): Promise<StandardizedAdminResponse<any>> {
    return this.makeRequest<any>(
      `/api/admin/users/${userId}/edit`,
      {
        method: "PUT",
        headers: this.getHeaders(token),
        body: JSON.stringify(data),
      },
      "Edit User Information"
    );
  }

  // Update user preferences
  async updateUserPreferences(
    token: string,
    userId: string,
    data: {
      preferred_level?: string;
      preferred_language_id?: string;
      daily_goal?: number;
      session_duration?: number;
      difficulty_preference?: string;
      favorite_activities?: string[];
    }
  ): Promise<StandardizedAdminResponse<any>> {
    return this.makeRequest<any>(
      `/api/admin/users/${userId}/preferences`,
      {
        method: "PUT",
        headers: this.getHeaders(token),
        body: JSON.stringify(data),
      },
      "Update User Preferences"
    );
  }

  // QUESTION MANAGEMENT METHODS
  async searchQuestions(
    token: string,
    filters: any,
    pagination?: { page?: number; per_page?: number }
  ): Promise<StandardizedAdminResponse<any>> {
    const queryParams = new URLSearchParams();

    // STRICT: language_id is required for admin operations
    if (!filters.language_id) {
      throw new Error("language_id is required for admin question operations");
    }
    queryParams.append("language_id", filters.language_id);
    if (filters.activityType)
      queryParams.append("activity_type", filters.activityType);
    if (filters.level) queryParams.append("level", filters.level);
    if (filters.difficulty_level)
      queryParams.append("difficulty_level", filters.difficulty_level);
    if (filters.reviewed !== undefined)
      queryParams.append("reviewed", filters.reviewed.toString());
    if (filters.date_from) queryParams.append("date_from", filters.date_from);
    if (filters.date_to) queryParams.append("date_to", filters.date_to);
    if (filters.has_audio !== undefined)
      queryParams.append("has_audio", filters.has_audio.toString());
    
    // Add pagination parameters
    if (pagination?.page) queryParams.append("page", pagination.page.toString());
    if (pagination?.per_page) queryParams.append("per_page", pagination.per_page.toString());

    return this.makeRequest<any>(
      `/api/admin/questions?${queryParams.toString()}`,
      { headers: this.getHeaders(token) },
      "Search Questions"
    );
  }

  async modifyQuestion(
    token: string,
    questionId: string,
    data: {
      instruction?: string;
      grammar_topic?: string;
      explanation?: string;
      tip?: string;
    }
  ): Promise<StandardizedAdminResponse<any>> {
    return this.makeRequest<any>(
      `/api/admin/questions/${questionId}`,
      {
        method: "PUT",
        headers: this.getHeaders(token),
        body: JSON.stringify(data),
      },
      "Modify Question"
    );
  }

  async deleteQuestion(
    token: string,
    questionId: string
  ): Promise<StandardizedAdminResponse<any>> {
    return this.makeRequest<any>(
      `/api/admin/questions/${questionId}`,
      {
        method: "DELETE",
        headers: this.getHeaders(token),
      },
      "Delete Question"
    );
  }

  async bulkDeleteQuestions(
    token: string,
    questionIds: string[]
  ): Promise<StandardizedAdminResponse<any>> {
    return this.makeRequest<any>(
      "/api/admin/questions/bulk-delete",
      {
        method: "POST",
        headers: this.getHeaders(token),
        body: JSON.stringify({ question_ids: questionIds }),
      },
      "Bulk Delete Questions"
    );
  }

  async markQuestionReviewed(
    token: string,
    questionId: string,
    reviewedBy: string
  ): Promise<StandardizedAdminResponse<any>> {
    return this.makeRequest<any>(
      `/api/admin/questions/${questionId}/review`,
      {
        method: "PUT",
        headers: this.getHeaders(token),
        body: JSON.stringify({ reviewed_by: reviewedBy }),
      },
      "Mark Question Reviewed"
    );
  }

  async generateQuestions(
    token: string,
    data: {
      language_id: string;
      activity_type: string;
      level: string;
      difficulty_level?: string;
      count: number;
    }
  ): Promise<StandardizedAdminResponse<any>> {
    return this.makeRequest<any>(
      "/api/admin/questions/bulk-generate",
      {
        method: "POST",
        headers: this.getHeaders(token),
        body: JSON.stringify(data),
      },
      "Generate Questions"
    );
  }

  async getTemplatePreview(
    token: string,
    language_id: string,
    activity_type: string,
    level: string,
    difficulty_level: string = "difficult",
    count: number = 5
  ): Promise<StandardizedAdminResponse<any>> {
    const params = new URLSearchParams({
      language_id,
      activity_type,
      level,
      difficulty_level,
      count: count.toString(),
    });

    return this.makeRequest<any>(
      `/api/admin/questions/template-preview?${params.toString()}`,
      { headers: this.getHeaders(token) },
      "Get Template Preview with Parameter Substitution"
    );
  }

  // Prompt Management APIs
  async listPrompts(
    token: string,
    languageId: string
  ): Promise<StandardizedAdminResponse<any>> {
    return this.makeRequest<any>(
      `/api/admin/prompts/list?language_id=${languageId}`,
      { headers: this.getHeaders(token) },
      "List Prompts"
    );
  }

  async getRawPromptContent(
    token: string,
    languageId: string,
    level: string,
    activity: string,
    promptType: string
  ): Promise<StandardizedAdminResponse<any>> {
    const params = new URLSearchParams({
      language_id: languageId,
      level,
      activity,
      prompt_type: promptType,
    });

    return this.makeRequest<any>(
      `/api/admin/prompts/content?${params.toString()}`,
      { headers: this.getHeaders(token) },
      "Get Raw Prompt Content"
    );
  }

  // Bulk upload questions from JSON
  async uploadQuestions(
    token: string,
    jsonData: any
  ): Promise<StandardizedAdminResponse<any>> {
    return this.makeRequest<any>(
      "/api/admin/questions/bulk-upload",
      {
        method: "POST",
        headers: this.getHeaders(token),
        body: JSON.stringify(jsonData),
      },
      "Bulk Upload Questions"
    );
  }

  // Generate audio for hearing question
  async generateAudio(
    token: string,
    questionId: string
  ): Promise<StandardizedAdminResponse<any>> {
    return this.makeRequest<any>(
      `/api/admin/questions/${questionId}/generate-audio`,
      {
        method: "POST",
        headers: this.getHeaders(token),
      },
      "Generate Audio"
    );
  }

  // Delete audio for hearing question
  async deleteAudio(
    token: string,
    questionId: string
  ): Promise<StandardizedAdminResponse<any>> {
    return this.makeRequest<any>(
      `/api/admin/questions/${questionId}/audio`,
      {
        method: "DELETE",
        headers: this.getHeaders(token),
      },
      "Delete Audio"
    );
  }

  /**
   * Get user session history with filtering
   */
  async getUserSessionHistory(
    token: string,
    userId: string,
    filters?: {
      session_type?: "exam" | "practice";
      status_filter?: "completed" | "analyzed" | "in_progress";
      activity_type?: "reading" | "writing" | "grammar" | "hearing" | "speaking";
      level?: "A1" | "A2" | "B1";
      limit?: number;
      skip?: number;
    }
  ): Promise<StandardizedAdminResponse<any>> {
    const params = new URLSearchParams();
    if (filters?.session_type)
      params.append("session_type", filters.session_type);
    if (filters?.status_filter)
      params.append("status_filter", filters.status_filter);
    if (filters?.activity_type)
      params.append("activity_type", filters.activity_type);
    if (filters?.level) params.append("level", filters.level);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.skip) params.append("skip", filters.skip.toString());

    const queryString = params.toString();
    const url = `/api/admin/users/${userId}/sessions${
      queryString ? `?${queryString}` : ""
    }`;

    return this.makeRequest<any>(
      url,
      {
        method: "GET",
        headers: this.getHeaders(token),
      },
      "Get User Session History"
    );
  }

  /**
   * Get detailed information for a specific session
   */
  async getSessionDetail(
    token: string,
    userId: string,
    sessionId: string
  ): Promise<StandardizedAdminResponse<any>> {
    return this.makeRequest<any>(
      `/api/admin/users/${userId}/sessions/${sessionId}`,
      {
        method: "GET",
        headers: this.getHeaders(token),
      },
      "Get Session Detail"
    );
  }

  /**
   * Get user consumption/charge history with filtering
   */
  async getUserConsumptionHistory(
    token: string,
    userId: string,
    filters?: {
      charge_type?:
        | "session_completion"
        | "admin_adjustment"
        | "reset"
        | "refund";
      limit?: number;
      skip?: number;
    }
  ): Promise<StandardizedAdminResponse<any>> {
    const params = new URLSearchParams();
    if (filters?.charge_type) params.append("charge_type", filters.charge_type);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.skip) params.append("skip", filters.skip.toString());

    const queryString = params.toString();
    const url = `/api/admin/users/${userId}/consumption${
      queryString ? `?${queryString}` : ""
    }`;

    return this.makeRequest<any>(
      url,
      {
        method: "GET",
        headers: this.getHeaders(token),
      },
      "Get User Consumption History"
    );
  }

  /**
   * Change admin password
   */
  async changeAdminPassword(
    token: string,
    data: {
      current_password: string;
      new_password: string;
      confirm_password: string;
    }
  ): Promise<StandardizedAdminResponse<any>> {
    return this.makeRequest<any>(
      "/api/admin/auth/change-password",
      {
        method: "PUT",
        headers: this.getHeaders(token),
        body: JSON.stringify(data),
      },
      "Change Admin Password"
    );
  }

  /**
   * Get pricing and credit policy data
   */
  async getPricingPolicy(
    token: string
  ): Promise<StandardizedAdminResponse<any>> {
    return this.makeRequest<any>(
      "/api/admin/pricing-policy",
      {
        method: "GET",
        headers: this.getHeaders(token),
      },
      "Get Pricing Policy Data"
    );
  }

  // ===============================
  // SCHOOL MANAGEMENT METHODS
  // ===============================

  /**
   * Get list of schools with pagination and search
   */
  async getSchools(
    token: string,
    page: number = 1,
    per_page: number = 10,
    search?: string
  ): Promise<StandardizedAdminResponse<AdminSchoolListResult>> {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: per_page.toString(),
    });
    
    if (search) {
      params.append('search', search);
    }

    return this.makeRequest<AdminSchoolListResult>(
      `/api/admin/schools/?${params.toString()}`,
      {
        method: "GET",
        headers: this.getHeaders(token),
      },
      "Get Schools List"
    );
  }

  /**
   * Get school details by ID
   */
  async getSchoolDetails(
    token: string,
    schoolId: string
  ): Promise<StandardizedAdminResponse<AdminSchoolDetailsResult>> {
    return this.makeRequest<AdminSchoolDetailsResult>(
      `/api/admin/schools/${schoolId}`,
      {
        method: "GET",
        headers: this.getHeaders(token),
      },
      "Get School Details"
    );
  }

  /**
   * Create a new school
   */
  async createSchool(
    token: string,
    schoolData: AdminSchoolCreatePayload
  ): Promise<StandardizedAdminResponse<any>> {
    return this.makeRequest<any>(
      "/api/admin/schools",
      {
        method: "POST",
        headers: this.getHeaders(token),
        body: JSON.stringify(schoolData),
      },
      "Create School"
    );
  }

  /**
   * Update an existing school
   */
  async updateSchool(
    token: string,
    schoolId: string,
    schoolData: AdminSchoolUpdatePayload
  ): Promise<StandardizedAdminResponse<any>> {
    return this.makeRequest<any>(
      `/api/admin/schools/${schoolId}`,
      {
        method: "PUT",
        headers: this.getHeaders(token),
        body: JSON.stringify(schoolData),
      },
      "Update School"
    );
  }

  /**
   * Delete (deactivate) a school
   */
  async deleteSchool(
    token: string,
    schoolId: string
  ): Promise<StandardizedAdminResponse<any>> {
    return this.makeRequest<any>(
      `/api/admin/schools/${schoolId}`,
      {
        method: "DELETE",
        headers: this.getHeaders(token),
      },
      "Delete School"
    );
  }

  /**
   * Reactivate a school
   */
  async reactivateSchool(
    token: string,
    schoolId: string
  ): Promise<StandardizedAdminResponse<any>> {
    return this.makeRequest<any>(
      `/api/admin/schools/${schoolId}`,
      {
        method: "PUT",
        headers: this.getHeaders(token),
        body: JSON.stringify({ is_active: true }),
      },
      "Reactivate School"
    );
  }

  /**
   * Get school statistics
   */
  async getSchoolStatistics(
    token: string
  ): Promise<StandardizedAdminResponse<any>> {
    return this.makeRequest<any>(
      "/api/admin/schools/stats/overview",
      {
        method: "GET",
        headers: this.getHeaders(token),
      },
      "Get School Statistics"
    );
  }

  async impersonateSchool(
    token: string,
    schoolId: string
  ): Promise<StandardizedAdminResponse<AdminSchoolImpersonationData>> {
    return this.makeRequest<AdminSchoolImpersonationData>(
      `/api/admin/schools/${schoolId}/impersonate`,
      {
        method: "POST",
        headers: this.getHeaders(token),
      },
      "Impersonate School"
    );
  }

  /**
   * Get school users with filtering and pagination
   * This endpoint is for school admins to manage their own users
   */
  async getSchoolUsers(
    token: string,
    page: number = 1,
    per_page: number = 10,
    filters: SchoolUserFilters = {}
  ): Promise<StandardizedAdminResponse<SchoolUserListResult>> {
    const queryParams = new URLSearchParams();
    
    // Add pagination
    queryParams.append("page", page.toString());
    queryParams.append("per_page", per_page.toString());
    
    // Add filters
    if (filters.search) {
      queryParams.append("search", filters.search);
    }
    if (filters.is_active !== undefined) {
      queryParams.append("is_active", filters.is_active.toString());
    }
    if (filters.email_verified !== undefined) {
      queryParams.append("email_verified", filters.email_verified.toString());
    }
    if (filters.current_level) {
      queryParams.append("current_level", filters.current_level);
    }
    if (filters.created_after) {
      queryParams.append("created_after", filters.created_after);
    }
    if (filters.created_before) {
      queryParams.append("created_before", filters.created_before);
    }
    if (filters.last_login_after) {
      queryParams.append("last_login_after", filters.last_login_after);
    }
    if (filters.last_login_before) {
      queryParams.append("last_login_before", filters.last_login_before);
    }

    const url = `/api/school/users?${queryParams.toString()}`;
    
    return this.makeRequest<SchoolUserListResult>(
      url,
      {
        method: "GET",
        headers: this.getHeaders(token),
      },
      "Get School Users"
    );
  }

  // ===============================
  // PAYMENT MANAGEMENT METHODS
  // ===============================

  /**
   * Get payment orders/transactions with filtering and pagination
   */
  async getPaymentOrders(
    token: string,
    filters: PaymentOrderFilters = {}
  ): Promise<StandardizedAdminResponse<PaymentOrdersListResult>> {
    const queryParams = new URLSearchParams();

    // Add filters
    if (filters.status) {
      queryParams.append("status", filters.status);
    }
    if (filters.user_email) {
      queryParams.append("user_email", filters.user_email);
    }
    if (filters.gateway) {
      queryParams.append("gateway", filters.gateway);
    }
    if (filters.start_date) {
      queryParams.append("start_date", filters.start_date);
    }
    if (filters.end_date) {
      queryParams.append("end_date", filters.end_date);
    }
    if (filters.search) {
      queryParams.append("search", filters.search);
    }
    if (filters.limit !== undefined) {
      queryParams.append("limit", filters.limit.toString());
    }
    if (filters.offset !== undefined) {
      queryParams.append("offset", filters.offset.toString());
    }
    if (filters.sort_by) {
      queryParams.append("sort_by", filters.sort_by);
    }
    if (filters.sort_order) {
      queryParams.append("sort_order", filters.sort_order);
    }

    const url = `/api/admin/payments/orders?${queryParams.toString()}`;

    return this.makeRequest<PaymentOrdersListResult>(
      url,
      {
        method: "GET",
        headers: this.getHeaders(token),
      },
      "Get Payment Orders"
    );
  }

  /**
   * Get payment order details
   */
  async getPaymentOrderDetails(
    token: string,
    transactionId: string
  ): Promise<StandardizedAdminResponse<PaymentOrderDetailsResult>> {
    return this.makeRequest<PaymentOrderDetailsResult>(
      `/api/admin/payments/orders/${transactionId}`,
      {
        method: "GET",
        headers: this.getHeaders(token),
      },
      "Get Payment Order Details"
    );
  }

  /**
   * Manually capture a pending payment
   */
  async capturePayment(
    token: string,
    transactionId: string,
    request: ManualCaptureRequest
  ): Promise<StandardizedAdminResponse<ManualCaptureResult>> {
    return this.makeRequest<ManualCaptureResult>(
      `/api/admin/payments/orders/${transactionId}/capture`,
      {
        method: "POST",
        headers: this.getHeaders(token),
        body: JSON.stringify(request),
      },
      "Capture Payment"
    );
  }

  /**
   * Manually add credits to a user (topup)
   */
  async topupUserCredits(
    token: string,
    userId: string,
    request: ManualTopupRequest
  ): Promise<StandardizedAdminResponse<ManualTopupResult>> {
    return this.makeRequest<ManualTopupResult>(
      `/api/admin/payments/users/${userId}/topup`,
      {
        method: "POST",
        headers: this.getHeaders(token),
        body: JSON.stringify(request),
      },
      "Topup User Credits"
    );
  }

  /**
   * Search B2C users for topup (any user, not just those with payment history)
   */
  async searchB2CUsers(
    token: string,
    search: string,
    limit: number = 20
  ): Promise<StandardizedAdminResponse<{
    users: Array<{
      id: string;
      email: string;
      name: string;
      is_active: boolean;
      created_at: string;
      last_login: string | null;
      current_credits: number;
      used_credits: number;
      remaining_credits: number;
    }>;
    total: number;
    search_term: string;
  }>> {
    const queryParams = new URLSearchParams();
    queryParams.append("search", search);
    queryParams.append("limit", limit.toString());

    return this.makeRequest(
      `/api/admin/payments/search-users?${queryParams.toString()}`,
      {
        method: "GET",
        headers: this.getHeaders(token),
      },
      "Search B2C Users"
    );
  }

  /**
   * Resend payment confirmation email
   */
  async resendPaymentEmail(
    token: string,
    transactionId: string,
    request: ResendEmailRequest
  ): Promise<StandardizedAdminResponse<ResendEmailResult>> {
    return this.makeRequest<ResendEmailResult>(
      `/api/admin/payments/orders/${transactionId}/send-email`,
      {
        method: "POST",
        headers: this.getHeaders(token),
        body: JSON.stringify(request),
      },
      "Resend Payment Email"
    );
  }

  /**
   * Messages Management - Get list of contact/feedback messages
   */
  async getMessages(
    token: string,
    filters?: {
      message_type?: 'contact' | 'feedback';
      is_read?: boolean;
      category?: string;
      severity?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<StandardizedAdminResponse<{
    messages: Array<{
      id: string;
      message_type: 'contact' | 'feedback';
      name: string | null;
      email: string;
      subject: string;
      message: string;
      user_id: string | null;
      category: string | null;
      severity: string | null;
      is_read: boolean;
      admin_notes: string | null;
      created_at: string;
    }>;
    total: number;
  }>> {
    const params = new URLSearchParams();
    if (filters?.message_type) params.set('message_type', filters.message_type);
    if (filters?.is_read !== undefined) params.set('is_read', filters.is_read.toString());
    if (filters?.category) params.set('category', filters.category);
    if (filters?.severity) params.set('severity', filters.severity);
    if (filters?.limit) params.set('limit', filters.limit.toString());
    if (filters?.offset) params.set('offset', filters.offset.toString());

    const url = params.toString()
      ? `/api/admin/messages?${params.toString()}`
      : '/api/admin/messages';

    return this.makeRequest(
      url,
      { headers: this.getHeaders(token) },
      "Get Messages"
    );
  }

  /**
   * Messages Management - Get message statistics
   */
  async getMessageStatistics(
    token: string
  ): Promise<StandardizedAdminResponse<{
    total_messages: number;
    contact_messages: number;
    feedback_messages: number;
    unread_messages: number;
    by_category: Record<string, number>;
    by_severity: Record<string, number>;
  }>> {
    return this.makeRequest(
      '/api/admin/messages/statistics',
      { headers: this.getHeaders(token) },
      "Get Message Statistics"
    );
  }

  /**
   * Messages Management - Mark message as read
   */
  async markMessageAsRead(
    token: string,
    messageId: string
  ): Promise<StandardizedAdminResponse<{ message: string }>> {
    return this.makeRequest(
      `/api/admin/messages/${messageId}/read`,
      {
        method: 'PATCH',
        headers: this.getHeaders(token),
        body: JSON.stringify({ is_read: true }),
      },
      "Mark Message as Read"
    );
  }

  /**
   * Messages Management - Add admin note to message
   */
  async addMessageNote(
    token: string,
    messageId: string,
    note: string
  ): Promise<StandardizedAdminResponse<{ message: string }>> {
    return this.makeRequest(
      `/api/admin/messages/${messageId}/notes`,
      {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify({ note }),
      },
      "Add Message Note"
    );
  }

  /**
   * Messages Management - Delete message
   */
  async deleteMessage(
    token: string,
    messageId: string
  ): Promise<StandardizedAdminResponse<{ message: string }>> {
    return this.makeRequest(
      `/api/admin/messages/${messageId}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(token),
      },
      "Delete Message"
    );
  }

  /**
   * Get active languages for admin operations
   */
  async getActiveLanguages(
    token: string
  ): Promise<StandardizedAdminResponse<{
    languages: Array<{
      id: string;
      name: string;
      native_name: string | null;
      is_active: boolean;
      supported_levels: string[];
    }>;
  }>> {
    return this.makeRequest(
      '/api/admin/languages',
      {
        method: 'GET',
        headers: this.getHeaders(token),
      },
      "Get Active Languages"
    );
  }
}

export const adminApi = new AdminApiService();
