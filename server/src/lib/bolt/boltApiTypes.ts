/**
 * Types for the Bolt Fleet Integration API (fleet-integration-gateway).
 *
 * Hand-mirrored from the vendored OpenAPI spec
 * (./fleet-integration-openapi.json, source:
 *  https://apidocs.bolt.eu/fleetIntegration/fleetIntegrationGatewayAuth/open-api.json).
 *
 * All timestamps are unix numbers per the spec ("unix timestamp"); resolution
 * (s vs ms) and distance units are to be confirmed against a live payload.
 */

export const BOLT_FLEET_API_BASE_URL = 'https://node.bolt.eu/fleet-integration-gateway';

/** Standard response envelope: every endpoint wraps its payload in { code, message, data }. */
export interface BoltEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

// --- getCompanies -----------------------------------------------------------

export interface GetFleetOwnerCompaniesResponse {
  company_ids: number[];
}

// --- getFleetOrders ---------------------------------------------------------

export type TimeRangeFilterType = 'created' | 'price_review';

export interface GetFleetOrdersRequest {
  /** Company IDs to fetch orders for. Required. */
  company_ids: number[];
  /** Single company ID; the first of company_ids is used if this is omitted. */
  company_id?: number;
  /** Unix timestamp - lower bound on the filtered time field. */
  start_ts: number;
  /** Unix timestamp - upper bound on the filtered time field. */
  end_ts: number;
  /** Page size, 1-1000. */
  limit: number;
  /** Records to skip. */
  offset: number;
  /** Defaults to `created`; set to `price_review` to filter by fare-finalised time. */
  time_range_filter_type?: TimeRangeFilterType;
}

export type OrderTryState =
  | 'driver_booking'
  | 'waiting_driver_confirmation'
  | 'client_cancelled'
  | 'driver_did_not_respond'
  | 'driver_rejected'
  | 'driver_accepted'
  | 'driver_arrived_to_client'
  | 'client_did_not_show'
  | 'driving_with_client'
  | 'arrived_to_destination'
  | 'finished'
  | 'payment_booking_failed'
  | 'driver_cancelled_after_accept';

export type OrderStopType = 'pickup' | 'dropoff' | 'waypoint' | 'change_point';

export interface OrderStop {
  type: OrderStopType;
  address: string | null;
  lng: number;
  lat: number;
  real_lng: number | null;
  real_lat: number | null;
}

export interface OrderPriceData {
  ride_price: number | null;
  booking_fee: number | null;
  toll_fee: number | null;
  cancellation_fee: number | null;
  tip: number | null;
  net_earnings: number | null;
  cash_discount: number | null;
  in_app_discount: number | null;
  commission: number | null;
}

export type VehicleType = 'car' | 'motorbike' | 'scooter' | 'bicycle' | 'pedestrian' | 'ebike';

export interface SearchCategoryInfo {
  name: string;
  seats: number;
  vehicle_type: VehicleType;
}

export interface FleetOrder {
  order_reference: string;
  driver_name: string;
  driver_uuid: string | null;
  partner_uuid: string | null;
  driver_phone: string | null;
  payment_method: string | null;
  payment_confirmed_timestamp: number | null;
  order_created_timestamp: number;
  order_status: OrderTryState;
  driver_cancelled_reason: string | null;
  vehicle_model: string | null;
  /** Registration plate - joins to Vehicle.licensePlate in our registry. */
  vehicle_license_plate: string | null;
  price_review_reason: string | null;
  pickup_address: string | null;
  destination_address: string | null;
  order_stops?: OrderStop[];
  ride_distance: number | null;
  road_distance_at_matching: number | null;
  order_accepted_timestamp: number | null;
  order_cancelled_timestamp: number | null;
  order_no_show_timestamp: number | null;
  order_pickup_timestamp: number | null;
  order_drop_off_timestamp: number | null;
  order_finished_timestamp: number | null;
  order_price: OrderPriceData;
  is_scheduled: boolean;
  category_info: SearchCategoryInfo | null;
}

export interface GetFleetOrdersResponse {
  company_id: number;
  company_name: string | null;
  total_orders: number;
  orders: FleetOrder[];
}
