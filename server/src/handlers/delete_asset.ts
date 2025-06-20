
import { db } from '../db';
import { assetsTable, assetHistoryTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteAsset = async (id: number): Promise<{ success: boolean }> => {
  try {
    // First delete all related asset history records
    await db.delete(assetHistoryTable)
      .where(eq(assetHistoryTable.asset_id, id))
      .execute();

    // Then delete the asset
    const result = await db.delete(assetsTable)
      .where(eq(assetsTable.id, id))
      .returning()
      .execute();

    // Return success based on whether any rows were deleted
    return { success: result.length > 0 };
  } catch (error) {
    console.error('Asset deletion failed:', error);
    throw error;
  }
};
