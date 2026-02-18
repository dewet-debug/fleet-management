-- CreateTable
CREATE TABLE "CartrackConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "lastHealthCheck" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CartrackFleetVehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "cartrackVehicleId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" DATETIME,
    "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "syncErrorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CartrackFleetVehicle_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CartrackVehicleData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartrackFleetVehicleId" TEXT NOT NULL,
    "cartrackVehicleId" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "make" TEXT,
    "model" TEXT,
    "year" TEXT,
    "odometer" REAL,
    "lastLatitude" REAL,
    "lastLongitude" REAL,
    "lastSpeed" REAL,
    "lastIgnitionStatus" TEXT,
    "lastEventTime" DATETIME,
    "fuelLevel" REAL,
    "rawVehicleJson" TEXT NOT NULL,
    "rawStatusJson" TEXT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CartrackVehicleData_cartrackFleetVehicleId_fkey" FOREIGN KEY ("cartrackFleetVehicleId") REFERENCES "CartrackFleetVehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CartrackTrip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartrackFleetVehicleId" TEXT NOT NULL,
    "cartrackTripId" TEXT NOT NULL,
    "startTime" DATETIME,
    "endTime" DATETIME,
    "startLatitude" REAL,
    "startLongitude" REAL,
    "endLatitude" REAL,
    "endLongitude" REAL,
    "startAddress" TEXT,
    "endAddress" TEXT,
    "distanceKm" REAL,
    "durationMinutes" REAL,
    "maxSpeed" REAL,
    "averageSpeed" REAL,
    "idlingDurationMinutes" REAL,
    "fuelUsedLitres" REAL,
    "driverName" TEXT,
    "rawJson" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CartrackTrip_cartrackFleetVehicleId_fkey" FOREIGN KEY ("cartrackFleetVehicleId") REFERENCES "CartrackFleetVehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CartrackDriver" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartrackDriverId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "employeeNumber" TEXT,
    "licenseNumber" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "status" TEXT,
    "rawJson" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CartrackDriverLinkage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartrackVehicleId" TEXT NOT NULL,
    "cartrackDriverId" TEXT NOT NULL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "rawJson" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CartrackDriverLinkage_cartrackDriverId_fkey" FOREIGN KEY ("cartrackDriverId") REFERENCES "CartrackDriver" ("cartrackDriverId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CartrackAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartrackFleetVehicleId" TEXT NOT NULL,
    "cartrackAlertId" TEXT NOT NULL,
    "alertType" TEXT,
    "severity" TEXT,
    "message" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "eventTime" DATETIME,
    "isAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" DATETIME,
    "rawJson" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CartrackAlert_cartrackFleetVehicleId_fkey" FOREIGN KEY ("cartrackFleetVehicleId") REFERENCES "CartrackFleetVehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CartrackFuelRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartrackFleetVehicleId" TEXT NOT NULL,
    "cartrackFuelId" TEXT NOT NULL,
    "eventTime" DATETIME,
    "litres" REAL,
    "costPerLitre" REAL,
    "totalCost" REAL,
    "odometer" REAL,
    "location" TEXT,
    "fuelType" TEXT,
    "rawJson" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CartrackFuelRecord_cartrackFleetVehicleId_fkey" FOREIGN KEY ("cartrackFleetVehicleId") REFERENCES "CartrackFleetVehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CartrackVehicleGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartrackGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "vehicleCount" INTEGER NOT NULL DEFAULT 0,
    "rawJson" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CartrackSyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "triggeredByUserId" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "recordsFetched" INTEGER NOT NULL DEFAULT 0,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsErrored" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "errorDetails" TEXT,
    "durationMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ServiceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "serviceProviderId" TEXT,
    "serviceTypeConfigId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "description" TEXT NOT NULL,
    "scheduledDate" DATETIME,
    "authorizedBy" TEXT,
    "authorizedAt" DATETIME,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "returnedAt" DATETIME,
    "driverId" TEXT,
    "laborCost" REAL,
    "partsCost" REAL,
    "additionalCharges" REAL,
    "vatAmount" REAL,
    "totalCostExclVat" REAL,
    "totalCostInclVat" REAL,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "invoiceNumber" TEXT,
    "invoiceDate" DATETIME,
    "paymentMethod" TEXT,
    "isWarrantyClaim" BOOLEAN NOT NULL DEFAULT false,
    "kilometersAtService" INTEGER,
    "conditionBefore" TEXT,
    "conditionAfter" TEXT,
    "technicianNotes" TEXT,
    "internalNotes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServiceRecord_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "ServiceProvider" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceRecord_serviceTypeConfigId_fkey" FOREIGN KEY ("serviceTypeConfigId") REFERENCES "ServiceTypeConfig" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServiceRecord_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceRecord_authorizedBy_fkey" FOREIGN KEY ("authorizedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceRecord_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ServiceRecord" ("additionalCharges", "approvedAt", "approvedBy", "authorizedAt", "authorizedBy", "completedAt", "conditionAfter", "conditionBefore", "createdAt", "createdBy", "currency", "description", "driverId", "id", "internalNotes", "invoiceDate", "invoiceNumber", "isWarrantyClaim", "kilometersAtService", "laborCost", "partsCost", "paymentMethod", "returnedAt", "scheduledDate", "serviceProviderId", "serviceTypeConfigId", "startedAt", "status", "technicianNotes", "totalCostExclVat", "totalCostInclVat", "updatedAt", "vatAmount", "vehicleId") SELECT "additionalCharges", "approvedAt", "approvedBy", "authorizedAt", "authorizedBy", "completedAt", "conditionAfter", "conditionBefore", "createdAt", "createdBy", "currency", "description", "driverId", "id", "internalNotes", "invoiceDate", "invoiceNumber", "isWarrantyClaim", "kilometersAtService", "laborCost", "partsCost", "paymentMethod", "returnedAt", "scheduledDate", "serviceProviderId", "serviceTypeConfigId", "startedAt", "status", "technicianNotes", "totalCostExclVat", "totalCostInclVat", "updatedAt", "vatAmount", "vehicleId" FROM "ServiceRecord";
