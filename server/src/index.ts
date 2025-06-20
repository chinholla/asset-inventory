
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

import { 
  createUserInputSchema, 
  loginInputSchema,
  createAssetInputSchema,
  updateAssetInputSchema,
  updateAssetStatusInputSchema
} from './schema';

import { createUser } from './handlers/create_user';
import { login } from './handlers/login';
import { getUsers } from './handlers/get_users';
import { createAsset } from './handlers/create_asset';
import { getAssets } from './handlers/get_assets';
import { getAssetById } from './handlers/get_asset_by_id';
import { getUserAssets } from './handlers/get_user_assets';
import { updateAsset } from './handlers/update_asset';
import { updateAssetStatus } from './handlers/update_asset_status';
import { deleteAsset } from './handlers/delete_asset';
import { getAssetHistory } from './handlers/get_asset_history';
import { getDashboardStats } from './handlers/get_dashboard_stats';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),

  getUsers: publicProcedure
    .query(() => getUsers()),

  // Asset routes
  createAsset: publicProcedure
    .input(createAssetInputSchema)
    .mutation(({ input }) => createAsset(input)),

  getAssets: publicProcedure
    .query(() => getAssets()),

  getAssetById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getAssetById(input.id)),

  getUserAssets: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserAssets(input.userId)),

  updateAsset: publicProcedure
    .input(updateAssetInputSchema)
    .mutation(({ input }) => updateAsset(input)),

  updateAssetStatus: publicProcedure
    .input(updateAssetStatusInputSchema)
    .mutation(({ input }) => updateAssetStatus(input)),

  deleteAsset: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteAsset(input.id)),

  // History and stats routes
  getAssetHistory: publicProcedure
    .input(z.object({ assetId: z.number().optional() }))
    .query(({ input }) => getAssetHistory(input.assetId)),

  getDashboardStats: publicProcedure
    .query(() => getDashboardStats()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
