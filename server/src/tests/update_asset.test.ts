
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assetsTable, usersTable } from '../db/schema';
import { type UpdateAssetInput, type CreateUserInput } from '../schema';
import { updateAsset } from '../handlers/update_asset';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User',
  role: 'user'
};

const testUser2: CreateUserInput = {
  email: 'test2@example.com',
  name: 'Test User 2',
  role: 'admin'
};

describe('updateAsset', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update basic asset fields', async () => {
    // Create test asset
    const assetResult = await db.insert(assetsTable)
      .values({
        name: 'Original Name',
        category: 'laptop',
        serial_number: 'SN001',
        model: 'Old Model',
        brand: 'Old Brand',
        status: 'unallocated'
      })
      .returning()
      .execute();

    const assetId = assetResult[0].id;

    const updateInput: UpdateAssetInput = {
      id: assetId,
      name: 'Updated Name',
      model: 'New Model',
      brand: 'New Brand',
      category: 'monitor',
      status: 'available'
    };

    const result = await updateAsset(updateInput);

    expect(result.name).toEqual('Updated Name');
    expect(result.model).toEqual('New Model');
    expect(result.brand).toEqual('New Brand');
    expect(result.category).toEqual('monitor');
    expect(result.status).toEqual('available');
    expect(result.serial_number).toEqual('SN001'); // Should remain unchanged
    expect(result.allocated_user).toBeNull();
  });

  it('should update purchase price with proper numeric conversion', async () => {
    // Create test asset
    const assetResult = await db.insert(assetsTable)
      .values({
        name: 'Test Asset',
        category: 'laptop',
        serial_number: 'SN002',
        purchase_price: '999.99',
        status: 'unallocated'
      })
      .returning()
      .execute();

    const assetId = assetResult[0].id;

    const updateInput: UpdateAssetInput = {
      id: assetId,
      purchase_price: 1299.50
    };

    const result = await updateAsset(updateInput);

    expect(result.purchase_price).toEqual(1299.50);
    expect(typeof result.purchase_price).toBe('number');

    // Verify in database
    const dbAsset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, assetId))
      .execute();

    expect(parseFloat(dbAsset[0].purchase_price!)).toEqual(1299.50);
  });

  it('should update allocated user and include user details', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test asset
    const assetResult = await db.insert(assetsTable)
      .values({
        name: 'Test Asset',
        category: 'laptop',
        serial_number: 'SN003',
        status: 'unallocated'
      })
      .returning()
      .execute();

    const assetId = assetResult[0].id;

    const updateInput: UpdateAssetInput = {
      id: assetId,
      allocated_to_user_id: userId,
      status: 'allocated'
    };

    const result = await updateAsset(updateInput);

    expect(result.allocated_to_user_id).toEqual(userId);
    expect(result.status).toEqual('allocated');
    expect(result.allocated_user).not.toBeNull();
    expect(result.allocated_user!.email).toEqual('test@example.com');
    expect(result.allocated_user!.name).toEqual('Test User');
  });

  it('should change allocated user', async () => {
    // Create test users
    const user1Result = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values(testUser2)
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create test asset allocated to user1
    const assetResult = await db.insert(assetsTable)
      .values({
        name: 'Test Asset',
        category: 'laptop',
        serial_number: 'SN004',
        allocated_to_user_id: user1Id,
        status: 'allocated'
      })
      .returning()
      .execute();

    const assetId = assetResult[0].id;

    const updateInput: UpdateAssetInput = {
      id: assetId,
      allocated_to_user_id: user2Id
    };

    const result = await updateAsset(updateInput);

    expect(result.allocated_to_user_id).toEqual(user2Id);
    expect(result.allocated_user!.email).toEqual('test2@example.com');
    expect(result.allocated_user!.name).toEqual('Test User 2');
  });

  it('should set allocated user to null', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test asset allocated to user
    const assetResult = await db.insert(assetsTable)
      .values({
        name: 'Test Asset',
        category: 'laptop',
        serial_number: 'SN005',
        allocated_to_user_id: userId,
        status: 'allocated'
      })
      .returning()
      .execute();

    const assetId = assetResult[0].id;

    const updateInput: UpdateAssetInput = {
      id: assetId,
      allocated_to_user_id: null,
      status: 'available'
    };

    const result = await updateAsset(updateInput);

    expect(result.allocated_to_user_id).toBeNull();
    expect(result.status).toEqual('available');
    expect(result.allocated_user).toBeNull();
  });

  it('should update timestamp fields', async () => {
    // Create test asset
    const assetResult = await db.insert(assetsTable)
      .values({
        name: 'Test Asset',
        category: 'laptop',
        serial_number: 'SN006',
        status: 'unallocated'
      })
      .returning()
      .execute();

    const assetId = assetResult[0].id;
    const originalUpdatedAt = assetResult[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateAssetInput = {
      id: assetId,
      purchase_date: new Date('2023-01-15')
    };

    const result = await updateAsset(updateInput);

    expect(result.purchase_date).toEqual(new Date('2023-01-15'));
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error when asset not found', async () => {
    const updateInput: UpdateAssetInput = {
      id: 999,
      name: 'Updated Name'
    };

    expect(updateAsset(updateInput)).rejects.toThrow(/asset not found/i);
  });

  it('should throw error when allocated user not found', async () => {
    // Create test asset
    const assetResult = await db.insert(assetsTable)
      .values({
        name: 'Test Asset',
        category: 'laptop',
        serial_number: 'SN007',
        status: 'unallocated'
      })
      .returning()
      .execute();

    const assetId = assetResult[0].id;

    const updateInput: UpdateAssetInput = {
      id: assetId,
      allocated_to_user_id: 999
    };

    expect(updateAsset(updateInput)).rejects.toThrow(/user not found/i);
  });

  it('should handle partial updates correctly', async () => {
    // Create test asset with all fields
    const assetResult = await db.insert(assetsTable)
      .values({
        name: 'Original Asset',
        category: 'laptop',
        serial_number: 'SN008',
        model: 'Original Model',
        brand: 'Original Brand',
        purchase_price: '999.99',
        status: 'unallocated',
        notes: 'Original notes'
      })
      .returning()
      .execute();

    const assetId = assetResult[0].id;

    // Update only name and status
    const updateInput: UpdateAssetInput = {
      id: assetId,
      name: 'Updated Asset',
      status: 'available'
    };

    const result = await updateAsset(updateInput);

    // Updated fields
    expect(result.name).toEqual('Updated Asset');
    expect(result.status).toEqual('available');

    // Unchanged fields
    expect(result.category).toEqual('laptop');
    expect(result.serial_number).toEqual('SN008');
    expect(result.model).toEqual('Original Model');
    expect(result.brand).toEqual('Original Brand');
    expect(result.purchase_price).toEqual(999.99);
    expect(result.notes).toEqual('Original notes');
  });
});
