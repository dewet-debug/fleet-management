import axios from 'axios';
import prisma from '../config/database';

const A49_BASE_URL = 'http://96.9.213.186:3450/api/driver/a49';
const A49_API_KEY = 'A49mPkQzXv2Rw8Tn5LcJbYuHsGdFe7Ko3Mx1Np6Wi4Qa9Zt0BrEj';

function safeDate(val: string | null | undefined): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export async function syncDrivers(triggeredBy: string = 'MANUAL') {
  const log = await prisma.a49SyncLog.create({
    data: { syncType: 'DRIVERS', status: 'STARTED', triggeredBy },
  });
  const startTime = Date.now();

  try {
    const { data } = await axios.get(`${A49_BASE_URL}/get_drivers`, {
      params: { api_key: A49_API_KEY },
      timeout: 30000,
    });

    const entries = Object.entries(data) as [string, any][];
    let created = 0, updated = 0, errored = 0;

    for (const [externalId, driver] of entries) {
      try {
        await prisma.a49Driver.upsert({
          where: { externalId },
          create: {
            externalId,
            company: driver.company || null,
            licensePlate: driver.license_plate || null,
            vehicleType: driver.vehicle_type || null,
            vehicleStatus: driver.vehicle_status || null,
            driverFullName: driver.driver_full_name || 'Unknown',
            driverPersonalCode: driver.driver_personal_code || null,
            dateDriverAssigned: safeDate(driver.date_driver_assigned),
            driverContactNumber: driver.driver_contact_number || null,
            driverEmail: driver.driver_email || null,
            driverAddress: driver.driver_address || null,
            currentOdo: driver.current_odo ?? null,
            kmYesterday: driver.km_yesterday ?? null,
            kmMonthToDate: driver.km_month_to_date ?? null,
            rawJson: JSON.stringify(driver),
          },
          update: {
            company: driver.company || null,
            licensePlate: driver.license_plate || null,
            vehicleType: driver.vehicle_type || null,
            vehicleStatus: driver.vehicle_status || null,
            driverFullName: driver.driver_full_name || 'Unknown',
            driverPersonalCode: driver.driver_personal_code || null,
            dateDriverAssigned: safeDate(driver.date_driver_assigned),
            driverContactNumber: driver.driver_contact_number || null,
            driverEmail: driver.driver_email || null,
            driverAddress: driver.driver_address || null,
            currentOdo: driver.current_odo ?? null,
            kmYesterday: driver.km_yesterday ?? null,
            kmMonthToDate: driver.km_month_to_date ?? null,
            rawJson: JSON.stringify(driver),
            fetchedAt: new Date(),
          },
        });
        // Check if it was created or updated by looking at createdAt vs updatedAt
        const record = await prisma.a49Driver.findUnique({ where: { externalId } });
        if (record && Math.abs(record.createdAt.getTime() - record.updatedAt.getTime()) < 1000) {
          created++;
        } else {
          updated++;
        }
      } catch {
        errored++;
      }
    }

    const durationMs = Date.now() - startTime;
    await prisma.a49SyncLog.update({
      where: { id: log.id },
      data: {
        status: errored > 0 ? 'PARTIAL' : 'COMPLETED',
        completedAt: new Date(),
        recordsFetched: entries.length,
        recordsCreated: created,
        recordsUpdated: updated,
        recordsErrored: errored,
        durationMs,
      },
    });

    return { status: 'success', fetched: entries.length, created, updated, errored, durationMs };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    await prisma.a49SyncLog.update({
      where: { id: log.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage: error.message || 'Unknown error',
        durationMs,
      },
    });
    throw error;
  }
}

