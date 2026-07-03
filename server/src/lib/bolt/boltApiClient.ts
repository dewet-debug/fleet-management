import axios, { AxiosInstance, AxiosError } from 'axios';
import { BoltTokenClient } from './boltAuth';
import {
  BOLT_FLEET_API_BASE_URL,
  BoltEnvelope,
  GetFleetOwnerCompaniesResponse,
  GetFleetOrdersRequest,
  GetFleetOrdersResponse,
} from './boltApiTypes';

/**
 * Client for the Bolt Fleet Integration API.
 *
 * Auth is a Bearer JWT obtained via BoltTokenClient (OAuth2 client_credentials
 * against oidc.bolt.eu). Retry/backoff mirrors the Cartrack client: retry on
 * network errors, 429 (respecting Retry-After), and 5xx. Rate limits for this
 * endpoint aren't publicly documented (addendum §5), so backoff-on-429 is the
 * safe default until Bolt confirms actual limits.
 */

interface BoltApiClientConfig {
  tokenClient: BoltTokenClient;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

const DEFAULT_RETRY_DELAYS = [1000, 2000, 4000];
const RATE_LIMIT_BACKOFF_MS = 10000;

export class BoltApiClient {
  private readonly client: AxiosInstance;
  private readonly tokenClient: BoltTokenClient;
  private readonly maxRetries: number;

  constructor(config: BoltApiClientConfig) {
    this.tokenClient = config.tokenClient;
    this.maxRetries = config.maxRetries ?? 3;
    this.client = axios.create({
      baseURL: (config.baseUrl ?? BOLT_FLEET_API_BASE_URL).replace(/\/$/, ''),
      timeout: config.timeoutMs ?? 30000,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });
  }

  private isRetryable(error: AxiosError): boolean {
    if (!error.response) return true; // network error
    const status = error.response.status;
    return status === 429 || status >= 500;
  }

  private async request<T>(method: 'get' | 'post', endpoint: string, body?: unknown): Promise<T> {
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const token = await this.tokenClient.getAccessToken();
        const response = await this.client.request<T>({
          method,
          url: endpoint,
          data: body,
          headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
      } catch (error) {
        lastError = error;
        const axErr = error as AxiosError;

        if (attempt >= this.maxRetries || !axios.isAxiosError(error) || !this.isRetryable(axErr)) {
          break;
        }

        if (axErr.response?.status === 429) {
          const retryAfter = axErr.response.headers['retry-after'];
          const delay = retryAfter ? parseInt(String(retryAfter), 10) * 1000 : RATE_LIMIT_BACKOFF_MS;
          console.warn(`[Bolt] Rate limited, waiting ${delay}ms before retry`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        const delay = DEFAULT_RETRY_DELAYS[attempt] ?? DEFAULT_RETRY_DELAYS[DEFAULT_RETRY_DELAYS.length - 1];
        console.warn(
          `[Bolt] ${method.toUpperCase()} ${endpoint} failed (attempt ${attempt + 1}/${this.maxRetries + 1}), retrying in ${delay}ms: ${axErr.message}`,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    throw lastError;
  }

  /** GET /fleetIntegration/v1/getCompanies -> company IDs the credentials can access. */
  async getCompanies(): Promise<number[]> {
    const res = await this.request<BoltEnvelope<GetFleetOwnerCompaniesResponse>>(
      'get',
      '/fleetIntegration/v1/getCompanies',
    );
    return res.data?.company_ids ?? [];
  }

  /** POST /fleetIntegration/v1/getFleetOrders -> one page of orders for the given window. */
  async getFleetOrders(req: GetFleetOrdersRequest): Promise<GetFleetOrdersResponse> {
    const res = await this.request<BoltEnvelope<GetFleetOrdersResponse>>(
      'post',
      '/fleetIntegration/v1/getFleetOrders',
      req,
    );
    return res.data;
  }

  /**
   * Page through every order in a window (limit/offset), returning them all.
   * Stops once we've collected `total_orders` or a short page comes back.
   * `pageLimit` is capped at the API max of 1000.
   */
  async getAllFleetOrders(
    req: Omit<GetFleetOrdersRequest, 'limit' | 'offset'>,
    pageLimit = 500,
  ): Promise<GetFleetOrdersResponse> {
    const limit = Math.min(Math.max(pageLimit, 1), 1000);
    const first = await this.getFleetOrders({ ...req, limit, offset: 0 });
    const orders = [...first.orders];

    while (orders.length < first.total_orders && first.orders.length > 0) {
      const page = await this.getFleetOrders({ ...req, limit, offset: orders.length });
      if (page.orders.length === 0) break;
      orders.push(...page.orders);
    }

    return { ...first, orders };
  }
}
