
import { db } from '../db';
import { assetsTable, usersTable } from '../db/schema';
import { type CreateAssetInput, type AssetWithUser } from '../schema';
import { eq } from 'drizzle-orm';

export const createAsset = async (input: CreateAssetInput): Promise<AssetWithUser> => {
  try {
    // Validate that the allocated user exists if provided
    if (input.allocated_to_user_id) {
      const user = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.allocated_to_user_id))
        .execute();
      
      if (user.length === 0) {
        throw new Error('Allocated user not found');
      }
    }

    // Insert asset record
    const result = await db.insert(assetsTable)
      .values({
        name: input.name,
        category: input.category,
        serial_number: input.serial_number,
        model: input.model || null,
        brand: input.brand || null,
        purchase_date: input.purchase_date || null,
        purchase_price: input.purchase_price ? input.purchase_price.toString() : null,
        status: input.status || 'unallocated',
        allocated_to_user_id: input.allocated_to_user_id || null,
        notes: input.notes || null
      })
      .returning()
      .execute();

    const asset = result[0];

    // Get the allocated user if exists
    let allocatedUser = null;
    if (asset.allocated_to_user_id) {
      const userResult = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, asset.allocated_to_user_id))
        .execute();
      
      if (userResult.length > 0) {
        allocatedUser = userResult[0];
      }
    }

    // Convert numeric fields back to numbers and return with user
    return {
      ...asset,
      purchase_price: asset.purchase_price ? parseFloat(asset.purchase_price) : null,
      allocated_user: allocatedUser
    };
  } catch (error) {
    console.error('Asset creation failed:', error);
    throw error;
  }
};
