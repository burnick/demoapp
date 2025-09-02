import { join } from 'path';
import { initializeRoutes } from '../routes';
import { createAppRouter } from '../trpc/router';

describe('File-based Routing Integration', () => {
  let combinedRouter: any;

  beforeAll(async () => {
    // Initialize the file-based routing system
    const fileBasedRouter = await initializeRoutes();
    combinedRouter = createAppRouter(fileBasedRouter);
  });

  test('should create app router with file-based routes', () => {
    expect(combinedRouter).toBeDefined();
    expect(combinedRouter._def).toBeDefined();
    expect(combinedRouter._def.record).toBeDefined();
  });

  test('should have health endpoint', () => {
    const routerRecord = combinedRouter._def.record;
    expect(routerRecord.health).toBeDefined();
  });

  test('should have v1 routes', () => {
    const routerRecord = combinedRouter._def.record;
    expect(routerRecord.v1).toBeDefined();
  });

  test('should have v1 auth and user routes', () => {
    const routerRecord = combinedRouter._def.record;
    const v1Router = routerRecord.v1;
    
    expect(v1Router).toBeDefined();
    expect(v1Router._def.record.auth).toBeDefined();
    expect(v1Router._def.record.users).toBeDefined();
  });

  test('should have auth procedures', () => {
    const routerRecord = combinedRouter._def.record;
    const authRouter = routerRecord.v1._def.record.auth;
    
    expect(authRouter._def.record.login).toBeDefined();
    expect(authRouter._def.record.register).toBeDefined();
    expect(authRouter._def.record.logout).toBeDefined();
    expect(authRouter._def.record.refreshToken).toBeDefined();
  });

  test('should have user procedures', () => {
    const routerRecord = combinedRouter._def.record;
    const userRouter = routerRecord.v1._def.record.users;
    
    expect(userRouter._def.record.getUsers).toBeDefined();
    expect(userRouter._def.record.getUserById).toBeDefined();
    expect(userRouter._def.record.createUser).toBeDefined();
    expect(userRouter._def.record.updateUser).toBeDefined();
    expect(userRouter._def.record.deleteUser).toBeDefined();
    expect(userRouter._def.record.getProfile).toBeDefined();
    expect(userRouter._def.record.updateProfile).toBeDefined();
  });
});