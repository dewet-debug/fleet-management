import { FleetOrder } from './boltApiTypes';

/** Unix seconds -> Date (null-safe). */
function tsToDate(sec: number | null | undefined): Date | null {
  return sec == null ? null : new Date(sec * 1000);
}

/**
 * Maps a Bolt FleetOrder into the flat column set stored on BoltTrip.
 * `vehicleId` is resolved separately (by plate) and injected by the caller.
 * The full order is preserved in rawJson for forward compatibility.
 */
export function mapFleetOrderToBoltTrip(
  order: FleetOrder,
  opts: { companyId?: number | null; vehicleId?: string | null },
) {
  const stops = order.order_stops ?? [];
  const pickup = stops.find((s) => s.type === 'pickup');
  const dropoff = stops.find((s) => s.type === 'dropoff');
  const price = order.order_price ?? ({} as FleetOrder['order_price']);

  return {
    orderReference: order.order_reference,
    companyId: opts.companyId ?? null,

    vehicleLicensePlate: order.vehicle_license_plate,
    vehicleId: opts.vehicleId ?? null,
    vehicleModel: order.vehicle_model,

    driverName: order.driver_name,
    driverUuid: order.driver_uuid,
    partnerUuid: order.partner_uuid,
    driverPhone: order.driver_phone,

    orderStatus: order.order_status,
    paymentMethod: order.payment_method,
    isScheduled: order.is_scheduled ?? false,
    categoryName: order.category_info?.name ?? null,
    categorySeats: order.category_info?.seats ?? null,
    categoryVehicleType: order.category_info?.vehicle_type ?? null,

    pickupAddress: order.pickup_address,
    destinationAddress: order.destination_address,
    pickupLat: pickup?.lat ?? null,
    pickupLng: pickup?.lng ?? null,
    dropoffLat: dropoff?.lat ?? null,
    dropoffLng: dropoff?.lng ?? null,
    rideDistanceMeters: order.ride_distance,
    roadDistanceAtMatching: order.road_distance_at_matching,

    orderCreatedAt: tsToDate(order.order_created_timestamp)!,
    orderAcceptedAt: tsToDate(order.order_accepted_timestamp),
    orderPickupAt: tsToDate(order.order_pickup_timestamp),
    orderDropOffAt: tsToDate(order.order_drop_off_timestamp),
    orderFinishedAt: tsToDate(order.order_finished_timestamp),
    orderCancelledAt: tsToDate(order.order_cancelled_timestamp),
    orderNoShowAt: tsToDate(order.order_no_show_timestamp),
    paymentConfirmedAt: tsToDate(order.payment_confirmed_timestamp),

    ridePrice: price.ride_price ?? null,
    bookingFee: price.booking_fee ?? null,
    tollFee: price.toll_fee ?? null,
    cancellationFee: price.cancellation_fee ?? null,
    tip: price.tip ?? null,
    netEarnings: price.net_earnings ?? null,
    cashDiscount: price.cash_discount ?? null,
    inAppDiscount: price.in_app_discount ?? null,
    commission: price.commission ?? null,

    priceReviewReason: order.price_review_reason,
    driverCancelledReason: order.driver_cancelled_reason,

    rawJson: JSON.stringify(order),
  };
}

export type BoltTripData = ReturnType<typeof mapFleetOrderToBoltTrip>;
