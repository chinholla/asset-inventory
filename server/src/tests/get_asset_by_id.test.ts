
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, assetsTable } from '../db/schema';
import { type CreateUserInput, type CreateAssetInput } from '../schema';
import { getAssetById } from '../handlers/get_asset_by_id';

// Test user data
const testUser: CreateUserInput = {
  email: 'john@example.com',
  name: 'John Doe',
  role: 'user'
};

// Test asset data with user allocation
const testAssetWithUser: CreateAssetInput = {
  name: 'Test Laptop',
  category: 'laptop',
  serial_number: 'LT001',
  model: 'MacBook Pro',
  brand: 'Apple',
  purchase_date: new Date('2023-01-15'),
  purchase_price: 2499.99,
  status: 'allocated',
  notes: 'Primary work laptop'
};

// Test asset data without user allocation
const testAssetWithoutUser: CreateAssetInput = {
  name: 'Test Monitor',
  category: 'monitor',
  serial_number: 'MON001',
  model: 'Studio Display',
  brand: 'Apple',
  status: 'available'
};

describe('getAssetById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get asset with allocated user', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create asset with user allocation
    const assetResult = await db.insert(assetsTable)
      .values({
        ...testAssetWithUser,
        allocated_to_user_id: userId,
        purchase_price: testAssetWithUser.purchase_price?.toString()
      })
      .returning()
      .execute();
    const assetId = assetResult[0].id;

    const result = await getAssetById(assetId);

    // Verify asset fields
    expect(result.id).toEqual(assetId);
    expect(result.name).toEqual('Test Laptop');
    expect(result.category).toEqual('laptop');
    expect(result.serial_number).toEqual('LT001');
    expect(result.model).toEqual('MacBook Pro');
    expect(result.brand).toEqual('Apple');
    expect(result.purchase_date).toBeInstanceOf(Date);
    expect(result.purchase_price).toEqual(2499.99);
    expect(typeof result.purchase_price).toBe('number');
    expect(result.status).toEqual('allocated');
    expect(result.allocated_to_user_id).toEqual(userId);
    expect(result.notes).toEqual('Primary work laptop');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify allocated user
    expect(result.allocated_user).toBeDefined();
    expect(result.allocated_user?.id).toEqual(userId);
    expect(result.allocated_user?.email).toEqual('john@example.com');
    expect(result.allocated_user?.name).toEqual('John Doe');
    expect(result.allocated_user?.role).toEqual('user');
    expect(result.allocated_user?.created_at).toBeInstanceOf(Date);
    expect(result.allocated_user?.updated_at).toBeInstanceOf(Date);
  });

  it('should get asset without allocated user', async () => {
    // Create asset without user allocation - convert purchase_price if it exists
    const insertData = {
      ...testAssetWithoutUser,
      purchase_price: testAssetWithoutUser.purchase_price?.toString() ?? null
    };

    const assetResult = await db.insert(assetsTable)
      .values(insertData)
      .returning()
      .execute();
    const assetId = assetResult[0].id;

    const result = await getAssetById(assetId);

    // Verify asset fields
    expect(result.id).toEqual(assetId);
    expect(result.name).toEqual('Test Monitor');
    expect(result.category).toEqual('monitor');
    expect(result.serial_number).toEqual('MON001');
    expect(result.model).toEqual('Studio Display');
    expect(result.brand).toEqual('Apple');
    expect(result.purchase_date).toBe(null);
    expect(result.purchase_price).toBe(null);
    expect(result.status).toEqual('available');
    expect(result.allocated_to_user_id).toBe(null);
    expect(result.notes).toBe(null);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify no allocated user
    expect(result.allocated_user).toBe(null);
  });

  it('should throw error for non-existent asset', async () => {
    await expect(getAssetById(999)).rejects.toThrow(/Asset with id 999 not found/i);
  });

  it('should handle asset with null purchase price correctly', async () => {
    // Create asset with explicitly null purchase price
    const assetResult = await db.insert(assetsTable)
      .values({
        name: 'Test Keyboard',
        category: 'keyboard',
        serial_number: 'KB001',
        status: 'available',
        purchase_price: null
      })
      .returning()
      .execute();
    const assetId = assetResult[0].id;

    const result = await getAssetById(assetId);

    expect(result.purchase_price).toBe(null);
    expect(result.name).toEqual('Test Keyboard');
    expect(result.category).toEqual('keyboard');
    expect(result.serial_number).toEqual('KB001');
    expect(result.status).toEqual('available');
  });
});
