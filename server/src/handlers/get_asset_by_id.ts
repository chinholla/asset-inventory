
import { db } from '../db';
import { assetsTable, usersTable } from '../db/schema';
import { type AssetWithUser } from '../schema';
import { eq } from 'drizzle-orm';

export const getAssetById = async (id: number): Promise<AssetWithUser> => {
  try {
    const results = await db.select()
      .from(assetsTable)
      .leftJoin(usersTable, eq(assetsTable.allocated_to_user_id, usersTable.id))
      .where(eq(assetsTable.id, id))
      .execute();

    if (results.length === 0) {
      throw new Error(`Asset with id ${id} not found`);
    }

    const result = results[0];
    
    return {
      ...result.assets,
      purchase_price: result.assets.purchase_price ? parseFloat(result.assets.purchase_price) : null,
      allocated_user: result.users
    };
  } catch (error) {
    console.error('Get asset by id failed:', error);
    throw error;
  }
};
