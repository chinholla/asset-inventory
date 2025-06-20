
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assetsTable, usersTable } from '../db/schema';
import { type CreateAssetInput, type CreateUserInput } from '../schema';
import { createAsset } from '../handlers/create_asset';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User',
  role: 'user'
};

const testAssetInput: CreateAssetInput = {
  name: 'Test Laptop',
  category: 'laptop',
  serial_number: 'LP001',
  model: 'MacBook Pro',
  brand: 'Apple',
  purchase_date: new Date('2024-01-15'),
  purchase_price: 2499.99,
  status: 'available',
  notes: 'Test asset for unit testing'
};

describe('createAsset', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an asset without user allocation', async () => {
    const result = await createAsset(testAssetInput);

    // Basic field validation
    expect(result.name).toEqual('Test Laptop');
    expect(result.category).toEqual('laptop');
    expect(result.serial_number).toEqual('LP001');
    expect(result.model).toEqual('MacBook Pro');
    expect(result.brand).toEqual('Apple');
    expect(result.purchase_date).toBeInstanceOf(Date);
    expect(result.purchase_price).toEqual(2499.99);
    expect(typeof result.purchase_price).toBe('number');
    expect(result.status).toEqual('available');
    expect(result.notes).toEqual('Test asset for unit testing');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.allocated_user).toBeNull();
  });

  it('should create an asset with user allocation', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        name: testUser.name,
        role: testUser.role
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create asset with user allocation
    const assetInput: CreateAssetInput = {
      ...testAssetInput,
      status: 'allocated',
      allocated_to_user_id: user.id
    };

    const result = await createAsset(assetInput);

    expect(result.status).toEqual('allocated');
    expect(result.allocated_to_user_id).toEqual(user.id);
    expect(result.allocated_user).not.toBeNull();
    expect(result.allocated_user?.email).toEqual(testUser.email);
    expect(result.allocated_user?.name).toEqual(testUser.name);
  });

  it('should save asset to database', async () => {
    const result = await createAsset(testAssetInput);

    // Query database to verify asset was saved
    const assets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, result.id))
      .execute();

    expect(assets).toHaveLength(1);
    expect(assets[0].name).toEqual('Test Laptop');
    expect(assets[0].serial_number).toEqual('LP001');
    expect(parseFloat(assets[0].purchase_price!)).toEqual(2499.99);
    expect(assets[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle minimal input with defaults', async () => {
    const minimalInput: CreateAssetInput = {
      name: 'Minimal Asset',
      category: 'keyboard',
      serial_number: 'KB001',
      status: 'unallocated'
    };

    const result = await createAsset(minimalInput);

    expect(result.name).toEqual('Minimal Asset');
    expect(result.category).toEqual('keyboard');
    expect(result.serial_number).toEqual('KB001');
    expect(result.status).toEqual('unallocated');
    expect(result.model).toBeNull();
    expect(result.brand).toBeNull();
    expect(result.purchase_date).toBeNull();
    expect(result.purchase_price).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.allocated_to_user_id).toBeNull();
    expect(result.allocated_user).toBeNull();
  });

  it('should throw error when allocated user does not exist', async () => {
    const assetInput: CreateAssetInput = {
      ...testAssetInput,
      allocated_to_user_id: 999 // Non-existent user
    };

    await expect(createAsset(assetInput)).rejects.toThrow(/allocated user not found/i);
  });

  it('should handle null values correctly', async () => {
    const assetInput: CreateAssetInput = {
      name: 'Test Asset',
      category: 'mouse',
      serial_number: 'MS001',
      status: 'available',
      model: null,
      brand: null,
      purchase_date: null,
      purchase_price: null,
      notes: null
    };

    const result = await createAsset(assetInput);

    expect(result.model).toBeNull();
    expect(result.brand).toBeNull();
    expect(result.purchase_date).toBeNull();
    expect(result.purchase_price).toBeNull();
    expect(result.notes).toBeNull();
  });
});
