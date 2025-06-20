
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const login = async (input: LoginInput): Promise<User> => {
  try {
    // Find user by email
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (results.length === 0) {
      throw new Error('User not found');
    }

    const user = results[0];
    
    // Return user data (no password field to worry about in this system)
    return user;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};