export async function syncJobCards(triggeredBy: string = 'MANUAL') {
  const log = await prisma.a49SyncLog.create({
    data: { syncType: 'JOB_CARDS', status: 'STARTED', triggeredBy },
  });
  const startTime = Date.now();

  try {
    const { data } = await axios.get(`${A49_BASE_URL}/get_job_cards`, {
      params: { api_key: A49_API_KEY },
      timeout: 30000,
    });

    const jobCards = Array.isArray(data) ? data : [];
    let created = 0, updated = 0, errored = 0;

    for (const jc of jobCards) {
      try {
        await prisma.a49JobCard.upsert({
          where: { jobCardNumber: jc.job_card_number },
          create: {
            jobCardNumber: jc.job_card_number,
            jobCardType: jc.job_card_type || null,
            jobCardStatus: jc.job_card_status || null,
            poEmailSent: safeDate(jc.po_email_sent),
            quotedTotalsExclVat: jc.quoted_totals_excl_vat ?? null,
            poTotalExclVat: jc.po_total_excl_vat ?? null,
            poNumber: jc.po_number || null,
            registrationNumber: jc.registration_number || null,
            associatedMake: jc.associated_make || null,
            associatedModel: jc.associated_model || null,
            lastRecordedOdo: jc.last_recorded_odo ?? null,
            currentOdo: jc.current_odo ?? null,
            insuranceRelated: jc.insurance_related ?? false,
            associatedMerchant: jc.associated_merchant || null,
            jobCardOpenedDate: safeDate(jc.job_card_opened_date),
            bookedInDate: safeDate(jc.booked_in_date_asset_at_repairer),
            dateQuoteSubmitted: safeDate(jc.date_quote_submitted),
            poApprovedDate: safeDate(jc.po_approved_date),
            dateRepairStarted: safeDate(jc.date_repair_started),
            dateRepairCompleted: safeDate(jc.date_repair_completed),
            jobCardClosedDate: safeDate(jc.job_card_closed_date),
            repairEtaDate: safeDate(jc.repair_eta_date),
            finalInspectionDate: safeDate(jc.final_inspection_date),
            daysJobCardBookedIn: jc.days_job_card_is_booked_in_for ?? null,
            daysQuoteSubmitted: jc.days_quote_submitted ?? null,
            daysPoApproved: jc.days_po_approved ?? null,
            daysPoSent: jc.days_po_sent ?? null,
            daysInRepair: jc.days_in_spent_in_repair ?? null,
            daysSinceOpenedToClose: jc.days_since_opened_to_close ?? null,
            totalOemPartPriceExclVat: jc.total_oem_part_price_excl_vat ?? null,
            totalLabourHoursExclVat: jc.total_labour_hours_excl_vat ?? null,
            totalLabourCostPerHourExclVat: jc.total_labour_cost_per_hour_excl_vat ?? null,
            totalStripAssembleHoursExclVat: jc.total_strip_and_assemble_hours_excl_vat ?? null,
            totalApprovedOemPartPriceExclVat: jc.total_approved_oem_part_price_excl_vat ?? null,
            totalApprovedLabourHoursExclVat: jc.total_approved_labour_hours_excl_vat ?? null,
            totalApprovedLabourCostPerHourExclVat: jc.total_approved_labour_cost_per_hour_excl_vat ?? null,
            totalApprovedStripAssembleHoursExclVat: jc.total_approved_strip_and_assemble_hours_excl_vat ?? null,
            rawJson: JSON.stringify(jc),
          },
          update: {
            jobCardType: jc.job_card_type || null,
            jobCardStatus: jc.job_card_status || null,
            poEmailSent: safeDate(jc.po_email_sent),
            quotedTotalsExclVat: jc.quoted_totals_excl_vat ?? null,
            poTotalExclVat: jc.po_total_excl_vat ?? null,
            poNumber: jc.po_number || null,
            registrationNumber: jc.registration_number || null,
            associatedMake: jc.associated_make || null,
            associatedModel: jc.associated_model || null,
            lastRecordedOdo: jc.last_recorded_odo ?? null,
            currentOdo: jc.current_odo ?? null,
            insuranceRelated: jc.insurance_related ?? false,
            associatedMerchant: jc.associated_merchant || null,
            jobCardOpenedDate: safeDate(jc.job_card_opened_date),
            bookedInDate: safeDate(jc.booked_in_date_asset_at_repairer),
            dateQuoteSubmitted: safeDate(jc.date_quote_submitted),
            poApprovedDate: safeDate(jc.po_approved_date),
            dateRepairStarted: safeDate(jc.date_repair_started),
            dateRepairCompleted: safeDate(jc.date_repair_completed),
            jobCardClosedDate: safeDate(jc.job_card_closed_date),
            repairEtaDate: safeDate(jc.repair_eta_date),
            finalInspectionDate: safeDate(jc.final_inspection_date),
            daysJobCardBookedIn: jc.days_job_card_is_booked_in_for ?? null,
            daysQuoteSubmitted: jc.days_quote_submitted ?? null,
            daysPoApproved: jc.days_po_approved ?? null,
            daysPoSent: jc.days_po_sent ?? null,
            daysInRepair: jc.days_in_spent_in_repair ?? null,
            daysSinceOpenedToClose: jc.days_since_opened_to_close ?? null,
            totalOemPartPriceExclVat: jc.total_oem_part_price_excl_vat ?? null,
            totalLabourHoursExclVat: jc.total_labour_hours_excl_vat ?? null,
            totalLabourCostPerHourExclVat: jc.total_labour_cost_per_hour_excl_vat ?? null,
            totalStripAssembleHoursExclVat: jc.total_strip_and_assemble_hours_excl_vat ?? null,
            totalApprovedOemPartPriceExclVat: jc.total_approved_oem_part_price_excl_vat ?? null,
            totalApprovedLabourHoursExclVat: jc.total_approved_labour_hours_excl_vat ?? null,
            totalApprovedLabourCostPerHourExclVat: jc.total_approved_labour_cost_per_hour_excl_vat ?? null,
            totalApprovedStripAssembleHoursExclVat: jc.total_approved_strip_and_assemble_hours_excl_vat ?? null,
            rawJson: JSON.stringify(jc),
            fetchedAt: new Date(),
          },
        });

        const record = await prisma.a49JobCard.findUnique({ where: { jobCardNumber: jc.job_card_number } });
        if (record && Math.abs(record.createdAt.getTime() - record.updatedAt.getTime()) < 1000) {
          created++;
        } else {
          updated++;
        }
      } catch {
        errored++;
      }
    }

    const durationMs = Date.now() - startTime;
    await prisma.a49SyncLog.update({
      where: { id: log.id },
      data: {
        status: errored > 0 ? 'PARTIAL' : 'COMPLETED',
        completedAt: new Date(),
        recordsFetched: jobCards.length,
        recordsCreated: created,
        recordsUpdated: updated,
        recordsErrored: errored,
        durationMs,
      },
    });

    return { status: 'success', fetched: jobCards.length, created, updated, errored, durationMs };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    await prisma.a49SyncLog.update({
      where: { id: log.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage: error.message || 'Unknown error',
        durationMs,
      },
    });
    throw error;
  }
}

