import axios, { AxiosInstance, AxiosError } from 'axios';
import { CartrackPaginatedResponse } from './cartrackApiTypes';

interface CartrackClientConfig {
  baseUrl: string;
  username: string;
  password: string;
  maxConcurrent?: number;
  requestDelayMs?: number;
  timeoutMs?: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];
const RATE_LIMIT_BACKOFF = 10000;

export class CartrackApiClient {
  private client: AxiosInstance;
  private lastRequestTime = 0;
  private requestDelayMs: number;

  constructor(config: CartrackClientConfig) {
    this.requestDelayMs = config.requestDelayMs ?? 200;

    const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');

    this.client = axios.create({
      baseURL: config.baseUrl.replace(/\/$/, ''),
      timeout: config.timeoutMs ?? 30000,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.requestDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, this.requestDelayMs - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  private isRetryable(error: AxiosError): boolean {
    if (!error.response) return true; // network error
    const status = error.response.status;
    return status === 429 || status >= 500;
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.throttle();
        const response = await this.client.get<T>(endpoint, { params });
        return response.data;
      } catch (error: any) {
        lastError = error;

        if (attempt >= MAX_RETRIES || !this.isRetryable(error)) {
          break;
        }

        // Handle 429 with Retry-After or default backoff
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : RATE_LIMIT_BACKOFF;
          console.warn(`[Cartrack] Rate limited, waiting ${delay}ms before retry`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        console.warn(`[Cartrack] Request failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delay}ms: ${error.message}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  async fetchAllPages<T>(endpoint: string, params?: Record<string, any>): Promise<T[]> {
    const firstPage = await this.get<CartrackPaginatedResponse<T>>(endpoint, {
      ...params,
      page: 1,
      limit: 100,
    });

    if (!firstPage.data) return [];

    const allData: T[] = [...firstPage.data];
    const totalPages = firstPage.meta?.total_pages || 1;

    for (let page = 2; page <= totalPages; page++) {
      const pageData = await this.get<CartrackPaginatedResponse<T>>(endpoint, {
        ...params,
        page,
        limit: 100,
      });
      if (pageData.data) {
        allData.push(...pageData.data);
      }
    }

    return allData;
  }

  // Convenience methods
  async getVehicles(params?: Record<string, any>) {
    return this.fetchAllPages('/vehicles', params);
  }

  async getVehicleStatus(params?: Record<string, any>) {
    return this.get('/vehicles/status', params);
  }

  async getTrips(params: { vehicle_id?: number; date_from?: string; date_to?: string; [key: string]: any }) {
    return this.fetchAllPages('/trips', params);
  }

  async getDrivers(params?: Record<string, any>) {
    return this.fetchAllPages('/drivers', params);
  }

  async getDriverLinkages(params?: Record<string, any>) {
    return this.fetchAllPages('/vehicle-driver-linkage', params);
  }

  async getAlertNotifications(params?: Record<string, any>) {
    return this.fetchAllPages('/alerts/notifications', params);
  }

  async getFuel(params: { vehicle_id?: number; date_from?: string; date_to?: string; [key: string]: any }) {
    return this.fetchAllPages('/fuel', params);
  }

  async getVehicleGroups(params?: Record<string, any>) {
    return this.fetchAllPages('/vehicle-groups', params);
  }
}
