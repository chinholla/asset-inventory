
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, assetsTable, assetHistoryTable } from '../db/schema';
import { getAssetHistory } from '../handlers/get_asset_history';

describe('getAssetHistory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all asset history when no assetId provided', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        { email: 'admin@test.com', name: 'Admin User', role: 'admin' },
        { email: 'user1@test.com', name: 'User One', role: 'user' },
        { email: 'user2@test.com', name: 'User Two', role: 'user' }
      ])
      .returning()
      .execute();

    // Create test assets
    const assets = await db.insert(assetsTable)
      .values([
        {
          name: 'Test Laptop',
          category: 'laptop',
          serial_number: 'TL001',
          status: 'available',
          purchase_price: '999.99'
        },
        {
          name: 'Test Monitor',
          category: 'monitor',
          serial_number: 'TM001',
          status: 'allocated',
          allocated_to_user_id: users[1].id
        }
      ])
      .returning()
      .execute();

    // Create asset history entries
    await db.insert(assetHistoryTable)
      .values([
        {
          asset_id: assets[0].id,
          previous_status: null,
          new_status: 'available',
          previous_user_id: null,
          new_user_id: null,
          changed_by_user_id: users[0].id,
          notes: 'Asset created'
        },
        {
          asset_id: assets[1].id,
          previous_status: 'available',
          new_status: 'allocated',
          previous_user_id: null,
          new_user_id: users[1].id,
          changed_by_user_id: users[0].id,
          notes: 'Allocated to user'
        }
      ])
      .execute();

    const result = await getAssetHistory();

    expect(result).toHaveLength(2);
    
    // Check first history entry
    const firstEntry = result.find(h => h.asset.name === 'Test Laptop');
    expect(firstEntry).toBeDefined();
    expect(firstEntry!.previous_status).toBeNull();
    expect(firstEntry!.new_status).toEqual('available');
    expect(firstEntry!.previous_user).toBeNull();
    expect(firstEntry!.new_user).toBeNull();
    expect(firstEntry!.changed_by_user.email).toEqual('admin@test.com');
    expect(firstEntry!.asset.purchase_price).toEqual(999.99);
    expect(firstEntry!.notes).toEqual('Asset created');

    // Check second history entry
    const secondEntry = result.find(h => h.asset.name === 'Test Monitor');
    expect(secondEntry).toBeDefined();
    expect(secondEntry!.previous_status).toEqual('available');
    expect(secondEntry!.new_status).toEqual('allocated');
    expect(secondEntry!.previous_user).toBeNull();
    expect(secondEntry!.new_user!.email).toEqual('user1@test.com');
    expect(secondEntry!.changed_by_user.email).toEqual('admin@test.com');
    expect(secondEntry!.notes).toEqual('Allocated to user');
  });

  it('should return history for specific asset when assetId provided', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        { email: 'admin@test.com', name: 'Admin User', role: 'admin' },
        { email: 'user1@test.com', name: 'User One', role: 'user' }
      ])
      .returning()
      .execute();

    // Create test assets
    const assets = await db.insert(assetsTable)
      .values([
        {
          name: 'Test Laptop',
          category: 'laptop',
          serial_number: 'TL001',
          status: 'available'
        },
        {
          name: 'Test Monitor',
          category: 'monitor',
          serial_number: 'TM001',
          status: 'allocated'
        }
      ])
      .returning()
      .execute();

    // Create asset history entries for both assets
    await db.insert(assetHistoryTable)
      .values([
        {
          asset_id: assets[0].id,
          previous_status: null,
          new_status: 'available',
          previous_user_id: null,
          new_user_id: null,
          changed_by_user_id: users[0].id,
          notes: 'Laptop created'
        },
        {
          asset_id: assets[1].id,
          previous_status: null,
          new_status: 'allocated',
          previous_user_id: null,
          new_user_id: users[1].id,
          changed_by_user_id: users[0].id,
          notes: 'Monitor created and allocated'
        }
      ])
      .execute();

    const result = await getAssetHistory(assets[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].asset.name).toEqual('Test Laptop');
    expect(result[0].asset.serial_number).toEqual('TL001');
    expect(result[0].new_status).toEqual('available');
    expect(result[0].notes).toEqual('Laptop created');
  });

  it('should return empty array when no history exists for asset', async () => {
    // Create test user and asset but no history
    const users = await db.insert(usersTable)
      .values([{ email: 'admin@test.com', name: 'Admin User', role: 'admin' }])
      .returning()
      .execute();

    const assets = await db.insert(assetsTable)
      .values([{
        name: 'Test Laptop',
        category: 'laptop',
        serial_number: 'TL001',
        status: 'available'
      }])
      .returning()
      .execute();

    const result = await getAssetHistory(assets[0].id);

    expect(result).toHaveLength(0);
  });

  it('should handle user reassignment history correctly', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        { email: 'admin@test.com', name: 'Admin User', role: 'admin' },
        { email: 'user1@test.com', name: 'User One', role: 'user' },
        { email: 'user2@test.com', name: 'User Two', role: 'user' }
      ])
      .returning()
      .execute();

    // Create test asset
    const assets = await db.insert(assetsTable)
      .values([{
        name: 'Test Laptop',
        category: 'laptop',
        serial_number: 'TL001',
        status: 'allocated',
        allocated_to_user_id: users[2].id
      }])
      .returning()
      .execute();

    // Create history showing user reassignment
    await db.insert(assetHistoryTable)
      .values([
        {
          asset_id: assets[0].id,
          previous_status: 'allocated',
          new_status: 'allocated',
          previous_user_id: users[1].id,
          new_user_id: users[2].id,
          changed_by_user_id: users[0].id,
          notes: 'Reassigned from User One to User Two'
        }
      ])
      .execute();

    const result = await getAssetHistory(assets[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].previous_user!.email).toEqual('user1@test.com');
    expect(result[0].new_user!.email).toEqual('user2@test.com'); 
    expect(result[0].changed_by_user.email).toEqual('admin@test.com');
    expect(result[0].notes).toEqual('Reassigned from User One to User Two');
  });
});
