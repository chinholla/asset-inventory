
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User',
  role: 'user'
};

// Test input for admin user
const adminInput: CreateUserInput = {
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin'
};

// Test input with default role
const defaultRoleInput: CreateUserInput = {
  email: 'user@example.com',
  name: 'Regular User',
  role: 'user' // This will be the default value after Zod parsing
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with role', async () => {
    const result = await createUser(defaultRoleInput);

    // Basic field validation
    expect(result.email).toEqual('user@example.com');
    expect(result.name).toEqual('Regular User');
    expect(result.role).toEqual('user');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a user with admin role', async () => {
    const result = await createUser(adminInput);

    // Basic field validation
    expect(result.email).toEqual('admin@example.com');
    expect(result.name).toEqual('Admin User');
    expect(result.role).toEqual('admin');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].name).toEqual('Test User');
    expect(users[0].role).toEqual('user');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should enforce unique email constraint', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create second user with same email
    const duplicateInput: CreateUserInput = {
      email: 'test@example.com',
      name: 'Another User',
      role: 'admin'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should handle different user roles correctly', async () => {
    // Create users with different roles
    const userResult = await createUser(testInput);
    const adminResult = await createUser(adminInput);

    expect(userResult.role).toEqual('user');
    expect(adminResult.role).toEqual('admin');

    // Verify both users exist in database
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(2);
    expect(allUsers.some(u => u.role === 'user')).toBe(true);
    expect(allUsers.some(u => u.role === 'admin')).toBe(true);
  });
});
