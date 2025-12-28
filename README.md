# Zena AI Real Estate Assistant

AI-powered chief of staff for residential real estate agents. A progressive web application that connects to email accounts and calendars, automatically organizing communications into deals, people, and properties.

## Project Structure

This is a monorepo containing the frontend PWA and backend API:

```
zena-ai-real-estate/
├── packages/
│   ├── frontend/          # React PWA with Vite
│   │   ├── src/
│   │   │   ├── components/    # React components
│   │   │   ├── services/      # API clients
│   │   │   ├── models/        # TypeScript types
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   ├── utils/         # Utility functions
│   │   │   └── test/          # Test utilities
│   │   └── package.json
│   └── backend/           # Node.js API with Express
│       ├── src/
│       │   ├── models/        # Database models
│       │   ├── services/      # Business logic
│       │   ├── controllers/   # Route handlers
│       │   ├── routes/        # API routes
│       │   ├── middleware/    # Express middleware
│       │   ├── utils/         # Utility functions
│       │   ├── config/        # Configuration
│       │   └── test/          # Test utilities
│       └── package.json
└── package.json           # Root workspace config
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis (for background jobs)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Frontend
cp packages/frontend/.env.example packages/frontend/.env

# Backend
cp packages/backend/.env.example packages/backend/.env
```

3. Configure your environment variables in the `.env` files

### Development

Run both frontend and backend in development mode:
```bash
npm run dev
```

Or run them separately:
```bash
# Frontend only (http://localhost:5173)
npm run dev --workspace=@zena/frontend

# Backend only (http://localhost:3001)
npm run dev --workspace=@zena/backend
```

### Building

Build both packages:
```bash
npm run build
```

### Testing

Run tests for all packages:
```bash
npm test
```

### Linting and Formatting

```bash
# Lint all packages
npm run lint

# Format all files
npm run format
```

## Technology Stack

### Frontend
- React 18
- TypeScript
- Vite
- React Router
- Vitest (testing)
- PWA support with service workers

### Backend
- Node.js
- Express
- TypeScript
- PostgreSQL
- Redis
- WebSocket (ws)
- Vitest (testing)

## Architecture

The application follows a client-server architecture:
- **Frontend**: Mobile-first PWA with offline support
- **Backend**: RESTful API with WebSocket support for real-time updates
- **Database**: PostgreSQL for structured data
- **Queue**: Redis for background job processing
- **Storage**: S3-compatible storage for files

## License

Private - All rights reserved
