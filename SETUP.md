# Setup Instructions

## Prerequisites Installation

Before you can run this project, you need to install the following:

### 1. Node.js and npm

Install Node.js 18 or higher from [nodejs.org](https://nodejs.org/) or using a package manager:

**macOS (using Homebrew):**
```bash
brew install node
```

**Verify installation:**
```bash
node --version  # Should show v18.x.x or higher
npm --version   # Should show 9.x.x or higher
```

### 2. PostgreSQL

Install PostgreSQL 14 or higher:

**macOS (using Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Create database:**
```bash
createdb zena
```

### 3. Redis

Install Redis for background job processing:

**macOS (using Homebrew):**
```bash
brew install redis
brew services start redis
```

## Project Setup

Once prerequisites are installed:

### 1. Install Dependencies

From the project root:
```bash
npm install
```

This will install dependencies for both frontend and backend workspaces.

### 2. Configure Environment Variables

**Frontend:**
```bash
cp packages/frontend/.env.example packages/frontend/.env
```

Edit `packages/frontend/.env` and set:
- `VITE_API_URL` - Backend API URL (default: http://localhost:3001/api)
- `VITE_WS_URL` - WebSocket URL (default: ws://localhost:3001)

**Backend:**
```bash
cp packages/backend/.env.example packages/backend/.env
```

Edit `packages/backend/.env` and configure:
- Database connection string
- JWT secrets
- OAuth credentials (Gmail, Microsoft)
- LLM API keys (OpenAI/Anthropic)
- Speech service API keys
- S3 storage credentials
- Redis URL
- Encryption key

### 3. Database Setup

The database schema will be created in a later task. For now, ensure PostgreSQL is running and the database exists.

### 4. Start Development Servers

**Option 1: Run both frontend and backend together**
```bash
npm run dev
```

**Option 2: Run separately**
```bash
# Terminal 1 - Backend (http://localhost:3001)
npm run dev --workspace=@zena/backend

# Terminal 2 - Frontend (http://localhost:5173)
npm run dev --workspace=@zena/frontend
```

### 5. Verify Setup

- Frontend: Open http://localhost:5173 in your browser
- Backend: Open http://localhost:3001/health in your browser

You should see:
- Frontend: "Zena AI Real Estate Assistant" welcome page
- Backend: `{"status":"ok","timestamp":"..."}`

## Development Workflow

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Formatting
```bash
npm run format
```

### Building for Production
```bash
npm run build
```

## Troubleshooting

### Port Already in Use

If port 3001 or 5173 is already in use:
- Change `PORT` in `packages/backend/.env`
- Update `VITE_API_URL` in `packages/frontend/.env` accordingly

### Database Connection Issues

Ensure PostgreSQL is running:
```bash
brew services list | grep postgresql
```

Test connection:
```bash
psql -d zena -c "SELECT 1"
```

### Redis Connection Issues

Ensure Redis is running:
```bash
brew services list | grep redis
```

Test connection:
```bash
redis-cli ping  # Should return "PONG"
```

## Next Steps

After completing the setup:
1. Review the requirements document at `.kiro/specs/zena-ai-real-estate-pwa/requirements.md`
2. Review the design document at `.kiro/specs/zena-ai-real-estate-pwa/design.md`
3. Follow the implementation tasks in `.kiro/specs/zena-ai-real-estate-pwa/tasks.md`
