# Backend API

Modern backend API system using Node.js, TypeScript, tRPC, Zod, and Prisma.

## Features

- **Type-safe API**: Built with tRPC for end-to-end type safety
- **Runtime validation**: Zod schemas for input/output validation
- **Database ORM**: Prisma for type-safe database operations
- **OpenAPI compatible**: Automatic API documentation generation
- **File-based routing**: Organized route structure with versioning
- **Docker ready**: Containerized for easy deployment

## Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- PostgreSQL database
- Redis (optional, for caching)
- Elasticsearch (optional, for search)

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up the database**:
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000`.

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with test data

## Project Structure

```
src/
├── routes/          # API routes (file-based routing)
├── controllers/     # Request handlers
├── services/        # Business logic
├── schemas/         # Zod validation schemas
├── models/          # Data models
├── utils/           # Utility functions
├── middleware/      # Express middleware
└── server.ts        # Application entry point
```

## API Documentation

Once the server is running, API documentation will be available at:
- Interactive docs: `http://localhost:3000/docs`
- OpenAPI spec: `http://localhost:3000/api/openapi.json`

## Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Generate coverage report:
```bash
npm run test:coverage
```

## Docker

Build and run with Docker:
```bash
npm run docker:build
npm run docker:run
```

Or use docker-compose (from project root):
```bash
docker-compose up backend
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT