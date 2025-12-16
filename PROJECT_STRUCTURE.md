# Project Structure

## Overview

This is a monorepo workspace containing the Zena AI Real Estate Assistant application.

```
zena-ai-real-estate/
├── .kiro/                          # Kiro spec files
│   └── specs/
│       └── zena-ai-real-estate-pwa/
│           ├── requirements.md     # Feature requirements
│           ├── design.md          # Design document
│           └── tasks.md           # Implementation tasks
│
├── packages/
│   ├── frontend/                  # React PWA
│   │   ├── src/
│   │   │   ├── components/       # React components
│   │   │   ├── hooks/            # Custom React hooks
│   │   │   ├── models/           # TypeScript types/interfaces
│   │   │   ├── services/         # API clients & service layer
│   │   │   ├── utils/            # Utility functions
│   │   │   ├── test/             # Test utilities
│   │   │   ├── App.tsx           # Root component
│   │   │   ├── main.tsx          # Entry point
│   │   │   ├── index.css         # Global styles
│   │   │   └── vite-env.d.ts     # Vite type definitions
│   │   ├── index.html            # HTML template
│   │   ├── vite.config.ts        # Vite configuration
│   │   ├── tsconfig.json         # TypeScript config
│   │   ├── package.json          # Frontend dependencies
│   │   └── .env.example          # Environment variables template
│   │
│   └── backend/                   # Node.js API
│       ├── src/
│       │   ├── config/           # Configuration files
│       │   ├── controllers/      # Route handlers
│       │   ├── middleware/       # Express middleware
│       │   ├── models/           # Database models & types
│       │   ├── routes/           # API route definitions
│       │   ├── services/         # Business logic
│       │   ├── utils/            # Utility functions
│       │   ├── test/             # Test utilities
│       │   └── index.ts          # Entry point
│       ├── vitest.config.ts      # Vitest configuration
│       ├── tsconfig.json         # TypeScript config
│       ├── package.json          # Backend dependencies
│       └── .env.example          # Environment variables template
│
├── package.json                   # Root workspace config
├── .eslintrc.json                # ESLint configuration
├── .prettierrc                   # Prettier configuration
├── .gitignore                    # Git ignore rules
├── README.md                     # Project overview
├── SETUP.md                      # Setup instructions
└── PROJECT_STRUCTURE.md          # This file
```

## Key Files

### Root Level

- **package.json**: Defines the monorepo workspace and shared dev dependencies
- **.eslintrc.json**: Shared ESLint rules for code quality
- **.prettierrc**: Code formatting configuration
- **README.md**: Project overview and quick start guide
- **SETUP.md**: Detailed setup instructions

### Frontend (packages/frontend)

- **vite.config.ts**: Vite build tool configuration with PWA plugin
- **tsconfig.json**: TypeScript compiler options for React
- **package.json**: Frontend-specific dependencies (React, Vite, etc.)
- **.env.example**: Template for environment variables (API URLs)

### Backend (packages/backend)

- **src/index.ts**: Express server setup and entry point
- **vitest.config.ts**: Test configuration
- **tsconfig.json**: TypeScript compiler options for Node.js
- **package.json**: Backend-specific dependencies (Express, PostgreSQL, etc.)
- **.env.example**: Template for environment variables (DB, APIs, secrets)

## Directory Purposes

### Frontend Directories

- **components/**: Reusable React components (buttons, forms, cards, etc.)
- **hooks/**: Custom React hooks for shared logic
- **models/**: TypeScript interfaces and types for data structures
- **services/**: API client functions and service layer
- **utils/**: Helper functions and utilities
- **test/**: Test setup and utilities

### Backend Directories

- **config/**: Configuration files and constants
- **controllers/**: Request handlers that process HTTP requests
- **middleware/**: Express middleware (auth, validation, error handling)
- **models/**: Database models and TypeScript interfaces
- **routes/**: API route definitions (URL to controller mapping)
- **services/**: Business logic layer (email sync, AI processing, etc.)
- **utils/**: Helper functions and utilities
- **test/**: Test setup and utilities

## Technology Stack

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **React Router**: Client-side routing
- **Vitest**: Testing framework
- **PWA**: Progressive Web App capabilities

### Backend
- **Node.js**: Runtime environment
- **Express**: Web framework
- **TypeScript**: Type safety
- **PostgreSQL**: Database
- **Redis**: Job queue and caching
- **WebSocket (ws)**: Real-time communication
- **Vitest**: Testing framework

## Development Commands

From the root directory:

```bash
# Install all dependencies
npm install

# Run both frontend and backend in dev mode
npm run dev

# Run tests for all packages
npm test

# Lint all code
npm run lint

# Format all code
npm run format

# Build for production
npm run build
```

From individual packages:

```bash
# Frontend only
npm run dev --workspace=@zena/frontend

# Backend only
npm run dev --workspace=@zena/backend
```

## Next Steps

1. Install prerequisites (see SETUP.md)
2. Install dependencies: `npm install`
3. Configure environment variables
4. Start development servers: `npm run dev`
5. Follow implementation tasks in `.kiro/specs/zena-ai-real-estate-pwa/tasks.md`
