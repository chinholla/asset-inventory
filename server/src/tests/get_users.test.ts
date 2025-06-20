
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';

const testUser1: CreateUserInput = {
  email: 'user1@example.com',
  name: 'User One',
  role: 'user'
};

const testUser2: CreateUserInput = {
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin'
};

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    
    expect(result).toEqual([]);
  });

  it('should return all users', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([testUser1, testUser2])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    // Verify first user
    const user1 = result.find(u => u.email === 'user1@example.com');
    expect(user1).toBeDefined();
    expect(user1!.name).toEqual('User One');
    expect(user1!.role).toEqual('user');
    expect(user1!.id).toBeDefined();
    expect(user1!.created_at).toBeInstanceOf(Date);
    expect(user1!.updated_at).toBeInstanceOf(Date);

    // Verify second user
    const user2 = result.find(u => u.email === 'admin@example.com');
    expect(user2).toBeDefined();
    expect(user2!.name).toEqual('Admin User');
    expect(user2!.role).toEqual('admin');
    expect(user2!.id).toBeDefined();
    expect(user2!.created_at).toBeInstanceOf(Date);
    expect(user2!.updated_at).toBeInstanceOf(Date);
  });

  it('should return users in consistent order', async () => {
    // Create multiple users
    await db.insert(usersTable)
      .values([testUser1, testUser2])
      .execute();

    const result1 = await getUsers();
    const result2 = await getUsers();

    expect(result1).toHaveLength(2);
    expect(result2).toHaveLength(2);
    
    // Results should be consistent between calls
    expect(result1[0].id).toEqual(result2[0].id);
    expect(result1[1].id).toEqual(result2[1].id);
  });
});
