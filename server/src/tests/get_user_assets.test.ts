
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, assetsTable } from '../db/schema';
import { type CreateUserInput, type CreateAssetInput } from '../schema';
import { getUserAssets } from '../handlers/get_user_assets';

describe('getUserAssets', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return assets allocated to a user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        name: 'Test User',
        role: 'user'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create test asset allocated to user
    const assetResult = await db.insert(assetsTable)
      .values({
        name: 'Test Laptop',
        category: 'laptop',
        serial_number: 'TEST123',
        model: 'MacBook Pro',
        brand: 'Apple',
        purchase_price: '1500.00',
        status: 'allocated',
        allocated_to_user_id: user.id,
        notes: 'Test asset'
      })
      .returning()
      .execute();
    const asset = assetResult[0];

    const result = await getUserAssets(user.id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(asset.id);
    expect(result[0].name).toEqual('Test Laptop');
    expect(result[0].category).toEqual('laptop');
    expect(result[0].serial_number).toEqual('TEST123');
    expect(result[0].model).toEqual('MacBook Pro');
    expect(result[0].brand).toEqual('Apple');
    expect(result[0].purchase_price).toEqual(1500.00);
    expect(typeof result[0].purchase_price).toEqual('number');
    expect(result[0].status).toEqual('allocated');
    expect(result[0].allocated_to_user_id).toEqual(user.id);
    expect(result[0].notes).toEqual('Test asset');
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
    
    // Verify allocated_user is populated
    expect(result[0].allocated_user).toBeDefined();
    expect(result[0].allocated_user?.id).toEqual(user.id);
    expect(result[0].allocated_user?.email).toEqual('testuser@example.com');
    expect(result[0].allocated_user?.name).toEqual('Test User');
    expect(result[0].allocated_user?.role).toEqual('user');
  });

  it('should return empty array when user has no assets', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        name: 'Test User',
        role: 'user'
      })
      .returning()
      .execute();
    const user = userResult[0];

    const result = await getUserAssets(user.id);

    expect(result).toHaveLength(0);
  });

  it('should return multiple assets for a user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        name: 'Test User',
        role: 'user'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create multiple test assets
    await db.insert(assetsTable)
      .values([
        {
          name: 'Test Laptop',
          category: 'laptop',
          serial_number: 'TEST123',
          status: 'allocated',
          allocated_to_user_id: user.id
        },
        {
          name: 'Test Mouse',
          category: 'mouse',
          serial_number: 'MOUSE456',
          status: 'allocated',
          allocated_to_user_id: user.id
        }
      ])
      .execute();

    const result = await getUserAssets(user.id);

    expect(result).toHaveLength(2);
    expect(result.find(asset => asset.name === 'Test Laptop')).toBeDefined();
    expect(result.find(asset => asset.name === 'Test Mouse')).toBeDefined();
    
    // Verify all assets have allocated_user populated
    result.forEach(asset => {
      expect(asset.allocated_user).toBeDefined();
      expect(asset.allocated_user?.id).toEqual(user.id);
    });
  });

  it('should handle null purchase_price correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        name: 'Test User',
        role: 'user'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create test asset with null purchase_price
    await db.insert(assetsTable)
      .values({
        name: 'Test Asset',
        category: 'other',
        serial_number: 'TEST789',
        status: 'allocated',
        allocated_to_user_id: user.id,
        purchase_price: null
      })
      .execute();

    const result = await getUserAssets(user.id);

    expect(result).toHaveLength(1);
    expect(result[0].purchase_price).toBeNull();
  });
});
