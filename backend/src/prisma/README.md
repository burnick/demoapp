# Prisma Database Configuration

This directory contains the Prisma database configuration and utilities for the backend API.

## Files

- `client.ts` - Prisma client singleton with logging and connection utilities
- `seed.ts` - Database seeding script for development data
- `index.ts` - Main exports for Prisma utilities

## Usage

### Basic Usage

```typescript
import { prisma } from './prisma/client';

// Use Prisma client
const users = await prisma.user.findMany();
```

### Connection Management

```typescript
import { connectDatabase, disconnectDatabase } from './prisma/client';

// Connect to database
await connectDatabase();

// Disconnect from database
await disconnectDatabase();
```

### Health Checks

```typescript
import { checkDatabaseHealth } from './prisma/client';

const isHealthy = await checkDatabaseHealth();
```

### Transactions

```typescript
import { withTransaction } from './prisma/client';

const result = await withTransaction(async (prisma) => {
  const user = await prisma.user.create({ data: { ... } });
  // More operations...
  return user;
});
```

## Database Setup

1. Ensure PostgreSQL is running
2. Set `DATABASE_URL` in your `.env` file
3. Run migrations: `npm run db:migrate`
4. Generate Prisma client: `npm run db:generate`
5. Seed database (optional): `npm run db:seed`

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - Environment (affects logging level)

## Scripts

- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Prisma Studio