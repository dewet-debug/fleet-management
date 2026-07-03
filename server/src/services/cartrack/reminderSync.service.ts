import prisma from '../../config/database';
import { CartrackApiClient } from '../../lib/cartrack';

interface SyncResult {
  fetched: number;
  created: number;
  updated: number;
  errored: number;
}

export async function syncReminders(client: CartrackApiClient): Promise<SyncResult> {
  const result: SyncResult = { fetched: 0, created: 0, updated: 0, errored: 0 };

  const reminders = (await client.getFleetReminders()) as any[];
  result.fetched = reminders.length;

  for (let idx = 0; idx < reminders.length; idx++) {
    const r = reminders[idx] as any;

    const cartrackReminderId = String(
      r.reminder_id ??
        r.id ??
        `${r.registration ?? r.registration_number ?? 'v'}-${r.type ?? r.reminder_type ?? 't'}-${r.due_date ?? idx}`
    );

    try {
      const existing = await prisma.cartrackReminder.findUnique({
        where: { cartrackReminderId },
      });

      const dueRaw = r.due_date ?? r.due;

      const reminderData = {
        registrationNumber: r.registration ?? r.registration_number ?? null,
        reminderType: r.reminder_type ?? r.type ?? null,
        title: r.title ?? r.description ?? null,
        dueDate: dueRaw ? new Date(dueRaw) : null,
        status: r.status ?? null,
        rawJson: JSON.stringify(r),
        fetchedAt: new Date(),
      };

      if (existing) {
        await prisma.cartrackReminder.update({
          where: { cartrackReminderId },
          data: reminderData,
        });
        result.updated++;
      } else {
        await prisma.cartrackReminder.create({
          data: { cartrackReminderId, ...reminderData },
        });
        result.created++;
      }
    } catch (err) {
      console.error(`[Cartrack] Error upserting reminder ${cartrackReminderId}:`, err);
      result.errored++;
    }
  }

  return result;
}
