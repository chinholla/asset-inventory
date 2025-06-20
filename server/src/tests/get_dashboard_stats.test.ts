
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, assetsTable } from '../db/schema';
import { type CreateUserInput, type CreateAssetInput } from '../schema';
import { getDashboardStats } from '../handlers/get_dashboard_stats';

// Test user data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User',
  role: 'admin'
};

describe('getDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty stats when no assets exist', async () => {
    const result = await getDashboardStats();

    expect(result.total_assets).toEqual(0);
    expect(result.available_assets).toEqual(0);
    expect(result.allocated_assets).toEqual(0);
    expect(result.under_repair_assets).toEqual(0);
    expect(result.retired_assets).toEqual(0);
    expect(result.assets_by_category).toEqual([]);
  });

  it('should return correct stats with mixed assets', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        name: testUser.name,
        role: testUser.role
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test assets with different statuses and categories
    const testAssets: CreateAssetInput[] = [
      {
        name: 'Laptop 1',
        category: 'laptop',
        serial_number: 'LP001',
        status: 'available'
      },
      {
        name: 'Laptop 2',
        category: 'laptop',
        serial_number: 'LP002',
        status: 'allocated',
        allocated_to_user_id: userId
      },
      {
        name: 'Monitor 1',
        category: 'monitor',
        serial_number: 'MN001',
        status: 'under-repair'
      },
      {
        name: 'Keyboard 1',
        category: 'keyboard',
        serial_number: 'KB001',
        status: 'retired'
      },
      {
        name: 'Mouse 1',
        category: 'mouse',
        serial_number: 'MS001',
        status: 'available'
      }
    ];

    for (const asset of testAssets) {
      await db.insert(assetsTable)
        .values({
          name: asset.name,
          category: asset.category,
          serial_number: asset.serial_number,
          status: asset.status,
          allocated_to_user_id: asset.allocated_to_user_id || null
        })
        .execute();
    }

    const result = await getDashboardStats();

    // Verify total count
    expect(result.total_assets).toEqual(5);

    // Verify status counts
    expect(result.available_assets).toEqual(2);
    expect(result.allocated_assets).toEqual(1);
    expect(result.under_repair_assets).toEqual(1);
    expect(result.retired_assets).toEqual(1);

    // Verify category counts
    expect(result.assets_by_category).toHaveLength(4);
    
    const categoryMap = result.assets_by_category.reduce((acc, item) => {
      acc[item.category] = item.count;
      return acc;
    }, {} as Record<string, number>);

    expect(categoryMap['laptop']).toEqual(2);
    expect(categoryMap['monitor']).toEqual(1);
    expect(categoryMap['keyboard']).toEqual(1);
    expect(categoryMap['mouse']).toEqual(1);
  });

  it('should handle unallocated status correctly', async () => {
    // Create asset with unallocated status
    await db.insert(assetsTable)
      .values({
        name: 'Unallocated Asset',
        category: 'tablet',
        serial_number: 'TB001',
        status: 'unallocated'
      })
      .execute();

    const result = await getDashboardStats();

    expect(result.total_assets).toEqual(1);
    expect(result.available_assets).toEqual(0);
    expect(result.allocated_assets).toEqual(0);
    expect(result.under_repair_assets).toEqual(0);
    expect(result.retired_assets).toEqual(0);
    expect(result.assets_by_category).toHaveLength(1);
    expect(result.assets_by_category[0].category).toEqual('tablet');
    expect(result.assets_by_category[0].count).toEqual(1);
  });

  it('should return correct category distribution', async () => {
    // Create multiple assets of same category
    const laptopAssets = [
      { name: 'Laptop A', serial_number: 'LPA001' },
      { name: 'Laptop B', serial_number: 'LPB002' },
      { name: 'Laptop C', serial_number: 'LPC003' }
    ];

    for (const laptop of laptopAssets) {
      await db.insert(assetsTable)
        .values({
          name: laptop.name,
          category: 'laptop',
          serial_number: laptop.serial_number,
          status: 'available'
        })
        .execute();
    }

    const result = await getDashboardStats();

    expect(result.total_assets).toEqual(3);
    expect(result.available_assets).toEqual(3);
    expect(result.assets_by_category).toHaveLength(1);
    expect(result.assets_by_category[0].category).toEqual('laptop');
    expect(result.assets_by_category[0].count).toEqual(3);
  });
});
