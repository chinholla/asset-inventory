
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login } from '../handlers/login';

// Test user data
const testUser = {
  email: 'test@example.com',
  name: 'Test User',
  role: 'user' as const
};

const testAdmin = {
  email: 'admin@example.com', 
  name: 'Admin User',
  role: 'admin' as const
};

describe('login', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login existing user successfully', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const loginInput: LoginInput = {
      email: 'test@example.com'
    };

    const result = await login(loginInput);

    // Verify user data
    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.role).toEqual('user');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should login admin user successfully', async () => {
    // Create test admin
    await db.insert(usersTable)
      .values(testAdmin)
      .execute();

    const loginInput: LoginInput = {
      email: 'admin@example.com'
    };

    const result = await login(loginInput);

    // Verify admin data
    expect(result.email).toEqual('admin@example.com');
    expect(result.name).toEqual('Admin User');
    expect(result.role).toEqual('admin');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent user', async () => {
    const loginInput: LoginInput = {
      email: 'nonexistent@example.com'
    };

    await expect(login(loginInput)).rejects.toThrow(/user not found/i);
  });

  it('should handle case sensitive email correctly', async () => {
    // Create user with lowercase email
    await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'test@example.com'
      })
      .execute();

    // Try to login with uppercase email
    const loginInput: LoginInput = {
      email: 'TEST@EXAMPLE.COM'
    };

    // Should fail because emails are case sensitive in our system
    await expect(login(loginInput)).rejects.toThrow(/user not found/i);
  });

  it('should return user with all required fields', async () => {
    // Create user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const loginInput: LoginInput = {
      email: 'test@example.com'
    };

    const result = await login(loginInput);

    // Verify all required fields are present
    expect(typeof result.id).toBe('number');
    expect(typeof result.email).toBe('string');
    expect(typeof result.name).toBe('string');
    expect(['admin', 'user']).toContain(result.role);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});