export async function syncAll(triggeredBy: string = 'MANUAL') {
  const drivers = await syncDrivers(triggeredBy);
  const jobCards = await syncJobCards(triggeredBy);
  return { drivers, jobCards };
}

export async function listA49Drivers(params: {
  page: number; limit: number; search?: string;
}) {
  const { page, limit } = params;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (params.search) {
    where.OR = [
      { driverFullName: { contains: params.search } },
      { licensePlate: { contains: params.search } },
      { driverEmail: { contains: params.search } },
      { driverContactNumber: { contains: params.search } },
    ];
  }

  const [drivers, total] = await Promise.all([
    prisma.a49Driver.findMany({ where, skip, take: limit, orderBy: { driverFullName: 'asc' } }),
    prisma.a49Driver.count({ where }),
  ]);

  return {
    data: drivers,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function listA49JobCards(params: {
  page: number; limit: number; status?: string; search?: string;
}) {
  const { page, limit } = params;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (params.status) where.jobCardStatus = params.status;
  if (params.search) {
    where.OR = [
      { jobCardNumber: { contains: params.search } },
      { registrationNumber: { contains: params.search } },
      { associatedMerchant: { contains: params.search } },
    ];
  }

  const [jobCards, total] = await Promise.all([
    prisma.a49JobCard.findMany({ where, skip, take: limit, orderBy: { jobCardOpenedDate: 'desc' } }),
    prisma.a49JobCard.count({ where }),
  ]);

  return {
    data: jobCards,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function listA49SyncLogs(params: {
  page: number; limit: number; syncType?: string; status?: string;
}) {
  const { page, limit } = params;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (params.syncType) where.syncType = params.syncType;
  if (params.status) where.status = params.status;

  const [logs, total] = await Promise.all([
    prisma.a49SyncLog.findMany({ where, skip, take: limit, orderBy: { startedAt: 'desc' } }),
    prisma.a49SyncLog.count({ where }),
  ]);

  return {
    data: logs,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}
