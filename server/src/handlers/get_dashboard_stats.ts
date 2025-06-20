
import { db } from '../db';
import { assetsTable } from '../db/schema';
import { type DashboardStats } from '../schema';
import { eq, count, sql } from 'drizzle-orm';

export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    // Get total assets count
    const totalAssetsResult = await db.select({ count: count() })
      .from(assetsTable)
      .execute();
    const total_assets = totalAssetsResult[0].count;

    // Get assets count by status
    const statusCountsResult = await db.select({
      status: assetsTable.status,
      count: count()
    })
      .from(assetsTable)
      .groupBy(assetsTable.status)
      .execute();

    // Initialize status counts
    let available_assets = 0;
    let allocated_assets = 0;
    let under_repair_assets = 0;
    let retired_assets = 0;

    // Map status counts
    statusCountsResult.forEach(result => {
      switch (result.status) {
        case 'available':
          available_assets = result.count;
          break;
        case 'allocated':
          allocated_assets = result.count;
          break;
        case 'under-repair':
          under_repair_assets = result.count;
          break;
        case 'retired':
          retired_assets = result.count;
          break;
      }
    });

    // Get assets count by category
    const categoryCountsResult = await db.select({
      category: assetsTable.category,
      count: count()
    })
      .from(assetsTable)
      .groupBy(assetsTable.category)
      .execute();

    const assets_by_category = categoryCountsResult.map(result => ({
      category: result.category,
      count: result.count
    }));

    return {
      total_assets,
      available_assets,
      allocated_assets,
      under_repair_assets,
      retired_assets,
      assets_by_category
    };
  } catch (error) {
    console.error('Dashboard stats retrieval failed:', error);
    throw error;
  }
};
