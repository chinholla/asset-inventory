
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assetsTable, usersTable } from '../db/schema';
import { type CreateUserInput, type CreateAssetInput } from '../schema';
import { getAssets } from '../handlers/get_assets';

describe('getAssets', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no assets exist', async () => {
    const result = await getAssets();
    expect(result).toEqual([]);
  });

  it('should return assets without allocated users', async () => {
    // Create test asset without allocation
    await db.insert(assetsTable).values({
      name: 'Test Laptop',
      category: 'laptop',
      serial_number: 'TEST-001',
      model: 'MacBook Pro',
      brand: 'Apple',
      purchase_price: '1299.99',
      status: 'available'
    }).execute();

    const result = await getAssets();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Test Laptop');
    expect(result[0].category).toEqual('laptop');
    expect(result[0].serial_number).toEqual('TEST-001');
    expect(result[0].model).toEqual('MacBook Pro');
    expect(result[0].brand).toEqual('Apple');
    expect(result[0].purchase_price).toEqual(1299.99);
    expect(typeof result[0].purchase_price).toEqual('number');
    expect(result[0].status).toEqual('available');
    expect(result[0].allocated_user).toBeNull();
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return assets with allocated users', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable).values({
      email: 'test@example.com',
      name: 'Test User',
      role: 'user'
    }).returning().execute();

    const user = userResult[0];

    // Create test asset allocated to user
    await db.insert(assetsTable).values({
      name: 'Allocated Laptop',
      category: 'laptop',
      serial_number: 'ALLOC-001',
      status: 'allocated',
      allocated_to_user_id: user.id,
      purchase_price: '999.50'
    }).execute();

    const result = await getAssets();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Allocated Laptop');
    expect(result[0].status).toEqual('allocated');
    expect(result[0].allocated_to_user_id).toEqual(user.id);
    expect(result[0].purchase_price).toEqual(999.50);
    expect(typeof result[0].purchase_price).toEqual('number');
    expect(result[0].allocated_user).toBeDefined();
    expect(result[0].allocated_user!.id).toEqual(user.id);
    expect(result[0].allocated_user!.email).toEqual('test@example.com');
    expect(result[0].allocated_user!.name).toEqual('Test User');
    expect(result[0].allocated_user!.role).toEqual('user');
  });

  it('should return multiple assets with mixed allocation states', async () => {
    // Create test user
    const userResult = await db.insert(usersTable).values({
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin'
    }).returning().execute();

    const user = userResult[0];

    // Create multiple assets
    await db.insert(assetsTable).values([
      {
        name: 'Unallocated Mouse',
        category: 'mouse',
        serial_number: 'MOUSE-001',
        status: 'available'
      },
      {
        name: 'Allocated Keyboard',
        category: 'keyboard',
        serial_number: 'KB-001',
        status: 'allocated',
        allocated_to_user_id: user.id,
        purchase_price: '79.99'
      },
      {
        name: 'Repair Monitor',
        category: 'monitor',
        serial_number: 'MON-001',
        status: 'under-repair',
        purchase_price: '299.00'
      }
    ]).execute();

    const result = await getAssets();

    expect(result).toHaveLength(3);

    // Find each asset by serial number
    const mouse = result.find(a => a.serial_number === 'MOUSE-001')!;
    const keyboard = result.find(a => a.serial_number === 'KB-001')!;
    const monitor = result.find(a => a.serial_number === 'MON-001')!;

    // Verify mouse (unallocated)
    expect(mouse.name).toEqual('Unallocated Mouse');
    expect(mouse.category).toEqual('mouse');
    expect(mouse.status).toEqual('available');
    expect(mouse.allocated_user).toBeNull();
    expect(mouse.purchase_price).toBeNull();

    // Verify keyboard (allocated)
    expect(keyboard.name).toEqual('Allocated Keyboard');
    expect(keyboard.category).toEqual('keyboard');
    expect(keyboard.status).toEqual('allocated');
    expect(keyboard.purchase_price).toEqual(79.99);
    expect(typeof keyboard.purchase_price).toEqual('number');
    expect(keyboard.allocated_user).toBeDefined();
    expect(keyboard.allocated_user!.email).toEqual('admin@example.com');

    // Verify monitor (under repair)
    expect(monitor.name).toEqual('Repair Monitor');
    expect(monitor.category).toEqual('monitor');
    expect(monitor.status).toEqual('under-repair');
    expect(monitor.purchase_price).toEqual(299.00);
    expect(typeof monitor.purchase_price).toEqual('number');
    expect(monitor.allocated_user).toBeNull();
  });

  it('should handle null purchase prices correctly', async () => {
    // Create asset without purchase price
    await db.insert(assetsTable).values({
      name: 'Free Asset',
      category: 'other',
      serial_number: 'FREE-001',
      status: 'available',
      purchase_price: null
    }).execute();

    const result = await getAssets();

    expect(result).toHaveLength(1);
    expect(result[0].purchase_price).toBeNull();
  });
});
