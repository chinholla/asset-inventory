
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assetsTable, assetHistoryTable, usersTable } from '../db/schema';
import { type CreateAssetInput, type CreateUserInput, type UpdateAssetStatusInput } from '../schema';
import { deleteAsset } from '../handlers/delete_asset';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User',
  role: 'admin'
};

const testAsset: CreateAssetInput = {
  name: 'Test Laptop',
  category: 'laptop',
  serial_number: 'TEST123',
  model: 'MacBook Pro',
  brand: 'Apple',
  purchase_date: new Date('2023-01-15'),
  purchase_price: 2500.00,
  status: 'available',
  notes: 'Test laptop for deletion'
};

describe('deleteAsset', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an asset successfully', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        name: testUser.name,
        role: testUser.role
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create an asset
    const assetResult = await db.insert(assetsTable)
      .values({
        name: testAsset.name,
        category: testAsset.category,
        serial_number: testAsset.serial_number,
        model: testAsset.model,
        brand: testAsset.brand,
        purchase_date: testAsset.purchase_date,
        purchase_price: testAsset.purchase_price?.toString(),
        status: testAsset.status,
        notes: testAsset.notes
      })
      .returning()
      .execute();
    const asset = assetResult[0];

    // Delete the asset
    const result = await deleteAsset(asset.id);

    expect(result.success).toBe(true);

    // Verify asset is deleted from database
    const deletedAssets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, asset.id))
      .execute();

    expect(deletedAssets).toHaveLength(0);
  });

  it('should delete asset and all related history records', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        name: testUser.name,
        role: testUser.role
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create an asset
    const assetResult = await db.insert(assetsTable)
      .values({
        name: testAsset.name,
        category: testAsset.category,
        serial_number: testAsset.serial_number,
        model: testAsset.model,
        brand: testAsset.brand,
        purchase_date: testAsset.purchase_date,
        purchase_price: testAsset.purchase_price?.toString(),
        status: testAsset.status,
        notes: testAsset.notes
      })
      .returning()
      .execute();
    const asset = assetResult[0];

    // Create some asset history records
    await db.insert(assetHistoryTable)
      .values([
        {
          asset_id: asset.id,
          previous_status: null,
          new_status: 'available',
          previous_user_id: null,
          new_user_id: null,
          changed_by_user_id: user.id,
          notes: 'Asset created'
        },
        {
          asset_id: asset.id,
          previous_status: 'available',
          new_status: 'allocated',
          previous_user_id: null,
          new_user_id: user.id,
          changed_by_user_id: user.id,
          notes: 'Asset allocated'
        }
      ])
      .execute();

    // Verify history records exist before deletion
    const historyBeforeDeletion = await db.select()
      .from(assetHistoryTable)
      .where(eq(assetHistoryTable.asset_id, asset.id))
      .execute();

    expect(historyBeforeDeletion).toHaveLength(2);

    // Delete the asset
    const result = await deleteAsset(asset.id);

    expect(result.success).toBe(true);

    // Verify asset is deleted
    const deletedAssets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, asset.id))
      .execute();

    expect(deletedAssets).toHaveLength(0);

    // Verify all related history records are deleted
    const historyAfterDeletion = await db.select()
      .from(assetHistoryTable)
      .where(eq(assetHistoryTable.asset_id, asset.id))
      .execute();

    expect(historyAfterDeletion).toHaveLength(0);
  });

  it('should return false when asset does not exist', async () => {
    const nonExistentId = 99999;

    const result = await deleteAsset(nonExistentId);

    expect(result.success).toBe(false);
  });

  it('should handle deletion of asset with no history records', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        name: testUser.name,
        role: testUser.role
      })
      .returning()
      .execute();

    // Create an asset without any history
    const assetResult = await db.insert(assetsTable)
      .values({
        name: testAsset.name,
        category: testAsset.category,
        serial_number: testAsset.serial_number,
        status: testAsset.status
      })
      .returning()
      .execute();
    const asset = assetResult[0];

    // Delete the asset
    const result = await deleteAsset(asset.id);

    expect(result.success).toBe(true);

    // Verify asset is deleted
    const deletedAssets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, asset.id))
      .execute();

    expect(deletedAssets).toHaveLength(0);
  });
});
