/*
  Warnings:

  - You are about to drop the column `cost` on the `ServiceRecord` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "coverageType" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "currentBookValue" REAL;
ALTER TABLE "Vehicle" ADD COLUMN "fleetNumber" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "insurancePolicyNo" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "insuranceProvider" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "leaseAgreementNo" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "leaseCompany" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "leaseEndDate" DATETIME;
ALTER TABLE "Vehicle" ADD COLUMN "leaseStartDate" DATETIME;
ALTER TABLE "Vehicle" ADD COLUMN "monthlyLeaseCost" REAL;
ALTER TABLE "Vehicle" ADD COLUMN "policyExpiryDate" DATETIME;
ALTER TABLE "Vehicle" ADD COLUMN "policyStartDate" DATETIME;
ALTER TABLE "Vehicle" ADD COLUMN "premiumAmount" REAL;
ALTER TABLE "Vehicle" ADD COLUMN "registrationExpiry" DATETIME;
ALTER TABLE "Vehicle" ADD COLUMN "warrantyExpiry" DATETIME;

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
    "currency" TEXT NOT NULL DEFAULT 'USD',
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
INSERT INTO "new_ServiceRecord" ("approvedAt", "approvedBy", "authorizedAt", "authorizedBy", "completedAt", "conditionAfter", "conditionBefore", "createdAt", "createdBy", "currency", "description", "id", "internalNotes", "kilometersAtService", "returnedAt", "scheduledDate", "serviceProviderId", "serviceTypeConfigId", "startedAt", "status", "technicianNotes", "updatedAt", "vehicleId") SELECT "approvedAt", "approvedBy", "authorizedAt", "authorizedBy", "completedAt", "conditionAfter", "conditionBefore", "createdAt", "createdBy", "currency", "description", "id", "internalNotes", "kilometersAtService", "returnedAt", "scheduledDate", "serviceProviderId", "serviceTypeConfigId", "startedAt", "status", "technicianNotes", "updatedAt", "vehicleId" FROM "ServiceRecord";
DROP TABLE "ServiceRecord";
ALTER TABLE "new_ServiceRecord" RENAME TO "ServiceRecord";
CREATE INDEX "ServiceRecord_vehicleId_idx" ON "ServiceRecord"("vehicleId");
CREATE INDEX "ServiceRecord_serviceProviderId_idx" ON "ServiceRecord"("serviceProviderId");
CREATE INDEX "ServiceRecord_driverId_idx" ON "ServiceRecord"("driverId");
CREATE INDEX "ServiceRecord_serviceTypeConfigId_idx" ON "ServiceRecord"("serviceTypeConfigId");
CREATE INDEX "ServiceRecord_authorizedBy_idx" ON "ServiceRecord"("authorizedBy");
CREATE INDEX "ServiceRecord_approvedBy_idx" ON "ServiceRecord"("approvedBy");
CREATE INDEX "ServiceRecord_createdBy_idx" ON "ServiceRecord"("createdBy");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
