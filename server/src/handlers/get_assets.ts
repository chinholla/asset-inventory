
import { db } from '../db';
import { assetsTable, usersTable } from '../db/schema';
import { type AssetWithUser } from '../schema';
import { eq } from 'drizzle-orm';

export const getAssets = async (): Promise<AssetWithUser[]> => {
  try {
    const results = await db.select()
      .from(assetsTable)
      .leftJoin(usersTable, eq(assetsTable.allocated_to_user_id, usersTable.id))
      .execute();

    return results.map(result => ({
      ...result.assets,
      purchase_price: result.assets.purchase_price ? parseFloat(result.assets.purchase_price) : null,
      allocated_user: result.users
    }));
  } catch (error) {
    console.error('Failed to get assets:', error);
    throw error;
  }
};
