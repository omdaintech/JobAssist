/**
 * School Admin API Service
 * Handles all API calls for school admin functionality
 */

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';

interface SchoolAdminLoginRequest {
  email: string;
  password: string;
  captcha_token?: string;
  remember_me?: boolean;
}

interface SchoolAdminLoginResponse {
  success: boolean;
  message: string;
  data?: {
    access_token: string;
    token_type: string;
    school_admin: {
      id: string;
      email: string;
      name: string;
      school_id: string;
      permissions: string[];
    };
  };
}

interface SchoolUser {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  last_login?: string;
  current_level: string;
  preferred_language_id: string;
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

interface SchoolUserListResponse {
  success: boolean;
  message: string;
  users: SchoolUser[];
  total_count: number;
  pagination: {
    page: number;
    per_page: number;
    has_more: boolean;
    total_pages: number;
  };
}

interface SchoolUserCreateRequest {
  email: string;
  name: string;
  password: string;
  current_level: string;
  preferred_language_id: string;
  plan_type?: string;
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

export interface SchoolUserUpdateRequest {
  email?: string;
  name?: string;
  current_level?: string;
  preferred_language_id?: string;
  is_active?: boolean;
  user_custom_school?: {
    student_code?: string;
    batch?: string;
    remark?: string;
  };
}


interface SchoolInfo {
  success: boolean;
  message: string;
  data?: {
    school: {
      id: string;
      name: string;
      type: string;
      is_active: boolean;
      created_at: string;
    };
  };
}

interface UserActivity {
  session_id: string;
  exam_name: string;
  session_type: 'exam' | 'practice';
  level: string;
  language_id?: string;
  template_id: string;
  template: {
    reading: number;
    writing: number;
    grammar: number;
    hearing: number;
    template_id?: string;
    template_name?: string;
  };
  total_questions: number;
  status: string;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  analyzed_at?: string;
  credit_usage: {
    points_deducted: number;
    points_remaining_after: number;
    status: string;
    deduction_timestamp?: string;
    description?: string;
  };
  activities: {
    reading: number;
    writing: number;
    grammar: number;
    hearing: number;
  };
  results?: {
    overall_score: number;
    completed_activities: number;
    total_activities: number;
    cefr_level_assessment: string;
  };
}

interface UserActivitiesResponse {
  success: boolean;
  message: string;
  data: {
    activities: UserActivity[];
    total_count: number;
    pagination: {
      page: number;
      per_page: number;
      total_count: number;
      total_pages: number;
      has_more: boolean;
    };
  };
}

// Template Management Interfaces
export interface SchoolTemplate {
  id: string;
  template_name: string;
  level: string;
  session_type: 'exam' | 'practice';
  template_data: {
    reading: number;
    writing: number;
    grammar: number;
    hearing: number;
  };
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface TemplateUsageStats {
  total_sessions: number;
  completed_sessions: number;
  analyzed_sessions: number;
  unique_users: number;
  completion_rate: number;
}

export interface TemplateUsageTemplateInfo {
  template_id: string;
  template_name: string;
  level: string;
  session_type: 'exam' | 'practice';
  template_data: {
    reading: number;
    writing: number;
    grammar: number;
  };
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TemplateUsageTemplate extends TemplateUsageTemplateInfo {
  usage_stats: TemplateUsageStats;
}

export interface TemplateUsagePagination {
  page: number;
  per_page: number;
  total_pages: number;
  has_more: boolean;
}

export interface TemplateUsageListResponse {
  success: boolean;
  message: string;
  data?: {
    templates: TemplateUsageTemplate[];
    total_count: number;
    pagination: TemplateUsagePagination;
  };
}

export interface TemplateUsageUserSession {
  user_id: string;
  user_name?: string;
  user_email: string;
  is_active: boolean;
  session_id: string;
  exam_name?: string;
  status: string;
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  analyzed_at?: string | null;
  duration_minutes?: number | null;
  results?: {
    overall_score?: number;
    cefr_level_assessment?: string;
  };
}

export interface TemplateUsageUsersResponse {
  success: boolean;
  message: string;
  data?: {
    template_info: TemplateUsageTemplateInfo;
    users: TemplateUsageUserSession[];
    total_count: number;
    pagination: TemplateUsagePagination;
  };
}

export interface TemplateUsageSessionCreditInfo {
  points_deducted: number;
  points_remaining: number;
  status: string;
  timestamp?: string | null;
}

export interface TemplateUsageSessionRecord {
  session_id: string;
  exam_name?: string;
  status: string;
  level?: string;
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  analyzed_at?: string | null;
  duration_minutes?: number | null;
  user: {
    user_id: string;
    user_name?: string;
    user_email: string;
    is_active: boolean;
  };
  credit_usage: TemplateUsageSessionCreditInfo;
  results?: {
    overall_score?: number;
    cefr_level_assessment?: string;
  };
}

export interface TemplateUsageSessionsResponse {
  success: boolean;
  message: string;
  data?: {
    template_info: TemplateUsageTemplateInfo;
    sessions: TemplateUsageSessionRecord[];
    total_count: number;
    pagination: TemplateUsagePagination;
  };
}

export interface TemplateUsageAnalyticsData {
  total_sessions: number;
  completed_sessions: number;
  analyzed_sessions: number;
  unique_users: number;
  completion_rate: number;
  average_score: number;
  average_duration_minutes: number;
  score_distribution: {
    total_scored_sessions: number;
    highest_score: number;
    lowest_score: number;
  };
}

export interface TemplateUsageAnalyticsResponse {
  success: boolean;
  message: string;
  data?: {
    template_info: TemplateUsageTemplateInfo;
    analytics: TemplateUsageAnalyticsData;
  };
}

export interface SchoolSessionCreateRequest {
  template_id: string;
  session_name: string;
  user_ids: string[];
  language_id: string;
  level: 'A1' | 'A2' | 'B1';
  session_type: 'exam' | 'practice';
  metadata?: Record<string, unknown> | null;
}

export interface SchoolSessionCreatedModel {
  session_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  status: string;
}

export interface SchoolSessionFailedModel {
  user_id: string;
  user_name?: string | null;
  user_email?: string | null;
  error: string;
}

export interface SchoolSessionSummaryModel {
  total_requested: number;
  successful: number;
  failed: number;
}

export interface SchoolSessionCreateData {
  created_sessions: SchoolSessionCreatedModel[];
  failed_sessions: SchoolSessionFailedModel[];
  summary: SchoolSessionSummaryModel;
}

export interface SchoolSessionCreateResponse {
  success: boolean;
  message: string;
  data: SchoolSessionCreateData;
}

// Session Management Interfaces
export interface SessionUser {
  user_id: string;
  user_name: string;
  user_email: string;
  status: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  overall_score?: number;
}

export interface SessionDetail {
  session_id: string;
  session_name: string;
  template_id: string;
  template_name: string;
  level: string;
  session_type: string;
  status: string;
  created_at: string;
  total_users: number;
  started_users: number;
  completed_users: number;
  users: SessionUser[];
}

export interface SessionDetailData {
  session: SessionDetail;
  pagination?: any;
}

export interface SchoolSessionDetailResponse {
  success: boolean;
  message: string;
  data: SessionDetailData;
}

export interface SchoolSessionUsersResponse {
  success: boolean;
  message: string;
  data: SessionDetailData;
}

export interface AvailableUser {
  id: string;
  name: string;
  email: string;
  has_session: boolean;
  session_count: number;
}

export interface AvailableUsersData {
  users: AvailableUser[];
  pagination: any;
}

export interface SchoolSessionAvailableUsersResponse {
  success: boolean;
  message: string;
  data: AvailableUsersData;
}

export interface SchoolSessionAddUsersRequest {
  user_ids: string[];
}

export interface AddUsersToSessionData {
  added_users: string[];
  failed_users: Array<{user_id: string; reason: string}>;
  summary: {added: number; failed: number};
}

export interface SchoolSessionAddUsersResponse {
  success: boolean;
  message: string;
  data: AddUsersToSessionData;
}

export interface SchoolTemplateCreateRequest {
  template_name: string;
  level: 'A1' | 'A2' | 'B1' | 'ALL';
  session_type: 'exam' | 'practice';
  template_data: {
    reading: number;
    writing: number;
    grammar: number;
    hearing: number;
  };
}

export interface SchoolTemplateUpdateRequest {
  template_name?: string;
  level?: 'A1' | 'A2' | 'B1' | 'ALL';
  session_type?: 'exam' | 'practice';
  template_data?: {
    reading: number;
    writing: number;
    grammar: number;
    hearing: number;
  };
}

export interface SchoolTemplateListResponse {
  success: boolean;
  message: string;
  templates: SchoolTemplate[];
}

export interface SchoolTemplateCreateResponse {
  success: boolean;
  message: string;
  template_id?: string;
}

export interface StandardResponse {
  success: boolean;
  message: string;
  data?: any;
}

// Dashboard Analytics Interfaces
export interface SchoolDashboardStats {
  total_students: number;
  active_students: number;
  inactive_students: number;
  sessions_last_7_days: number;
  total_sessions: number;
  avg_sessions_per_student: number;
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

export interface SchoolBillingReportData {
  cycle: BillingCycleDetail;
  usage: SchoolUsageData;
  billing: BillingComputationData;
}

export interface SchoolBillingReportResponse {
  success: boolean;
  message: string;
  data: SchoolBillingReportData;
}

class SchoolApiService {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('school_admin_token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        this.logout();
        throw new Error('Authentication failed. Please login again.');
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Authentication
  async login(credentials: SchoolAdminLoginRequest): Promise<SchoolAdminLoginResponse> {
    const response = await fetch(`${API_BASE_URL}/api/school/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(credentials),
    });

    const result = await this.handleResponse<SchoolAdminLoginResponse>(response);
    
    if (result.success && result.data?.access_token) {
      this.token = result.data.access_token;
      localStorage.setItem('school_admin_token', this.token);
      localStorage.setItem('school_admin_user', JSON.stringify(result.data.school_admin));
    }

    return result;
  }

  async verifyToken(): Promise<{ success: boolean; valid: boolean; data?: any }> {
    if (!this.token) {
      return { success: false, valid: false };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/school/auth/verify`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const result = await this.handleResponse<{ success: boolean; message: string; data?: any }>(response);
      
      // Extract valid flag from data if available
      const isValid = result.success && result.data?.valid === true;
      
      return { 
        success: result.success, 
        valid: isValid,
        data: result.data 
      };
    } catch (error) {
      return { success: false, valid: false };
    }
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem('school_admin_token');
    localStorage.removeItem('school_admin_user');
  }

  // User Management
  async getUsers(
    skip: number = 0, 
    limit: number = 50, 
    filters: SchoolUserFilters = {}
  ): Promise<SchoolUserListResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('skip', skip.toString());
    queryParams.append('limit', limit.toString());
    
    // Add filters to query params
    if (filters.search) {
      queryParams.append('search', filters.search);
    }
    if (filters.is_active !== undefined) {
      queryParams.append('is_active', filters.is_active.toString());
    }
    if (filters.email_verified !== undefined) {
      queryParams.append('email_verified', filters.email_verified.toString());
    }
    if (filters.current_level) {
      queryParams.append('current_level', filters.current_level);
    }
    if (filters.created_after) {
      queryParams.append('created_after', filters.created_after);
    }
    if (filters.created_before) {
      queryParams.append('created_before', filters.created_before);
    }
    if (filters.last_login_after) {
      queryParams.append('last_login_after', filters.last_login_after);
    }
    if (filters.last_login_before) {
      queryParams.append('last_login_before', filters.last_login_before);
    }

    const response = await fetch(`${API_BASE_URL}/api/school/users?${queryParams.toString()}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<SchoolUserListResponse>(response);
  }

  async createUser(userData: SchoolUserCreateRequest): Promise<{ success: boolean; message: string; data?: { user_id: string } }> {
    const response = await fetch(`${API_BASE_URL}/api/school/users`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });

    return this.handleResponse<{ success: boolean; message: string; data?: { user_id: string } }>(response);
  }

  async getUserDetails(userId: string): Promise<{ success: boolean; message: string; data?: { user: SchoolUser } }> {
    const response = await fetch(`${API_BASE_URL}/api/school/users/${userId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<{ success: boolean; message: string; data?: { user: SchoolUser } }>(response);
  }

  async updateUser(userId: string, userData: SchoolUserUpdateRequest): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/school/users/${userId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });

    return this.handleResponse<{ success: boolean; message: string }>(response);
  }

