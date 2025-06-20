
import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);
export const assetStatusEnum = pgEnum('asset_status', ['unallocated', 'available', 'allocated', 'under-repair', 'retired']);
export const assetCategoryEnum = pgEnum('asset_category', ['laptop', 'keyboard', 'monitor', 'mouse', 'tablet', 'phone', 'other']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull().default('user'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Assets table
export const assetsTable = pgTable('assets', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: assetCategoryEnum('category').notNull(),
  serial_number: text('serial_number').notNull().unique(),
  model: text('model'),
  brand: text('brand'),
  purchase_date: timestamp('purchase_date'),
  purchase_price: numeric('purchase_price', { precision: 10, scale: 2 }),
  status: assetStatusEnum('status').notNull().default('unallocated'),
  allocated_to_user_id: integer('allocated_to_user_id').references(() => usersTable.id),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Asset history table
export const assetHistoryTable = pgTable('asset_history', {
  id: serial('id').primaryKey(),
  asset_id: integer('asset_id').notNull().references(() => assetsTable.id),
  previous_status: assetStatusEnum('previous_status'),
  new_status: assetStatusEnum('new_status').notNull(),
  previous_user_id: integer('previous_user_id').references(() => usersTable.id),
  new_user_id: integer('new_user_id').references(() => usersTable.id),
  changed_by_user_id: integer('changed_by_user_id').notNull().references(() => usersTable.id),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  allocatedAssets: many(assetsTable),
  historyChanges: many(assetHistoryTable, { relationName: 'changedBy' }),
  previousAllocations: many(assetHistoryTable, { relationName: 'previousUser' }),
  newAllocations: many(assetHistoryTable, { relationName: 'newUser' })
}));

export const assetsRelations = relations(assetsTable, ({ one, many }) => ({
  allocatedUser: one(usersTable, {
    fields: [assetsTable.allocated_to_user_id],
    references: [usersTable.id]
  }),
  history: many(assetHistoryTable)
}));

export const assetHistoryRelations = relations(assetHistoryTable, ({ one }) => ({
  asset: one(assetsTable, {
    fields: [assetHistoryTable.asset_id],
    references: [assetsTable.id]
  }),
  previousUser: one(usersTable, {
    fields: [assetHistoryTable.previous_user_id],
    references: [usersTable.id],
    relationName: 'previousUser'
  }),
  newUser: one(usersTable, {
    fields: [assetHistoryTable.new_user_id],
    references: [usersTable.id],
    relationName: 'newUser'
  }),
  changedByUser: one(usersTable, {
    fields: [assetHistoryTable.changed_by_user_id],
    references: [usersTable.id],
    relationName: 'changedBy'
  })
}));

// Type exports
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Asset = typeof assetsTable.$inferSelect;
export type NewAsset = typeof assetsTable.$inferInsert;
export type AssetHistory = typeof assetHistoryTable.$inferSelect;
export type NewAssetHistory = typeof assetHistoryTable.$inferInsert;

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  assets: assetsTable,
  assetHistory: assetHistoryTable
};
