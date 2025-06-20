
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, assetsTable, assetHistoryTable } from '../db/schema';
import { type UpdateAssetStatusInput, type CreateUserInput, type CreateAssetInput } from '../schema';
import { updateAssetStatus } from '../handlers/update_asset_status';
import { eq } from 'drizzle-orm';

// Test users
const testUser1: CreateUserInput = {
  email: 'user1@example.com',
  name: 'Test User 1',
  role: 'user'
};

const testUser2: CreateUserInput = {
  email: 'user2@example.com',
  name: 'Test User 2',
  role: 'user'
};

const adminUser: CreateUserInput = {
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin'
};

// Test asset
const testAsset: CreateAssetInput = {
  name: 'Test Laptop',
  category: 'laptop',
  serial_number: 'TEST123',
  model: 'ThinkPad X1',
  brand: 'Lenovo',
  purchase_price: 1500.00,
  status: 'available',
  notes: 'Test asset for status updates'
};

describe('updateAssetStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update asset status from available to allocated', async () => {
    // Create prerequisite data
    const users = await db.insert(usersTable)
      .values([testUser1, adminUser])
      .returning()
      .execute();

    const user = users[0];
    const admin = users[1];

    const assets = await db.insert(assetsTable)
      .values({
        ...testAsset,
        purchase_price: testAsset.purchase_price?.toString()
      })
      .returning()
      .execute();

    const asset = assets[0];

    const input: UpdateAssetStatusInput = {
      asset_id: asset.id,
      new_status: 'allocated',
      allocated_to_user_id: user.id,
      changed_by_user_id: admin.id,
      notes: 'Allocating laptop to user'
    };

    const result = await updateAssetStatus(input);

    // Verify asset update
    expect(result.id).toEqual(asset.id);
    expect(result.status).toEqual('allocated');
    expect(result.allocated_to_user_id).toEqual(user.id);
    expect(result.allocated_user).toBeDefined();
    expect(result.allocated_user!.id).toEqual(user.id);
    expect(result.allocated_user!.name).toEqual('Test User 1');
    expect(typeof result.purchase_price).toEqual('number');
    expect(result.purchase_price).toEqual(1500.00);
  });

  it('should update asset status from allocated to available', async () => {
    // Create prerequisite data
    const users = await db.insert(usersTable)
      .values([testUser1, adminUser])
      .returning()
      .execute();

    const user = users[0];
    const admin = users[1];

    const assets = await db.insert(assetsTable)
      .values({
        ...testAsset,
        status: 'allocated',
        allocated_to_user_id: user.id,
        purchase_price: testAsset.purchase_price?.toString()
      })
      .returning()
      .execute();

    const asset = assets[0];

    const input: UpdateAssetStatusInput = {
      asset_id: asset.id,
      new_status: 'available',
      allocated_to_user_id: null,
      changed_by_user_id: admin.id,
      notes: 'Returning laptop from user'
    };

    const result = await updateAssetStatus(input);

    // Verify asset update
    expect(result.status).toEqual('available');
    expect(result.allocated_to_user_id).toBeNull();
    expect(result.allocated_user).toBeNull();
  });

  it('should create history record when updating status', async () => {
    // Create prerequisite data
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2, adminUser])
      .returning()
      .execute();

    const user1 = users[0];
    const user2 = users[1];
    const admin = users[2];

    const assets = await db.insert(assetsTable)
      .values({
        ...testAsset,
        status: 'allocated',
        allocated_to_user_id: user1.id,
        purchase_price: testAsset.purchase_price?.toString()
      })
      .returning()
      .execute();

    const asset = assets[0];

    const input: UpdateAssetStatusInput = {
      asset_id: asset.id,
      new_status: 'allocated',
      allocated_to_user_id: user2.id,
      changed_by_user_id: admin.id,
      notes: 'Transferring laptop between users'
    };

    await updateAssetStatus(input);

    // Verify history record was created
    const history = await db.select()
      .from(assetHistoryTable)
      .where(eq(assetHistoryTable.asset_id, asset.id))
      .execute();

    expect(history).toHaveLength(1);
    expect(history[0].asset_id).toEqual(asset.id);
    expect(history[0].previous_status).toEqual('allocated');
    expect(history[0].new_status).toEqual('allocated');
    expect(history[0].previous_user_id).toEqual(user1.id);
    expect(history[0].new_user_id).toEqual(user2.id);
    expect(history[0].changed_by_user_id).toEqual(admin.id);
    expect(history[0].notes).toEqual('Transferring laptop between users');
    expect(history[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent asset', async () => {
    // Create admin user
    const users = await db.insert(usersTable)
      .values([adminUser])
      .returning()
      .execute();

    const admin = users[0];

    const input: UpdateAssetStatusInput = {
      asset_id: 999,
      new_status: 'allocated',
      changed_by_user_id: admin.id
    };

    expect(updateAssetStatus(input)).rejects.toThrow(/Asset with id 999 not found/i);
  });

  it('should throw error for non-existent changed_by_user', async () => {
    // Create asset
    const assets = await db.insert(assetsTable)
      .values({
        ...testAsset,
        purchase_price: testAsset.purchase_price?.toString()
      })
      .returning()
      .execute();

    const asset = assets[0];

    const input: UpdateAssetStatusInput = {
      asset_id: asset.id,
      new_status: 'allocated',
      changed_by_user_id: 999
    };

    expect(updateAssetStatus(input)).rejects.toThrow(/User with id 999 not found/i);
  });

  it('should throw error for non-existent allocated_to_user', async () => {
    // Create prerequisite data
    const users = await db.insert(usersTable)
      .values([adminUser])
      .returning()
      .execute();

    const admin = users[0];

    const assets = await db.insert(assetsTable)
      .values({
        ...testAsset,
        purchase_price: testAsset.purchase_price?.toString()
      })
      .returning()
      .execute();

    const asset = assets[0];

    const input: UpdateAssetStatusInput = {
      asset_id: asset.id,
      new_status: 'allocated',
      allocated_to_user_id: 999,
      changed_by_user_id: admin.id
    };

    expect(updateAssetStatus(input)).rejects.toThrow(/User with id 999 not found/i);
  });

  it('should handle status change to under-repair', async () => {
    // Create prerequisite data
    const users = await db.insert(usersTable)
      .values([testUser1, adminUser])
      .returning()
      .execute();

    const user = users[0];
    const admin = users[1];

    const assets = await db.insert(assetsTable)
      .values({
        ...testAsset,
        status: 'allocated',
        allocated_to_user_id: user.id,
        purchase_price: testAsset.purchase_price?.toString()
      })
      .returning()
      .execute();

    const asset = assets[0];

    const input: UpdateAssetStatusInput = {
      asset_id: asset.id,
      new_status: 'under-repair',
      allocated_to_user_id: null,
      changed_by_user_id: admin.id,
      notes: 'Laptop needs screen repair'
    };

    const result = await updateAssetStatus(input);

    expect(result.status).toEqual('under-repair');
    expect(result.allocated_to_user_id).toBeNull();
    expect(result.allocated_user).toBeNull();
  });
});