  async deactivateUser(userId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/school/users/${userId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse<{ success: boolean; message: string }>(response);
  }

  async getComprehensiveUserDetails(userId: string): Promise<{ success: boolean; message: string; data?: any }> {
    const response = await fetch(`${API_BASE_URL}/api/school/users/${userId}/details`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<{ success: boolean; message: string; data?: any }>(response);
  }

  async getSchoolInfo(): Promise<SchoolInfo> {
    const response = await fetch(`${API_BASE_URL}/api/school/info`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<SchoolInfo>(response);
  }

  async getBillingOverview(): Promise<SchoolBillingOverviewResponse> {
    const response = await fetch(`${API_BASE_URL}/api/school/billing/overview`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<SchoolBillingOverviewResponse>(response);
  }

  async getBillingUsage(startDate: string, endDate: string): Promise<SchoolUsageResponse> {
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
    const response = await fetch(`${API_BASE_URL}/api/school/billing/usage?${params.toString()}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<SchoolUsageResponse>(response);
  }

  async getBillingProjection(): Promise<SchoolBillingReportResponse> {
    const response = await fetch(`${API_BASE_URL}/api/school/billing/projection`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<SchoolBillingReportResponse>(response);
  }

  async getBillingReport(startDate?: string, endDate?: string): Promise<SchoolBillingReportResponse> {
    const params = new URLSearchParams();
    if (startDate && endDate) {
      params.append('start_date', startDate);
      params.append('end_date', endDate);
    }

    const query = params.toString();
    const response = await fetch(`${API_BASE_URL}/api/school/billing/report${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<SchoolBillingReportResponse>(response);
  }

  async getUserActivities(
    userId: string,
    params?: {
      page?: number;
      per_page?: number;
      session_type?: string;
      activity_type?: string;
      level?: string;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<UserActivitiesResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.session_type) searchParams.append('session_type', params.session_type);
    if (params?.activity_type) searchParams.append('activity_type', params.activity_type);
    if (params?.level) searchParams.append('level', params.level);
    if (params?.date_from) searchParams.append('date_from', params.date_from);
    if (params?.date_to) searchParams.append('date_to', params.date_to);

    const queryString = searchParams.toString();
    const url = `${API_BASE_URL}/api/school/users/${userId}/activities${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<UserActivitiesResponse>(response);
  }

  // Template Management Methods
  async getTemplates(level?: string, session_type?: string): Promise<SchoolTemplateListResponse> {
    const params = new URLSearchParams();
    if (level) params.append('level', level);
    if (session_type) params.append('session_type', session_type);
    
    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/school/templates${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.statusText}`);
    }

    return response.json();
  }

  async createTemplate(templateData: SchoolTemplateCreateRequest): Promise<SchoolTemplateCreateResponse> {
    const response = await fetch(`${API_BASE_URL}/api/school/templates`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(templateData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to create template: ${response.statusText}`);
    }

    return response.json();
  }

  async updateTemplate(templateId: string, templateData: SchoolTemplateUpdateRequest): Promise<StandardResponse> {
    const response = await fetch(`${API_BASE_URL}/api/school/templates/${templateId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(templateData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to update template: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteTemplate(templateId: string, forceDeactivate: boolean = false): Promise<StandardResponse> {
    const url = new URL(`${API_BASE_URL}/api/school/templates/${templateId}`);
    if (forceDeactivate) {
      url.searchParams.append('force_deactivate', 'true');
    }

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to delete template: ${response.statusText}`);
    }

    return response.json();
  }

  async getTemplateUsageTemplates(params?: {
    page?: number;
    per_page?: number;
    level?: string;
    session_type?: string;
  }): Promise<TemplateUsageListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.level) searchParams.append('level', params.level);
    if (params?.session_type) searchParams.append('session_type', params.session_type);

    const query = searchParams.toString();
    const response = await fetch(`${API_BASE_URL}/api/school/template-usage/templates${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<TemplateUsageListResponse>(response);
  }

  async getTemplateUsageTemplateUsers(
    templateId: string,
    params?: {
      page?: number;
      per_page?: number;
      status?: string;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<TemplateUsageUsersResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.date_from) searchParams.append('date_from', params.date_from);
    if (params?.date_to) searchParams.append('date_to', params.date_to);

    const query = searchParams.toString();
    const response = await fetch(`${API_BASE_URL}/api/school/template-usage/templates/${templateId}/users${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<TemplateUsageUsersResponse>(response);
  }

  async getTemplateUsageTemplateSessions(
    templateId: string,
    params?: {
      page?: number;
      per_page?: number;
      status?: string;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<TemplateUsageSessionsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.date_from) searchParams.append('date_from', params.date_from);
    if (params?.date_to) searchParams.append('date_to', params.date_to);

    const query = searchParams.toString();
    const response = await fetch(`${API_BASE_URL}/api/school/template-usage/templates/${templateId}/sessions${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<TemplateUsageSessionsResponse>(response);
  }

  async getTemplateUsageTemplateAnalytics(templateId: string): Promise<TemplateUsageAnalyticsResponse> {
    const response = await fetch(`${API_BASE_URL}/api/school/template-usage/templates/${templateId}/analytics`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<TemplateUsageAnalyticsResponse>(response);
  }

  async createSessionsForUsers(payload: SchoolSessionCreateRequest): Promise<SchoolSessionCreateResponse> {
    const response = await fetch(`${API_BASE_URL}/api/school/sessions/create-for-users`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    return this.handleResponse<SchoolSessionCreateResponse>(response);
  }

  // Session Management Methods
  async getSessionDetail(sessionId: string): Promise<SchoolSessionDetailResponse> {
    const response = await fetch(`${API_BASE_URL}/api/school/sessions/${sessionId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<SchoolSessionDetailResponse>(response);
  }

  async getSessionUsers(sessionId: string, params?: {
    page?: number;
    per_page?: number;
    status?: string;
    search?: string;
  }): Promise<SchoolSessionUsersResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.search) searchParams.append('search', params.search);

    const query = searchParams.toString();
    const response = await fetch(`${API_BASE_URL}/api/school/sessions/${sessionId}/users${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<SchoolSessionUsersResponse>(response);
  }

  async getSessionAvailableUsers(sessionId: string, params?: {
    page?: number;
    per_page?: number;
    search?: string;
  }): Promise<SchoolSessionAvailableUsersResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.search) searchParams.append('search', params.search);

    const query = searchParams.toString();
    const response = await fetch(`${API_BASE_URL}/api/school/sessions/${sessionId}/available-users${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<SchoolSessionAvailableUsersResponse>(response);
  }

  async addUsersToSession(sessionId: string, payload: SchoolSessionAddUsersRequest): Promise<SchoolSessionAddUsersResponse> {
    const response = await fetch(`${API_BASE_URL}/api/school/sessions/${sessionId}/users`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    return this.handleResponse<SchoolSessionAddUsersResponse>(response);
  }

  // Dashboard Analytics Methods
  async getDashboardAnalytics(): Promise<SchoolDashboardResponse> {
    const response = await fetch(`${API_BASE_URL}/api/school/dashboard/analytics`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to fetch dashboard analytics: ${response.statusText}`);
    }

    return response.json();
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.token;
  }

  getCurrentUser(): any {
    const userStr = localStorage.getItem('school_admin_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Get comprehensive school profile for school admin
  async getProfile(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/school/profile`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to fetch school profile: ${response.statusText}`);
    }

    return response.json();
  }
}

export const schoolApi = new SchoolApiService();
export type { 
  AddUsersToSessionData,
  AvailableUser,
  AvailableUsersData,
  BillingCycleDetail,
  BillingCyclePeriod,
  BillingComputationData,
  BillingPackSummary,
  SchoolAdminLoginRequest, 
  SchoolBillingOverviewData,
  SchoolBillingOverviewResponse,
  SchoolBillingReportData,
  SchoolBillingReportResponse,
  SchoolDashboardResponse,
  SchoolDashboardStats,
  SchoolSessionAddUsersRequest,
  SchoolSessionAddUsersResponse,
  SchoolSessionAvailableUsersResponse,
  SchoolSessionDetailResponse,
  SchoolSessionUsersResponse,
  SchoolTemplate,
  SchoolTemplateCreateRequest,
  SchoolTemplateCreateResponse,
  SchoolTemplateListResponse,
  SchoolTemplateUpdateRequest,
  SchoolSessionCreateData,
  SchoolSessionCreateRequest,
  SchoolSessionCreateResponse,
  SchoolSessionCreatedModel,
  SchoolSessionFailedModel,
  SchoolSessionSummaryModel,
  SchoolUsageData,
  SchoolUsageResponse,
  SchoolUser, 
  SchoolUserCreateRequest,
  SessionDetail,
  SessionDetailData, 
  SessionUser,
  TemplateUsageAnalyticsData,
  TemplateUsageAnalyticsResponse,
  TemplateUsageListResponse,
  TemplateUsageSessionCreditInfo,
  TemplateUsageSessionRecord,
  TemplateUsageSessionsResponse,
  TemplateUsageTemplate,
  TemplateUsageTemplateInfo,
  TemplateUsageUsersResponse,
  TemplateUsageUserSession,
  UserActivity, 
  UserActivitiesResponse,
  UsageBucket
};
