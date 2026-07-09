// Cartrack API pagination meta
export interface CartrackPaginationMeta {
  current_page: number;
  // The Cartrack Fleet API reports the last page as `last_page` (Laravel-style
  // pagination); older code assumed `total_pages`. Keep both optional so either
  // shape works.
  last_page?: number;
  total_pages?: number;
  per_page?: number;
  limit?: number;
  total: number;
}

export interface CartrackPaginatedResponse<T> {
  data: T[];
  meta: CartrackPaginationMeta;
}

// GET /vehicles
export interface CartrackVehicleResponse {
  vehicle_id: number;
  registration: string;
  make?: string;
  model?: string;
  year?: string;
  vin?: string;
  color?: string;
  odometer?: number;
  vehicle_group_id?: number;
  vehicle_group_name?: string;
  [key: string]: any;
}

// GET /vehicles/status — position is nested under `location`, fuel under `fuel`,
// and the event time is `event_ts`. `ignition` is a boolean despite the name.
export interface CartrackVehicleStatusResponse {
  vehicle_id: number;
  registration: string;
  speed?: number;
  bearing?: number;
  ignition?: boolean;
  event_ts?: string;
  odometer?: number;
  location?: {
    latitude?: number;
    longitude?: number;
    position_description?: string;
    updated?: string;
  };
  fuel?: {
    level?: number | null;
    precentage_left?: number | null;
    total_consumed?: number | null;
  };
  [key: string]: any;
}

// GET /trips — requires `start_timestamp`/`end_timestamp` (format "Y-m-d H:i:s").
// NOTE: the `vehicle_id` query param is ignored by the API — results are always
// fleet-wide, so callers must group by each row's `vehicle_id`.
export interface CartrackTripResponse {
  trip_id: string | number;
  vehicle_id: number;
  registration?: string;
  driver_name?: string;
  driver_surname?: string;
  start_timestamp?: string;
  end_timestamp?: string;
  start_coordinates?: { latitude?: number; longitude?: number };
  end_coordinates?: { latitude?: number; longitude?: number };
  start_location?: string;
  end_location?: string;
  trip_distance?: number; // metres
  trip_duration_seconds?: number;
  max_speed?: number;
  idle_time_seconds?: number;
  [key: string]: any;
}

// GET /drivers
export interface CartrackDriverResponse {
  driver_id: string | number;
  first_name?: string;
  last_name?: string;
  employee_number?: string;
  license_number?: string;
  phone?: string;
  email?: string;
  status?: string;
  [key: string]: any;
}

// GET /vehicle-driver-linkage
export interface CartrackDriverLinkageResponse {
  vehicle_id: number;
  driver_id: string | number;
  start_date?: string;
  end_date?: string;
  [key: string]: any;
}

// GET /alerts/notifications
export interface CartrackAlertNotificationResponse {
  alert_id: string | number;
  vehicle_id: number;
  registration?: string;
  alert_type?: string;
  severity?: string;
  message?: string;
  latitude?: number;
  longitude?: number;
  event_time?: string;
  [key: string]: any;
}

// GET /fuel
export interface CartrackFuelResponse {
  fuel_id?: string | number;
  vehicle_id: number;
  registration?: string;
  timestamp?: string;
  fuel_level?: number;
  fuel_percentage?: number;
  total_consumed?: number;
  cost_per_litre?: number;
  total_cost?: number;
  odometer?: number;
  location?: string;
  fuel_type?: string;
  event_type?: string;
  [key: string]: any;
}

// GET /vehicle-groups
export interface CartrackVehicleGroupResponse {
  group_id: string | number;
  name: string;
  description?: string;
  vehicle_count?: number;
  [key: string]: any;
}
