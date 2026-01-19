const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface Playable {
  id: number;
  name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id?: string;
  playable_id: number;
  type: 'impression' | 'click' | 'install';
  timestamp?: string;
  metadata?: any;
}

export interface AnalyticsSummary {
  total_impressions: number;
  total_clicks: number;
  total_installs: number;
  ctr: number;
  ipm: number;
}

export interface PlayableAnalytics {
  playable_id: number;
  playable_name: string;
  summary: AnalyticsSummary;
}


export interface TimeSeriesData {
  date: string;
  impressions: number;
  clicks: number;
  installs: number;
  ctr: number;
  ipm: number;
}

export interface PlayableTimeSeriesAnalytics {
  playable_id: number;
  playable_name: string;
  time_series: TimeSeriesData[];
}

class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Playables
  async getPlayables(): Promise<Playable[]> {
    return this.request<Playable[]>('/playables');
  }

  async createPlayable(playable: Omit<Playable, 'id' | 'created_at' | 'updated_at'>): Promise<Playable> {
    return this.request<Playable>('/playables', {
      method: 'POST',
      body: JSON.stringify(playable),
    });
  }

  async deletePlayable(id: number): Promise<{ status: string }> {
    return this.request<{ status: string }>(`/playables/${id}`, {
      method: 'DELETE',
    });
  }

  // Events
  async trackEvent(event: Event): Promise<{ status: string }> {
    return this.request<{ status: string }>('/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  // Analytics
  async getAnalyticsSummary(startDate?: string, endDate?: string): Promise<AnalyticsSummary> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    return this.request<AnalyticsSummary>(`/analytics/summary?${params}`);
  }

  async getAnalyticsByPlayable(startDate?: string, endDate?: string): Promise<PlayableAnalytics[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    return this.request<PlayableAnalytics[]>(`/analytics/by-playable?${params}`);
  }

  async getTimeSeriesAllPlayables(startDate?: string, endDate?: string): Promise<PlayableTimeSeriesAnalytics[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    return this.request<PlayableTimeSeriesAnalytics[]>(`/analytics/timeseries?${params}`);
  }

  async getTimeSeriesByPlayable(playableId: number, startDate?: string, endDate?: string): Promise<TimeSeriesData[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    return this.request<TimeSeriesData[]>(`/analytics/timeseries/${playableId}?${params}`);
  }
}

export const apiClient = new APIClient(API_URL);
