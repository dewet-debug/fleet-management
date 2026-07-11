-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'FLEET_MANAGER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentKilometers" INTEGER NOT NULL DEFAULT 0,
    "fuelType" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3),
    "purchasePrice" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "fleetNumber" TEXT,
    "leaseCompany" TEXT,
    "leaseAgreementNo" TEXT,
    "leaseStartDate" TIMESTAMP(3),
    "leaseEndDate" TIMESTAMP(3),
    "monthlyLeaseCost" DOUBLE PRECISION,
    "currentBookValue" DOUBLE PRECISION,
    "insuranceProvider" TEXT,
    "insurancePolicyNo" TEXT,
    "coverageType" TEXT,
    "policyStartDate" TIMESTAMP(3),
    "policyExpiryDate" TIMESTAMP(3),
    "premiumAmount" DOUBLE PRECISION,
    "registrationExpiry" TIMESTAMP(3),
    "warrantyExpiry" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "licenseNumber" TEXT NOT NULL,
    "licenseExpiry" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "specialties" TEXT NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceTypeConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "estimatedDuration" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceTypeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceIntervalConfig" (
    "id" TEXT NOT NULL,
    "serviceTypeId" TEXT NOT NULL,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "kilometerInterval" INTEGER,
    "timeIntervalDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceIntervalConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleServiceInterval" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "serviceIntervalConfigId" TEXT NOT NULL,
    "lastServiceDate" TIMESTAMP(3),
    "lastServiceKilometers" INTEGER,
    "nextServiceDate" TIMESTAMP(3),
    "nextServiceKilometers" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleServiceInterval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRecord" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "serviceProviderId" TEXT,
    "serviceTypeConfigId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "description" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3),
    "authorizedBy" TEXT,
    "authorizedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "driverId" TEXT,
    "laborCost" DOUBLE PRECISION,
    "partsCost" DOUBLE PRECISION,
    "additionalCharges" DOUBLE PRECISION,
    "vatAmount" DOUBLE PRECISION,
    "totalCostExclVat" DOUBLE PRECISION,
    "totalCostInclVat" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "isWarrantyClaim" BOOLEAN NOT NULL DEFAULT false,
    "kilometersAtService" INTEGER,
    "conditionBefore" TEXT,
    "conditionAfter" TEXT,
    "technicianNotes" TEXT,
    "internalNotes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceStatusHistory" (
    "id" TEXT NOT NULL,
    "serviceRecordId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "serviceRecordId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "caption" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartrackConfig" (
    "id" TEXT NOT NULL,
    "apiBaseUrl" TEXT NOT NULL DEFAULT 'https://fleetapi-za.cartrack.com/rest/',
    "apiUsername" TEXT NOT NULL DEFAULT '',
    "apiPasswordEncrypted" TEXT NOT NULL DEFAULT '',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "syncIntervalMinutes" INTEGER NOT NULL DEFAULT 15,
    "vehicleSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tripSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "driverSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "alertSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "fuelSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "coachingSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "geofenceSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "vehicleEventSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "poiSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastHealthCheck" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartrackConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartrackFleetVehicle" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "cartrackVehicleId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "syncErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartrackFleetVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartrackVehicleData" (
    "id" TEXT NOT NULL,
    "cartrackFleetVehicleId" TEXT NOT NULL,
    "cartrackVehicleId" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "make" TEXT,
    "model" TEXT,
    "year" TEXT,
    "odometer" DOUBLE PRECISION,
    "lastLatitude" DOUBLE PRECISION,
    "lastLongitude" DOUBLE PRECISION,
    "lastSpeed" DOUBLE PRECISION,
    "lastIgnitionStatus" TEXT,
    "lastEventTime" TIMESTAMP(3),
    "fuelLevel" DOUBLE PRECISION,
    "rawVehicleJson" TEXT NOT NULL,
    "rawStatusJson" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartrackVehicleData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartrackTrip" (
    "id" TEXT NOT NULL,
    "cartrackFleetVehicleId" TEXT NOT NULL,
    "cartrackTripId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "startLatitude" DOUBLE PRECISION,
    "startLongitude" DOUBLE PRECISION,
    "endLatitude" DOUBLE PRECISION,
    "endLongitude" DOUBLE PRECISION,
    "startAddress" TEXT,
    "endAddress" TEXT,
    "distanceKm" DOUBLE PRECISION,
    "durationMinutes" DOUBLE PRECISION,
    "maxSpeed" DOUBLE PRECISION,
    "averageSpeed" DOUBLE PRECISION,
    "idlingDurationMinutes" DOUBLE PRECISION,
    "fuelUsedLitres" DOUBLE PRECISION,
    "driverName" TEXT,
    "rawJson" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartrackTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartrackDriver" (
    "id" TEXT NOT NULL,
    "cartrackDriverId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "employeeNumber" TEXT,
    "licenseNumber" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "status" TEXT,
    "rawJson" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartrackDriver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartrackDriverLinkage" (
    "id" TEXT NOT NULL,
    "cartrackVehicleId" TEXT NOT NULL,
    "cartrackDriverId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "rawJson" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartrackDriverLinkage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartrackAlert" (
    "id" TEXT NOT NULL,
    "cartrackFleetVehicleId" TEXT NOT NULL,
    "cartrackAlertId" TEXT NOT NULL,
    "alertType" TEXT,
    "severity" TEXT,
    "message" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "eventTime" TIMESTAMP(3),
    "isAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "rawJson" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartrackAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartrackFuelRecord" (
    "id" TEXT NOT NULL,
    "cartrackFleetVehicleId" TEXT NOT NULL,
    "cartrackFuelId" TEXT NOT NULL,
    "eventTime" TIMESTAMP(3),
    "litres" DOUBLE PRECISION,
    "costPerLitre" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "odometer" DOUBLE PRECISION,
    "location" TEXT,
    "fuelType" TEXT,
    "rawJson" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartrackFuelRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartrackVehicleGroup" (
    "id" TEXT NOT NULL,
    "cartrackGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "vehicleCount" INTEGER NOT NULL DEFAULT 0,
    "rawJson" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartrackVehicleGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartrackSyncLog" (
    "id" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "triggeredByUserId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "recordsFetched" INTEGER NOT NULL DEFAULT 0,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsErrored" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "errorDetails" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CartrackSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartrackCoachingEvent" (
    "id" TEXT NOT NULL,
    "cartrackEventId" TEXT NOT NULL,
    "cartrackFleetVehicleId" TEXT,
    "driverName" TEXT,
    "eventType" TEXT,
    "score" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "eventTime" TIMESTAMP(3),
    "rawJson" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartrackCoachingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartrackGeofence" (
    "id" TEXT NOT NULL,
    "cartrackGeofenceId" TEXT NOT NULL,
    "name" TEXT,
    "type" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "radius" DOUBLE PRECISION,
    "rawJson" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartrackGeofence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartrackGeofenceVisit" (
    "id" TEXT NOT NULL,
    "cartrackVisitId" TEXT NOT NULL,
    "cartrackGeofenceId" TEXT,
    "cartrackVehicleId" TEXT,
    "geofenceName" TEXT,
    "entryTime" TIMESTAMP(3),
    "exitTime" TIMESTAMP(3),
    "durationMinutes" DOUBLE PRECISION,
    "rawJson" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartrackGeofenceVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartrackVehicleEvent" (
    "id" TEXT NOT NULL,
    "cartrackEventId" TEXT NOT NULL,
    "cartrackFleetVehicleId" TEXT,
    "eventType" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "eventTime" TIMESTAMP(3),
    "rawJson" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartrackVehicleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartrackReminder" (
    "id" TEXT NOT NULL,
    "cartrackReminderId" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "reminderType" TEXT,
    "title" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" TEXT,
    "rawJson" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartrackReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartrackPoi" (
    "id" TEXT NOT NULL,
    "cartrackPoiId" TEXT NOT NULL,
    "name" TEXT,
    "category" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "address" TEXT,
    "rawJson" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartrackPoi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "A49Driver" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "company" TEXT,
    "licensePlate" TEXT,
    "vehicleType" TEXT,
    "vehicleStatus" TEXT,
    "driverFullName" TEXT NOT NULL,
    "driverPersonalCode" TEXT,
    "dateDriverAssigned" TIMESTAMP(3),
    "driverContactNumber" TEXT,
    "driverEmail" TEXT,
    "driverAddress" TEXT,
    "currentOdo" DOUBLE PRECISION,
    "kmYesterday" DOUBLE PRECISION,
    "kmMonthToDate" DOUBLE PRECISION,
    "rawJson" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "A49Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "A49JobCard" (
    "id" TEXT NOT NULL,
    "jobCardNumber" TEXT NOT NULL,
    "jobCardType" TEXT,
    "jobCardStatus" TEXT,
    "poEmailSent" TIMESTAMP(3),
    "quotedTotalsExclVat" DOUBLE PRECISION,
    "poTotalExclVat" DOUBLE PRECISION,
    "poNumber" TEXT,
    "registrationNumber" TEXT,
    "associatedMake" TEXT,
    "associatedModel" TEXT,
    "lastRecordedOdo" DOUBLE PRECISION,
    "currentOdo" DOUBLE PRECISION,
    "insuranceRelated" BOOLEAN NOT NULL DEFAULT false,
    "associatedMerchant" TEXT,
    "jobCardOpenedDate" TIMESTAMP(3),
    "bookedInDate" TIMESTAMP(3),
    "dateQuoteSubmitted" TIMESTAMP(3),
    "poApprovedDate" TIMESTAMP(3),
    "dateRepairStarted" TIMESTAMP(3),
    "dateRepairCompleted" TIMESTAMP(3),
    "jobCardClosedDate" TIMESTAMP(3),
    "repairEtaDate" TIMESTAMP(3),
    "finalInspectionDate" TIMESTAMP(3),
    "daysJobCardBookedIn" INTEGER,
    "daysQuoteSubmitted" INTEGER,
    "daysPoApproved" INTEGER,
    "daysPoSent" INTEGER,
    "daysInRepair" INTEGER,
    "daysSinceOpenedToClose" INTEGER,
    "totalOemPartPriceExclVat" DOUBLE PRECISION,
    "totalLabourHoursExclVat" DOUBLE PRECISION,
    "totalLabourCostPerHourExclVat" DOUBLE PRECISION,
    "totalStripAssembleHoursExclVat" DOUBLE PRECISION,
    "totalApprovedOemPartPriceExclVat" DOUBLE PRECISION,
    "totalApprovedLabourHoursExclVat" DOUBLE PRECISION,
    "totalApprovedLabourCostPerHourExclVat" DOUBLE PRECISION,
    "totalApprovedStripAssembleHoursExclVat" DOUBLE PRECISION,
    "rawJson" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "A49JobCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "A49SyncLog" (
    "id" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "recordsFetched" INTEGER NOT NULL DEFAULT 0,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsErrored" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "A49SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoltTrip" (
    "id" TEXT NOT NULL,
    "orderReference" TEXT NOT NULL,
    "companyId" INTEGER,
    "vehicleLicensePlate" TEXT,
    "vehicleId" TEXT,
    "vehicleModel" TEXT,
    "driverName" TEXT,
    "driverUuid" TEXT,
    "partnerUuid" TEXT,
    "driverPhone" TEXT,
    "orderStatus" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "isScheduled" BOOLEAN NOT NULL DEFAULT false,
    "categoryName" TEXT,
    "categorySeats" INTEGER,
    "categoryVehicleType" TEXT,
    "pickupAddress" TEXT,
    "destinationAddress" TEXT,
    "pickupLat" DOUBLE PRECISION,
    "pickupLng" DOUBLE PRECISION,
    "dropoffLat" DOUBLE PRECISION,
    "dropoffLng" DOUBLE PRECISION,
    "rideDistanceMeters" DOUBLE PRECISION,
    "roadDistanceAtMatching" DOUBLE PRECISION,
    "orderCreatedAt" TIMESTAMP(3) NOT NULL,
    "orderAcceptedAt" TIMESTAMP(3),
    "orderPickupAt" TIMESTAMP(3),
    "orderDropOffAt" TIMESTAMP(3),
    "orderFinishedAt" TIMESTAMP(3),
    "orderCancelledAt" TIMESTAMP(3),
    "orderNoShowAt" TIMESTAMP(3),
    "paymentConfirmedAt" TIMESTAMP(3),
    "ridePrice" DOUBLE PRECISION,
    "bookingFee" DOUBLE PRECISION,
    "tollFee" DOUBLE PRECISION,
    "cancellationFee" DOUBLE PRECISION,
    "tip" DOUBLE PRECISION,
    "netEarnings" DOUBLE PRECISION,
    "cashDiscount" DOUBLE PRECISION,
    "inAppDiscount" DOUBLE PRECISION,
    "commission" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "priceReviewReason" TEXT,
    "driverCancelledReason" TEXT,
    "rawJson" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoltTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoltSyncLog" (
    "id" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3),
    "windowEnd" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "recordsFetched" INTEGER NOT NULL DEFAULT 0,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsMatched" INTEGER NOT NULL DEFAULT 0,
    "recordsErrored" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoltSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetFinancialMonth" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "monthLabel" TEXT NOT NULL,
    "vehiclesDelivered" INTEGER,
    "vehiclesActive" INTEGER,
    "billedGross" DOUBLE PRECISION NOT NULL,
    "collected" DOUBLE PRECISION NOT NULL,
    "weeklyRental" DOUBLE PRECISION,
    "cashBalance" DOUBLE PRECISION,
    "totalFundBalance" DOUBLE PRECISION,
    "profitFundBalance" DOUBLE PRECISION,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FleetFinancialMonth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleRentalMonth" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "driverName" TEXT,
    "driverId" TEXT,
    "rentalBilled" DOUBLE PRECISION NOT NULL,
    "rentalCollected" DOUBLE PRECISION NOT NULL,
    "excessKm" DOUBLE PRECISION,
    "initiationFees" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleRentalMonth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vin_key" ON "Vehicle"("vin");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_licensePlate_key" ON "Vehicle"("licensePlate");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_employeeId_key" ON "Driver"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_email_key" ON "Driver"("email");

-- CreateIndex
CREATE INDEX "Assignment_vehicleId_idx" ON "Assignment"("vehicleId");

-- CreateIndex
CREATE INDEX "Assignment_driverId_idx" ON "Assignment"("driverId");

-- CreateIndex
CREATE INDEX "Assignment_createdBy_idx" ON "Assignment"("createdBy");

-- CreateIndex
CREATE INDEX "ServiceIntervalConfig_serviceTypeId_idx" ON "ServiceIntervalConfig"("serviceTypeId");

-- CreateIndex
CREATE INDEX "VehicleServiceInterval_vehicleId_idx" ON "VehicleServiceInterval"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleServiceInterval_serviceIntervalConfigId_idx" ON "VehicleServiceInterval"("serviceIntervalConfigId");

-- CreateIndex
CREATE INDEX "ServiceRecord_vehicleId_idx" ON "ServiceRecord"("vehicleId");

-- CreateIndex
CREATE INDEX "ServiceRecord_serviceProviderId_idx" ON "ServiceRecord"("serviceProviderId");

-- CreateIndex
CREATE INDEX "ServiceRecord_driverId_idx" ON "ServiceRecord"("driverId");

-- CreateIndex
CREATE INDEX "ServiceRecord_serviceTypeConfigId_idx" ON "ServiceRecord"("serviceTypeConfigId");

-- CreateIndex
CREATE INDEX "ServiceRecord_authorizedBy_idx" ON "ServiceRecord"("authorizedBy");

-- CreateIndex
CREATE INDEX "ServiceRecord_approvedBy_idx" ON "ServiceRecord"("approvedBy");

-- CreateIndex
CREATE INDEX "ServiceRecord_createdBy_idx" ON "ServiceRecord"("createdBy");

-- CreateIndex
CREATE INDEX "ServiceStatusHistory_serviceRecordId_idx" ON "ServiceStatusHistory"("serviceRecordId");

-- CreateIndex
CREATE INDEX "ServiceStatusHistory_changedBy_idx" ON "ServiceStatusHistory"("changedBy");

-- CreateIndex
CREATE INDEX "Photo_serviceRecordId_idx" ON "Photo"("serviceRecordId");

-- CreateIndex
CREATE INDEX "Photo_uploadedBy_idx" ON "Photo"("uploadedBy");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "CartrackFleetVehicle_vehicleId_key" ON "CartrackFleetVehicle"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "CartrackFleetVehicle_licensePlate_key" ON "CartrackFleetVehicle"("licensePlate");

-- CreateIndex
CREATE UNIQUE INDEX "CartrackFleetVehicle_cartrackVehicleId_key" ON "CartrackFleetVehicle"("cartrackVehicleId");

-- CreateIndex
CREATE INDEX "CartrackFleetVehicle_vehicleId_idx" ON "CartrackFleetVehicle"("vehicleId");

-- CreateIndex
CREATE INDEX "CartrackFleetVehicle_licensePlate_idx" ON "CartrackFleetVehicle"("licensePlate");

-- CreateIndex
CREATE INDEX "CartrackFleetVehicle_cartrackVehicleId_idx" ON "CartrackFleetVehicle"("cartrackVehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "CartrackVehicleData_cartrackFleetVehicleId_key" ON "CartrackVehicleData"("cartrackFleetVehicleId");

-- CreateIndex
CREATE INDEX "CartrackVehicleData_cartrackFleetVehicleId_idx" ON "CartrackVehicleData"("cartrackFleetVehicleId");

-- CreateIndex
CREATE INDEX "CartrackVehicleData_cartrackVehicleId_idx" ON "CartrackVehicleData"("cartrackVehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "CartrackTrip_cartrackTripId_key" ON "CartrackTrip"("cartrackTripId");

-- CreateIndex
CREATE INDEX "CartrackTrip_cartrackFleetVehicleId_idx" ON "CartrackTrip"("cartrackFleetVehicleId");

-- CreateIndex
CREATE INDEX "CartrackTrip_startTime_idx" ON "CartrackTrip"("startTime");

-- CreateIndex
CREATE INDEX "CartrackTrip_endTime_idx" ON "CartrackTrip"("endTime");

-- CreateIndex
CREATE UNIQUE INDEX "CartrackDriver_cartrackDriverId_key" ON "CartrackDriver"("cartrackDriverId");

-- CreateIndex
CREATE INDEX "CartrackDriver_cartrackDriverId_idx" ON "CartrackDriver"("cartrackDriverId");

-- CreateIndex
CREATE INDEX "CartrackDriver_employeeNumber_idx" ON "CartrackDriver"("employeeNumber");

-- CreateIndex
CREATE INDEX "CartrackDriverLinkage_cartrackVehicleId_idx" ON "CartrackDriverLinkage"("cartrackVehicleId");

-- CreateIndex
CREATE INDEX "CartrackDriverLinkage_cartrackDriverId_idx" ON "CartrackDriverLinkage"("cartrackDriverId");

-- CreateIndex
CREATE UNIQUE INDEX "CartrackDriverLinkage_cartrackVehicleId_cartrackDriverId_key" ON "CartrackDriverLinkage"("cartrackVehicleId", "cartrackDriverId");

-- CreateIndex
CREATE UNIQUE INDEX "CartrackAlert_cartrackAlertId_key" ON "CartrackAlert"("cartrackAlertId");

-- CreateIndex
CREATE INDEX "CartrackAlert_cartrackFleetVehicleId_idx" ON "CartrackAlert"("cartrackFleetVehicleId");

-- CreateIndex
CREATE INDEX "CartrackAlert_alertType_idx" ON "CartrackAlert"("alertType");

-- CreateIndex
CREATE INDEX "CartrackAlert_eventTime_idx" ON "CartrackAlert"("eventTime");

-- CreateIndex
CREATE UNIQUE INDEX "CartrackFuelRecord_cartrackFuelId_key" ON "CartrackFuelRecord"("cartrackFuelId");

-- CreateIndex
CREATE INDEX "CartrackFuelRecord_cartrackFleetVehicleId_idx" ON "CartrackFuelRecord"("cartrackFleetVehicleId");

-- CreateIndex
CREATE INDEX "CartrackFuelRecord_eventTime_idx" ON "CartrackFuelRecord"("eventTime");

-- CreateIndex
CREATE UNIQUE INDEX "CartrackVehicleGroup_cartrackGroupId_key" ON "CartrackVehicleGroup"("cartrackGroupId");

-- CreateIndex
CREATE INDEX "CartrackVehicleGroup_cartrackGroupId_idx" ON "CartrackVehicleGroup"("cartrackGroupId");

-- CreateIndex
CREATE INDEX "CartrackSyncLog_syncType_idx" ON "CartrackSyncLog"("syncType");

-- CreateIndex
CREATE INDEX "CartrackSyncLog_status_idx" ON "CartrackSyncLog"("status");

-- CreateIndex
CREATE INDEX "CartrackSyncLog_startedAt_idx" ON "CartrackSyncLog"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CartrackCoachingEvent_cartrackEventId_key" ON "CartrackCoachingEvent"("cartrackEventId");

-- CreateIndex
CREATE INDEX "CartrackCoachingEvent_cartrackFleetVehicleId_idx" ON "CartrackCoachingEvent"("cartrackFleetVehicleId");

-- CreateIndex
CREATE INDEX "CartrackCoachingEvent_eventType_idx" ON "CartrackCoachingEvent"("eventType");

-- CreateIndex
CREATE INDEX "CartrackCoachingEvent_eventTime_idx" ON "CartrackCoachingEvent"("eventTime");

-- CreateIndex
CREATE UNIQUE INDEX "CartrackGeofence_cartrackGeofenceId_key" ON "CartrackGeofence"("cartrackGeofenceId");

-- CreateIndex
CREATE INDEX "CartrackGeofence_cartrackGeofenceId_idx" ON "CartrackGeofence"("cartrackGeofenceId");

-- CreateIndex
CREATE UNIQUE INDEX "CartrackGeofenceVisit_cartrackVisitId_key" ON "CartrackGeofenceVisit"("cartrackVisitId");

-- CreateIndex
CREATE INDEX "CartrackGeofenceVisit_cartrackGeofenceId_idx" ON "CartrackGeofenceVisit"("cartrackGeofenceId");

-- CreateIndex
CREATE INDEX "CartrackGeofenceVisit_cartrackVehicleId_idx" ON "CartrackGeofenceVisit"("cartrackVehicleId");

-- CreateIndex
CREATE INDEX "CartrackGeofenceVisit_entryTime_idx" ON "CartrackGeofenceVisit"("entryTime");

-- CreateIndex
CREATE UNIQUE INDEX "CartrackVehicleEvent_cartrackEventId_key" ON "CartrackVehicleEvent"("cartrackEventId");

-- CreateIndex
CREATE INDEX "CartrackVehicleEvent_cartrackFleetVehicleId_idx" ON "CartrackVehicleEvent"("cartrackFleetVehicleId");

-- CreateIndex
CREATE INDEX "CartrackVehicleEvent_eventType_idx" ON "CartrackVehicleEvent"("eventType");

-- CreateIndex
CREATE INDEX "CartrackVehicleEvent_eventTime_idx" ON "CartrackVehicleEvent"("eventTime");

-- CreateIndex
CREATE UNIQUE INDEX "CartrackReminder_cartrackReminderId_key" ON "CartrackReminder"("cartrackReminderId");

-- CreateIndex
CREATE INDEX "CartrackReminder_registrationNumber_idx" ON "CartrackReminder"("registrationNumber");

-- CreateIndex
CREATE INDEX "CartrackReminder_dueDate_idx" ON "CartrackReminder"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "CartrackPoi_cartrackPoiId_key" ON "CartrackPoi"("cartrackPoiId");

-- CreateIndex
CREATE INDEX "CartrackPoi_cartrackPoiId_idx" ON "CartrackPoi"("cartrackPoiId");

-- CreateIndex
CREATE UNIQUE INDEX "A49Driver_externalId_key" ON "A49Driver"("externalId");

-- CreateIndex
CREATE INDEX "A49Driver_licensePlate_idx" ON "A49Driver"("licensePlate");

-- CreateIndex
CREATE INDEX "A49Driver_driverFullName_idx" ON "A49Driver"("driverFullName");

-- CreateIndex
CREATE UNIQUE INDEX "A49JobCard_jobCardNumber_key" ON "A49JobCard"("jobCardNumber");

-- CreateIndex
CREATE INDEX "A49JobCard_registrationNumber_idx" ON "A49JobCard"("registrationNumber");

-- CreateIndex
CREATE INDEX "A49JobCard_jobCardStatus_idx" ON "A49JobCard"("jobCardStatus");

-- CreateIndex
CREATE INDEX "A49SyncLog_syncType_idx" ON "A49SyncLog"("syncType");

-- CreateIndex
CREATE INDEX "A49SyncLog_status_idx" ON "A49SyncLog"("status");

-- CreateIndex
CREATE INDEX "A49SyncLog_startedAt_idx" ON "A49SyncLog"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BoltTrip_orderReference_key" ON "BoltTrip"("orderReference");

-- CreateIndex
CREATE INDEX "BoltTrip_vehicleLicensePlate_idx" ON "BoltTrip"("vehicleLicensePlate");

-- CreateIndex
CREATE INDEX "BoltTrip_vehicleId_idx" ON "BoltTrip"("vehicleId");

-- CreateIndex
CREATE INDEX "BoltTrip_orderStatus_idx" ON "BoltTrip"("orderStatus");

-- CreateIndex
CREATE INDEX "BoltTrip_orderCreatedAt_idx" ON "BoltTrip"("orderCreatedAt");

-- CreateIndex
CREATE INDEX "BoltTrip_orderFinishedAt_idx" ON "BoltTrip"("orderFinishedAt");

-- CreateIndex
CREATE INDEX "BoltSyncLog_syncType_idx" ON "BoltSyncLog"("syncType");

-- CreateIndex
CREATE INDEX "BoltSyncLog_status_idx" ON "BoltSyncLog"("status");

-- CreateIndex
CREATE INDEX "BoltSyncLog_startedAt_idx" ON "BoltSyncLog"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FleetFinancialMonth_month_key" ON "FleetFinancialMonth"("month");

-- CreateIndex
CREATE INDEX "VehicleRentalMonth_licensePlate_idx" ON "VehicleRentalMonth"("licensePlate");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleRentalMonth_month_licensePlate_key" ON "VehicleRentalMonth"("month", "licensePlate");

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceIntervalConfig" ADD CONSTRAINT "ServiceIntervalConfig_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceTypeConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleServiceInterval" ADD CONSTRAINT "VehicleServiceInterval_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleServiceInterval" ADD CONSTRAINT "VehicleServiceInterval_serviceIntervalConfigId_fkey" FOREIGN KEY ("serviceIntervalConfigId") REFERENCES "ServiceIntervalConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "ServiceProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_serviceTypeConfigId_fkey" FOREIGN KEY ("serviceTypeConfigId") REFERENCES "ServiceTypeConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_authorizedBy_fkey" FOREIGN KEY ("authorizedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceStatusHistory" ADD CONSTRAINT "ServiceStatusHistory_serviceRecordId_fkey" FOREIGN KEY ("serviceRecordId") REFERENCES "ServiceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceStatusHistory" ADD CONSTRAINT "ServiceStatusHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_serviceRecordId_fkey" FOREIGN KEY ("serviceRecordId") REFERENCES "ServiceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartrackFleetVehicle" ADD CONSTRAINT "CartrackFleetVehicle_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartrackVehicleData" ADD CONSTRAINT "CartrackVehicleData_cartrackFleetVehicleId_fkey" FOREIGN KEY ("cartrackFleetVehicleId") REFERENCES "CartrackFleetVehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartrackTrip" ADD CONSTRAINT "CartrackTrip_cartrackFleetVehicleId_fkey" FOREIGN KEY ("cartrackFleetVehicleId") REFERENCES "CartrackFleetVehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartrackDriverLinkage" ADD CONSTRAINT "CartrackDriverLinkage_cartrackDriverId_fkey" FOREIGN KEY ("cartrackDriverId") REFERENCES "CartrackDriver"("cartrackDriverId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartrackAlert" ADD CONSTRAINT "CartrackAlert_cartrackFleetVehicleId_fkey" FOREIGN KEY ("cartrackFleetVehicleId") REFERENCES "CartrackFleetVehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartrackFuelRecord" ADD CONSTRAINT "CartrackFuelRecord_cartrackFleetVehicleId_fkey" FOREIGN KEY ("cartrackFleetVehicleId") REFERENCES "CartrackFleetVehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartrackCoachingEvent" ADD CONSTRAINT "CartrackCoachingEvent_cartrackFleetVehicleId_fkey" FOREIGN KEY ("cartrackFleetVehicleId") REFERENCES "CartrackFleetVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartrackVehicleEvent" ADD CONSTRAINT "CartrackVehicleEvent_cartrackFleetVehicleId_fkey" FOREIGN KEY ("cartrackFleetVehicleId") REFERENCES "CartrackFleetVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoltTrip" ADD CONSTRAINT "BoltTrip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

