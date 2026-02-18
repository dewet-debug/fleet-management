import prisma from '../../config/database';
import { CartrackApiClient, CartrackVehicleGroupResponse } from '../../lib/cartrack';

interface SyncResult {
  fetched: number;
  created: number;
  updated: number;
  errored: number;
}

export async function syncVehicleGroups(client: CartrackApiClient): Promise<SyncResult> {
  const result: SyncResult = { fetched: 0, created: 0, updated: 0, errored: 0 };

  const groups = await client.getVehicleGroups() as CartrackVehicleGroupResponse[];
  result.fetched = groups.length;

  for (const group of groups) {
    const groupId = String(group.group_id);

    try {
      const existing = await prisma.cartrackVehicleGroup.findUnique({
        where: { cartrackGroupId: groupId },
      });

      const groupData = {
        name: group.name,
        description: group.description ?? null,
        vehicleCount: group.vehicle_count ?? 0,
        rawJson: JSON.stringify(group),
        fetchedAt: new Date(),
      };

      if (existing) {
        await prisma.cartrackVehicleGroup.update({
          where: { cartrackGroupId: groupId },
          data: groupData,
        });
        result.updated++;
      } else {
        await prisma.cartrackVehicleGroup.create({
          data: { cartrackGroupId: groupId, ...groupData },
        });
        result.created++;
      }
    } catch (err) {
      console.error(`[Cartrack] Error upserting vehicle group ${groupId}:`, err);
      result.errored++;
    }
  }

  return result;
}
