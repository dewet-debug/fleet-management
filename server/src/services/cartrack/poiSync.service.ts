import prisma from '../../config/database';
import { CartrackApiClient } from '../../lib/cartrack';

interface SyncResult {
  fetched: number;
  created: number;
  updated: number;
  errored: number;
}

export async function syncPois(client: CartrackApiClient): Promise<SyncResult> {
  const result: SyncResult = { fetched: 0, created: 0, updated: 0, errored: 0 };

  const pois = (await client.getPois()) as any[];
  result.fetched = pois.length;

  for (const p of pois as any[]) {
    const cartrackPoiId = String((p as any).poi_id ?? (p as any).id ?? (p as any).name);

    try {
      const existing = await prisma.cartrackPoi.findUnique({
        where: { cartrackPoiId },
      });

      const poiData = {
        name: (p as any).name ?? null,
        category: (p as any).category ?? (p as any).type ?? null,
        latitude: (p as any).latitude ?? (p as any).lat ?? null,
        longitude: (p as any).longitude ?? (p as any).lng ?? null,
        address: (p as any).address ?? null,
        rawJson: JSON.stringify(p),
        fetchedAt: new Date(),
      };

      if (existing) {
        await prisma.cartrackPoi.update({
          where: { cartrackPoiId },
          data: poiData,
        });
        result.updated++;
      } else {
        await prisma.cartrackPoi.create({
          data: { cartrackPoiId, ...poiData },
        });
        result.created++;
      }
    } catch (err) {
      console.error(`[Cartrack] Error upserting POI ${cartrackPoiId}:`, err);
      result.errored++;
    }
  }

  return result;
}
