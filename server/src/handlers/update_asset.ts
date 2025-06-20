
import { db } from '../db';
import { assetsTable, usersTable } from '../db/schema';
import { type UpdateAssetInput, type AssetWithUser } from '../schema';
import { eq } from 'drizzle-orm';

export const updateAsset = async (input: UpdateAssetInput): Promise<AssetWithUser> => {
  try {
    // Verify asset exists
    const existingAsset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, input.id))
      .execute();

    if (existingAsset.length === 0) {
      throw new Error('Asset not found');
    }

    // If allocated_to_user_id is provided, verify user exists
    if (input.allocated_to_user_id !== undefined && input.allocated_to_user_id !== null) {
      const user = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.allocated_to_user_id))
        .execute();

      if (user.length === 0) {
        throw new Error('User not found');
      }
    }

    // Prepare update values with proper numeric conversion
    const updateValues: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) updateValues.name = input.name;
    if (input.category !== undefined) updateValues.category = input.category;
    if (input.serial_number !== undefined) updateValues.serial_number = input.serial_number;
    if (input.model !== undefined) updateValues.model = input.model;
    if (input.brand !== undefined) updateValues.brand = input.brand;
    if (input.purchase_date !== undefined) updateValues.purchase_date = input.purchase_date;
    if (input.purchase_price !== undefined) {
      updateValues.purchase_price = input.purchase_price !== null ? input.purchase_price.toString() : null;
    }
    if (input.status !== undefined) updateValues.status = input.status;
    if (input.allocated_to_user_id !== undefined) updateValues.allocated_to_user_id = input.allocated_to_user_id;
    if (input.notes !== undefined) updateValues.notes = input.notes;

    // Update asset
    const result = await db.update(assetsTable)
      .set(updateValues)
      .where(eq(assetsTable.id, input.id))
      .returning()
      .execute();

    const updatedAsset = result[0];

    // Get allocated user if exists
    let allocatedUser = null;
    if (updatedAsset.allocated_to_user_id) {
      const userResult = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, updatedAsset.allocated_to_user_id))
        .execute();
      
      if (userResult.length > 0) {
        allocatedUser = userResult[0];
      }
    }

    // Convert numeric fields and return
    return {
      ...updatedAsset,
      purchase_price: updatedAsset.purchase_price ? parseFloat(updatedAsset.purchase_price) : null,
      allocated_user: allocatedUser
    };
  } catch (error) {
    console.error('Asset update failed:', error);
    throw error;
  }
};
