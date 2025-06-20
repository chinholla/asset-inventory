
import { db } from '../db';
import { assetHistoryTable, assetsTable, usersTable } from '../db/schema';
import { type AssetHistoryWithDetails } from '../schema';
import { eq } from 'drizzle-orm';

export const getAssetHistory = async (assetId?: number): Promise<AssetHistoryWithDetails[]> => {
  try {
    // First get the base history data with asset and changed_by_user
    const baseQuery = db.select()
      .from(assetHistoryTable)
      .innerJoin(assetsTable, eq(assetHistoryTable.asset_id, assetsTable.id))
      .innerJoin(usersTable, eq(assetHistoryTable.changed_by_user_id, usersTable.id));

    const results = assetId !== undefined 
      ? await baseQuery.where(eq(assetHistoryTable.asset_id, assetId)).execute()
      : await baseQuery.execute();

    // Now get user information for previous and new users separately
    const historyWithUsers = await Promise.all(results.map(async (result) => {
      let previousUser = null;
      let newUser = null;

      // Fetch previous user if exists
      if (result.asset_history.previous_user_id) {
        const prevUserResult = await db.select()
          .from(usersTable)
          .where(eq(usersTable.id, result.asset_history.previous_user_id))
          .execute();
        previousUser = prevUserResult[0] || null;
      }

      // Fetch new user if exists
      if (result.asset_history.new_user_id) {
        const newUserResult = await db.select()
          .from(usersTable)
          .where(eq(usersTable.id, result.asset_history.new_user_id))
          .execute();
        newUser = newUserResult[0] || null;
      }

      return {
        id: result.asset_history.id,
        asset_id: result.asset_history.asset_id,
        previous_status: result.asset_history.previous_status,
        new_status: result.asset_history.new_status,
        previous_user_id: result.asset_history.previous_user_id,
        new_user_id: result.asset_history.new_user_id,
        changed_by_user_id: result.asset_history.changed_by_user_id,
        notes: result.asset_history.notes,
        created_at: result.asset_history.created_at,
        asset: {
          ...result.assets,
          purchase_price: result.assets.purchase_price ? parseFloat(result.assets.purchase_price) : null
        },
        previous_user: previousUser,
        new_user: newUser,
        changed_by_user: result.users
      };
    }));

    return historyWithUsers;
  } catch (error) {
    console.error('Get asset history failed:', error);
    throw error;
  }
};
