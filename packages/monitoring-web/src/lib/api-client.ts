/**
 * API Client for Dex Monitoring
 * Handles all communication with the monitoring-api backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
}

export interface TeamMember {
  userId: string;
  role: string;
  user?: {
    name?: string;
    email?: string;
  };
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string;
  members?: TeamMember[];
  _count?: {
    projects?: number;
    members?: number;
  };
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  platform: string;
  teamId: string;
  status: string;
  createdAt: string;
  _count?: {
    issues: number;
    events: number;
    logs: number;
  };
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  type: string;
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
}

export interface Issue {
  id: string;
  shortId: string;
  title: string;
  culprit?: string;
  level: string;
  status: string;
  platform: string;
  eventCount: number;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  projectId: string;
  project?: Project;
  metadata?: Record<string, unknown>;
  tags?: Record<string, string>;
  events?: Event[];
}

export interface Event {
  id: string;
  eventId: string;
  message: string;
  level: string;
  platform?: string;
  environment: string;
  serverName?: string;
  release?: string;
  timestamp: string;
  requestId?: string;
  transactionId?: string;
  stacktrace?: StackFrame[] | string;
  breadcrumbs?: Breadcrumb[];
  contexts?: EventContext;
  tags?: Record<string, string>;
  requestUrl?: string;
  requestMethod?: string;
  requestData?: Record<string, unknown>;
}

export interface StackFrame {
  filename: string;
  function: string;
  lineno: number;
  colno: number;
  context?: string[];
}

export interface Breadcrumb {
  timestamp: string;
  category: string;
  message?: string;
  level?: string;
  type?: string;
  data?: Record<string, unknown>;
}

export interface EventContext {
  runtime?: { name: string; version: string };
  os?: { name?: string; version?: string; kernelVersion?: string };
  device?: { arch?: string; memory?: number; cpus?: number; hostname?: string };
  app?: { startTime?: number; memoryUsage?: Record<string, number> };
  request?: Record<string, unknown>;
  user?: { id?: string; email?: string; username?: string; ipAddress?: string };
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

export interface Log {
  id: string;
  level: string;
  message: string;
  environment: string;
  serverName?: string;
  serviceName?: string;
  requestId?: string;
  transactionId?: string;
  timestamp: string;
  data?: Record<string, unknown>;
  tags?: Record<string, string>;
}

export interface AlertAction {
  type: 'email' | 'slack' | 'webhook' | 'discord';
  config: Record<string, unknown>;
}

export interface AlertRule {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  triggerType: string;
  conditions?: Record<string, unknown>;
  threshold: number;
  timeWindow: number;
  actions?: AlertAction[];
  lastTriggeredAt?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// API Error
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Get auth token
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

// Base fetch function
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data.error?.message || data.message || 'Request failed',
      data.error?.code || 'UNKNOWN_ERROR',
      response.status,
    );
  }

  return data.data !== undefined ? data.data : data;
}

// ============================================
// AUTH
// ============================================

export const authApi = {
  async login(email: string, password: string) {
    return fetchApi<{ user: User; accessToken: string; refreshToken: string }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
    );
  },

  async register(email: string, password: string, name: string) {
    return fetchApi<{ user: User; accessToken: string; refreshToken: string }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      },
    );
  },

  async me() {
    return fetchApi<User>('/auth/me');
  },

  async logout() {
    return fetchApi<void>('/auth/logout', { method: 'POST' });
  },

  async refresh(refreshToken: string) {
    return fetchApi<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },
};

// ============================================
// TEAMS
// ============================================

export const teamsApi = {
  async list() {
    return fetchApi<Team[]>('/teams');
  },

  async get(id: string) {
    return fetchApi<Team>(`/teams/${id}`);
  },

  async create(data: { name: string; slug: string; description?: string }) {
    return fetchApi<Team>('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<Team>) {
    return fetchApi<Team>(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string) {
    return fetchApi<void>(`/teams/${id}`, { method: 'DELETE' });
  },
};

// ============================================
// PROJECTS
// ============================================

export const projectsApi = {
  async list(params?: { teamId?: string }): Promise<Project[]> {
    const query = params?.teamId ? `?teamId=${params.teamId}` : '';
    const result = await fetchApi<PaginatedResponse<Project>>(`/projects${query}`);
    return result?.data || [];
  },

  async get(id: string) {
    return fetchApi<Project>(`/projects/${id}`);
  },

  async getStats(id: string) {
    const stats = await fetchApi<{
      totalIssues: number;
      unresolvedIssues: number;
      totalEvents: number;
      eventsLast24h: number;
      eventsLast7d: number;
    }>(`/projects/${id}/stats`);
    // Map to expected format
    return {
      issueCount: stats.totalIssues,
      eventCount: stats.totalEvents,
      logCount: 0, // Not returned by API
      unresolvedIssues: stats.unresolvedIssues,
    };
  },

  async create(data: {
    name: string;
    slug: string;
    teamId: string;
    platform?: string;
  }) {
    return fetchApi<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<Project>) {
    return fetchApi<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string) {
    return fetchApi<void>(`/projects/${id}`, { method: 'DELETE' });
  },
};

// ============================================
// API KEYS
// ============================================

export const apiKeysApi = {
  async list(projectId: string) {
    return fetchApi<ApiKey[]>(`/projects/${projectId}/keys`);
  },

  async create(projectId: string, data: { name: string; type?: string }) {
    const result = await fetchApi<ApiKey & { secretKey: string }>(`/projects/${projectId}/keys`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    // Map secretKey to key for frontend compatibility
    return { ...result, key: result.secretKey };
  },

  async revoke(projectId: string, keyId: string) {
    return fetchApi<void>(`/projects/${projectId}/keys/${keyId}/revoke`, {
      method: 'POST',
    });
  },

  async delete(projectId: string, keyId: string) {
    return fetchApi<void>(`/projects/${projectId}/keys/${keyId}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// ISSUES
// ============================================

export const issuesApi = {
  async list(params?: {
    projectId?: string;
    status?: string;
    level?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const query = new URLSearchParams();
    if (params?.projectId) query.set('projectId', params.projectId);
    if (params?.status) query.set('status', params.status);
    if (params?.level) query.set('level', params.level);
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

    const queryString = query.toString();
    return fetchApi<PaginatedResponse<Issue>>(
      `/issues${queryString ? `?${queryString}` : ''}`,
    );
  },

  async get(id: string) {
    return fetchApi<Issue & { events: Event[] }>(`/issues/${id}`);
  },

  async resolve(id: string) {
    return fetchApi<Issue>(`/issues/${id}/resolve`, { method: 'POST' });
  },

  async unresolve(id: string) {
    return fetchApi<Issue>(`/issues/${id}/unresolve`, { method: 'POST' });
  },

  async ignore(id: string, data?: { reason?: string; until?: string }) {
    return fetchApi<Issue>(`/issues/${id}/ignore`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },

  async unignore(id: string) {
    return fetchApi<Issue>(`/issues/${id}/unignore`, { method: 'POST' });
  },

  async assign(id: string, userId: string | null) {
    return fetchApi<Issue>(`/issues/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  async getActivity(id: string) {
    return fetchApi<
      Array<{
        id: string;
        type: string;
        data: Record<string, unknown>;
        createdAt: string;
        user?: User;
      }>
    >(`/issues/${id}/activity`);
  },

  async getComments(id: string) {
    return fetchApi<
      Array<{
        id: string;
        content: string;
        createdAt: string;
        author: User;
      }>
    >(`/issues/${id}/comments`);
  },

  async addComment(id: string, content: string) {
    return fetchApi<{ id: string; content: string }>(`/issues/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },
};

// ============================================
// EVENTS
// ============================================

export const eventsApi = {
  async get(eventId: string) {
    return fetchApi<Event>(`/events/${eventId}`);
  },
};

// ============================================
// LOGS
// ============================================

export const logsApi = {
  async list(params?: {
    projectId?: string;
    level?: string;
    requestId?: string;
    transactionId?: string;
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.projectId) query.set('projectId', params.projectId);
    if (params?.level) query.set('level', params.level);
    if (params?.requestId) query.set('requestId', params.requestId);
    if (params?.transactionId) query.set('transactionId', params.transactionId);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));

    const queryString = query.toString();
    return fetchApi<PaginatedResponse<Log>>(
      `/logs${queryString ? `?${queryString}` : ''}`,
    );
  },

  async get(id: string) {
    return fetchApi<Log>(`/logs/${id}`);
  },

  async getByRequestId(requestId: string) {
    return fetchApi<Log[]>(`/logs/request/${requestId}`);
  },

  async getByTransactionId(transactionId: string) {
    return fetchApi<Log[]>(`/logs/transaction/${transactionId}`);
  },

  async getStats(params: {
    projectId: string;
    from?: string;
    to?: string;
  }): Promise<{
    total: number;
    byLevel: Record<string, number>;
  }> {
    const query = new URLSearchParams();
    query.set('projectId', params.projectId);
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);

    return fetchApi<{
      total: number;
      byLevel: Record<string, number>;
    }>(`/logs/stats?${query.toString()}`);
  },
};

// ============================================
// ALERT RULES
// ============================================

export const alertRulesApi = {
  async list(projectId: string) {
    return fetchApi<AlertRule[]>(`/projects/${projectId}/alert-rules`);
  },

  async get(projectId: string, id: string) {
    return fetchApi<AlertRule>(`/projects/${projectId}/alert-rules/${id}`);
  },

  async create(
    projectId: string,
    data: {
      name: string;
      description?: string;
      triggerType: string;
      conditions: Record<string, unknown>;
      threshold: number;
      timeWindow: number;
      actions: Array<Record<string, unknown>>;
    },
  ) {
    return fetchApi<AlertRule>(`/projects/${projectId}/alert-rules`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(projectId: string, id: string, data: Partial<AlertRule>) {
    return fetchApi<AlertRule>(`/projects/${projectId}/alert-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async enable(projectId: string, id: string) {
    return fetchApi<AlertRule>(
      `/projects/${projectId}/alert-rules/${id}/enable`,
      { method: 'POST' },
    );
  },

  async disable(projectId: string, id: string) {
    return fetchApi<AlertRule>(
      `/projects/${projectId}/alert-rules/${id}/disable`,
      { method: 'POST' },
    );
  },

  async delete(projectId: string, id: string) {
    return fetchApi<void>(`/projects/${projectId}/alert-rules/${id}`, {
      method: 'DELETE',
    });
  },

  async getAlerts(projectId: string, ruleId: string) {
    return fetchApi<
      Array<{
        id: string;
        status: string;
        title: string;
        message: string;
        triggeredAt: string;
      }>
    >(`/projects/${projectId}/alert-rules/${ruleId}/alerts`);
  },
};

// HTTP Traces types
export interface HttpTrace {
  id: string;
  traceId: string;
  projectId: string;
  timestamp: string;
  method: string;
  url: string;
  path: string;
  statusCode: number;
  duration: number;
  ip?: string;
  userAgent?: string;
  referer?: string;
  contentType?: string;
  contentLength?: number;
  responseSize?: number;
  requestId?: string;
  transactionId?: string;
  userId?: string;
  error?: string;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  environment: string;
  serverName?: string;
}

export interface TraceStats {
  total: number;
  byMethod: Record<string, number>;
  byStatus: Record<string, number>;
  avgDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  errorRate: number;
  slowestEndpoints: Array<{
    path: string;
    method: string;
    avgDuration: number;
    count: number;
    errorCount: number;
  }>;
  requestsPerMinute: number;
}

// Traces API
export const tracesApi = {
  async list(params: {
    projectId: string;
    method?: string;
    statusCode?: number;
    minDuration?: number;
    maxDuration?: number;
    path?: string;
    hasError?: boolean;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
    sortBy?: 'timestamp' | 'duration' | 'statusCode';
    sortOrder?: 'asc' | 'desc';
  }) {
    const searchParams = new URLSearchParams();
    searchParams.set('projectId', params.projectId);
    if (params.method) searchParams.set('method', params.method);
    if (params.statusCode) searchParams.set('statusCode', params.statusCode.toString());
    if (params.minDuration) searchParams.set('minDuration', params.minDuration.toString());
    if (params.maxDuration) searchParams.set('maxDuration', params.maxDuration.toString());
    if (params.path) searchParams.set('path', params.path);
    if (params.hasError !== undefined) searchParams.set('hasError', params.hasError.toString());
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    return fetchApi<PaginatedResponse<HttpTrace>>(`/traces?${searchParams.toString()}`);
  },

  async get(id: string) {
    return fetchApi<HttpTrace>(`/traces/${id}`);
  },

  async getStats(params: {
    projectId: string;
    startDate?: string;
    endDate?: string;
  }) {
    const searchParams = new URLSearchParams();
    searchParams.set('projectId', params.projectId);
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);

    return fetchApi<TraceStats>(`/traces/stats?${searchParams.toString()}`);
  },
};

// Settings types
export interface SlackConfig {
  webhookUrl: string;
  channel: string;
  enabled: boolean;
}

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
}

export interface WebhookConfig {
  url: string;
  secret?: string;
  headers?: Record<string, string>;
  enabled: boolean;
}

export interface IntegrationSettings {
  slack?: SlackConfig;
  email?: EmailConfig;
  webhook?: WebhookConfig;
}

// Settings API
export const settingsApi = {
  async get(teamId: string): Promise<IntegrationSettings> {
    return fetchApi<IntegrationSettings>(`/settings/${teamId}`);
  },

  async saveSlack(teamId: string, config: SlackConfig): Promise<void> {
    await fetchApi(`/settings/${teamId}/slack`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  async testSlack(teamId: string, config: SlackConfig): Promise<{ success: boolean; error?: string }> {
    return fetchApi<{ success: boolean; error?: string }>(`/settings/${teamId}/slack/test`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  async saveEmail(teamId: string, config: EmailConfig): Promise<void> {
    await fetchApi(`/settings/${teamId}/email`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  async testEmail(teamId: string, config: EmailConfig, toEmail?: string): Promise<{ success: boolean; error?: string }> {
    return fetchApi<{ success: boolean; error?: string }>(`/settings/${teamId}/email/test`, {
      method: 'POST',
      body: JSON.stringify({ config, toEmail }),
    });
  },

  async saveWebhook(teamId: string, config: WebhookConfig): Promise<void> {
    await fetchApi(`/settings/${teamId}/webhook`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  async testWebhook(teamId: string, config: WebhookConfig): Promise<{ success: boolean; error?: string }> {
    return fetchApi<{ success: boolean; error?: string }>(`/settings/${teamId}/webhook/test`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },
};

// Default export for convenience
export const api = {
  auth: authApi,
  teams: teamsApi,
  projects: projectsApi,
  apiKeys: apiKeysApi,
  issues: issuesApi,
  events: eventsApi,
  logs: logsApi,
  alertRules: alertRulesApi,
  traces: tracesApi,
  settings: settingsApi,
};

export default api;