DROP TABLE "ServiceRecord";
ALTER TABLE "new_ServiceRecord" RENAME TO "ServiceRecord";
CREATE INDEX "ServiceRecord_vehicleId_idx" ON "ServiceRecord"("vehicleId");
CREATE INDEX "ServiceRecord_serviceProviderId_idx" ON "ServiceRecord"("serviceProviderId");
CREATE INDEX "ServiceRecord_driverId_idx" ON "ServiceRecord"("driverId");
CREATE INDEX "ServiceRecord_serviceTypeConfigId_idx" ON "ServiceRecord"("serviceTypeConfigId");
CREATE INDEX "ServiceRecord_authorizedBy_idx" ON "ServiceRecord"("authorizedBy");
CREATE INDEX "ServiceRecord_approvedBy_idx" ON "ServiceRecord"("approvedBy");
CREATE INDEX "ServiceRecord_createdBy_idx" ON "ServiceRecord"("createdBy");
CREATE TABLE "new_Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vin" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentKilometers" INTEGER NOT NULL DEFAULT 0,
    "fuelType" TEXT NOT NULL,
    "purchaseDate" DATETIME,
    "purchasePrice" REAL,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "fleetNumber" TEXT,
    "leaseCompany" TEXT,
    "leaseAgreementNo" TEXT,
    "leaseStartDate" DATETIME,
    "leaseEndDate" DATETIME,
    "monthlyLeaseCost" REAL,
    "currentBookValue" REAL,
    "insuranceProvider" TEXT,
    "insurancePolicyNo" TEXT,
    "coverageType" TEXT,
    "policyStartDate" DATETIME,
    "policyExpiryDate" DATETIME,
    "premiumAmount" REAL,
    "registrationExpiry" DATETIME,
    "warrantyExpiry" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Vehicle" ("color", "coverageType", "createdAt", "currency", "currentBookValue", "currentKilometers", "fleetNumber", "fuelType", "id", "insurancePolicyNo", "insuranceProvider", "leaseAgreementNo", "leaseCompany", "leaseEndDate", "leaseStartDate", "licensePlate", "make", "model", "monthlyLeaseCost", "notes", "policyExpiryDate", "policyStartDate", "premiumAmount", "purchaseDate", "purchasePrice", "registrationExpiry", "status", "updatedAt", "vin", "warrantyExpiry", "year") SELECT "color", "coverageType", "createdAt", "currency", "currentBookValue", "currentKilometers", "fleetNumber", "fuelType", "id", "insurancePolicyNo", "insuranceProvider", "leaseAgreementNo", "leaseCompany", "leaseEndDate", "leaseStartDate", "licensePlate", "make", "model", "monthlyLeaseCost", "notes", "policyExpiryDate", "policyStartDate", "premiumAmount", "purchaseDate", "purchasePrice", "registrationExpiry", "status", "updatedAt", "vin", "warrantyExpiry", "year" FROM "Vehicle";
DROP TABLE "Vehicle";
ALTER TABLE "new_Vehicle" RENAME TO "Vehicle";
CREATE UNIQUE INDEX "Vehicle_vin_key" ON "Vehicle"("vin");
CREATE UNIQUE INDEX "Vehicle_licensePlate_key" ON "Vehicle"("licensePlate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

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
