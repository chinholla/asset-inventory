
import { db } from '../db';
import { assetsTable, assetHistoryTable, usersTable } from '../db/schema';
import { type UpdateAssetStatusInput, type AssetWithUser } from '../schema';
import { eq } from 'drizzle-orm';

export const updateAssetStatus = async (input: UpdateAssetStatusInput): Promise<AssetWithUser> => {
  try {
    // First, get the current asset to create history record
    const currentAsset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, input.asset_id))
      .execute();

    if (currentAsset.length === 0) {
      throw new Error(`Asset with id ${input.asset_id} not found`);
    }

    const asset = currentAsset[0];

    // Verify that the user making the change exists
    const changedByUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.changed_by_user_id))
      .execute();

    if (changedByUser.length === 0) {
      throw new Error(`User with id ${input.changed_by_user_id} not found`);
    }

    // If allocating to a user, verify the user exists
    if (input.allocated_to_user_id) {
      const allocatedUser = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.allocated_to_user_id))
        .execute();

      if (allocatedUser.length === 0) {
        throw new Error(`User with id ${input.allocated_to_user_id} not found`);
      }
    }

    // Create history record
    await db.insert(assetHistoryTable)
      .values({
        asset_id: input.asset_id,
        previous_status: asset.status,
        new_status: input.new_status,
        previous_user_id: asset.allocated_to_user_id,
        new_user_id: input.allocated_to_user_id || null,
        changed_by_user_id: input.changed_by_user_id,
        notes: input.notes || null
      })
      .execute();

    // Update the asset
    const updatedAssets = await db.update(assetsTable)
      .set({
        status: input.new_status,
        allocated_to_user_id: input.allocated_to_user_id || null,
        updated_at: new Date()
      })
      .where(eq(assetsTable.id, input.asset_id))
      .returning()
      .execute();

    const updatedAsset = updatedAssets[0];

    // Get the updated asset with user information
    const assetWithUser = await db.select()
      .from(assetsTable)
      .leftJoin(usersTable, eq(assetsTable.allocated_to_user_id, usersTable.id))
      .where(eq(assetsTable.id, input.asset_id))
      .execute();

    const result = assetWithUser[0];

    return {
      ...result.assets,
      purchase_price: result.assets.purchase_price ? parseFloat(result.assets.purchase_price) : null,
      allocated_user: result.users
    };
  } catch (error) {
    console.error('Asset status update failed:', error);
    throw error;
  }
};
