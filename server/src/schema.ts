
import { z } from 'zod';

// User roles enum
export const userRoleSchema = z.enum(['admin', 'user']);
export type UserRole = z.infer<typeof userRoleSchema>;

// Asset status enum
export const assetStatusSchema = z.enum(['unallocated', 'available', 'allocated', 'under-repair', 'retired']);
export type AssetStatus = z.infer<typeof assetStatusSchema>;

// Asset category enum
export const assetCategorySchema = z.enum(['laptop', 'keyboard', 'monitor', 'mouse', 'tablet', 'phone', 'other']);
export type AssetCategory = z.infer<typeof assetCategorySchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Asset schema
export const assetSchema = z.object({
  id: z.number(),
  name: z.string(),
  category: assetCategorySchema,
  serial_number: z.string(),
  model: z.string().nullable(),
  brand: z.string().nullable(),
  purchase_date: z.coerce.date().nullable(),
  purchase_price: z.number().nullable(),
  status: assetStatusSchema,
  allocated_to_user_id: z.number().nullable(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Asset = z.infer<typeof assetSchema>;

// Asset history schema
export const assetHistorySchema = z.object({
  id: z.number(),
  asset_id: z.number(),
  previous_status: assetStatusSchema.nullable(),
  new_status: assetStatusSchema,
  previous_user_id: z.number().nullable(),
  new_user_id: z.number().nullable(),
  changed_by_user_id: z.number(),
  notes: z.string().nullable(),
  created_at: z.coerce.date()
});

export type AssetHistory = z.infer<typeof assetHistorySchema>;

// Asset with user information
export const assetWithUserSchema = assetSchema.extend({
  allocated_user: userSchema.nullable()
});

export type AssetWithUser = z.infer<typeof assetWithUserSchema>;

// Asset history with user information
export const assetHistoryWithDetailsSchema = assetHistorySchema.extend({
  asset: assetSchema,
  previous_user: userSchema.nullable(),
  new_user: userSchema.nullable(),
  changed_by_user: userSchema
});

export type AssetHistoryWithDetails = z.infer<typeof assetHistoryWithDetailsSchema>;

// Input schemas for creating users
export const createUserInputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: userRoleSchema.default('user')
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Input schemas for creating assets
export const createAssetInputSchema = z.object({
  name: z.string().min(1),
  category: assetCategorySchema,
  serial_number: z.string().min(1),
  model: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  purchase_date: z.coerce.date().nullable().optional(),
  purchase_price: z.number().positive().nullable().optional(),
  status: assetStatusSchema.default('unallocated'),
  allocated_to_user_id: z.number().nullable().optional(),
  notes: z.string().nullable().optional()
});

export type CreateAssetInput = z.infer<typeof createAssetInputSchema>;

// Input schemas for updating assets
export const updateAssetInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  category: assetCategorySchema.optional(),
  serial_number: z.string().min(1).optional(),
  model: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  purchase_date: z.coerce.date().nullable().optional(),
  purchase_price: z.number().positive().nullable().optional(),
  status: assetStatusSchema.optional(),
  allocated_to_user_id: z.number().nullable().optional(),
  notes: z.string().nullable().optional()
});

export type UpdateAssetInput = z.infer<typeof updateAssetInputSchema>;

// Input schema for updating asset status
export const updateAssetStatusInputSchema = z.object({
  asset_id: z.number(),
  new_status: assetStatusSchema,
  allocated_to_user_id: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  changed_by_user_id: z.number()
});

export type UpdateAssetStatusInput = z.infer<typeof updateAssetStatusInputSchema>;

// Dashboard stats schema
export const dashboardStatsSchema = z.object({
  total_assets: z.number(),
  available_assets: z.number(),
  allocated_assets: z.number(),
  under_repair_assets: z.number(),
  retired_assets: z.number(),
  assets_by_category: z.array(z.object({
    category: assetCategorySchema,
    count: z.number()
  }))
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// Login input schema
export const loginInputSchema = z.object({
  email: z.string().email()
});

export type LoginInput = z.infer<typeof loginInputSchema>;
