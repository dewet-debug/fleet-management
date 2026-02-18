// Cartrack API pagination meta
export interface CartrackPaginationMeta {
  current_page: number;
  total_pages: number;
  limit: number;
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

// GET /vehicles/status
export interface CartrackVehicleStatusResponse {
  vehicle_id: number;
  registration: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
  heading?: number;
  ignition?: string;
  last_event_time?: string;
  fuel_level?: number;
  odometer?: number;
  [key: string]: any;
}

// GET /trips
export interface CartrackTripResponse {
  trip_id: string | number;
  vehicle_id: number;
  registration?: string;
  driver_name?: string;
  start_time?: string;
  end_time?: string;
  start_latitude?: number;
  start_longitude?: number;
  end_latitude?: number;
  end_longitude?: number;
  start_address?: string;
  end_address?: string;
  distance?: number;
  duration?: number;
  max_speed?: number;
  average_speed?: number;
  idle_duration?: number;
  fuel_used?: number;
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
