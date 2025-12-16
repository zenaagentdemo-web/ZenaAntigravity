# Getting Started with Zena AI

## ✅ Your Development Environment is Ready!

### What's Running:
- **Backend API**: http://localhost:3000
- **Frontend PWA**: http://localhost:5173
- **PostgreSQL Database**: localhost:5432 (database: `zena`)
- **Redis**: localhost:6379

### Demo Account
```
Email: demo@zena.ai
Password: DemoSecure2024!
```

## Sample Data Loaded

Your database now contains:
- **1 Demo User** (you!)
- **1 Property**: 123 Main Street, Sydney NSW 2000
- **2 Contacts**: John Smith (Buyer), Sarah Johnson (Vendor)
- **1 Deal**: Viewing stage with low risk
- **1 Task**: Send contract to buyer
- **2 Focus Threads** (you need to reply):
  - Buyer questions about building inspection
  - Buyer submitted $1.2M offer
- **2 Waiting Threads** (waiting for others):
  - Lawyer reviewing contract (3 days, medium risk)
  - Vendor deciding on offer (6 days, high risk!)

## Testing the App

1. **Visit** http://localhost:5173
2. **Log in** with demo@zena.ai / DemoSecure2024!
3. **Check Focus tab** - See the 2 threads where you need to reply
4. **Check Waiting tab** - See the 2 threads with risk flags
5. **Check Properties tab** - See your sample property
6. **Check Contacts tab** - See John and Sarah

## Configuring the LLM (Zena's Brain)

### Recommended: Claude 3.5 Sonnet

1. **Get API Key**: https://console.anthropic.com/
2. **Update `.env` file**:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```
3. **Restart the backend server**

### Alternative: OpenAI GPT-4o-mini

1. **Get API Key**: https://platform.openai.com/api-keys
2. **Update `.env` file**:
   ```bash
   # Comment out Anthropic
   # ANTHROPIC_API_KEY=...
   
   # Uncomment OpenAI
   OPENAI_API_KEY=sk-your-key-here
   OPENAI_MODEL=gpt-4o-mini
   ```
3. **Restart the backend server**

## What Works Without an LLM?

Most features work with mock data:
- ✅ Focus and Waiting lists
- ✅ Properties, Contacts, Deals
- ✅ Timeline and Tasks
- ✅ Search
- ❌ Ask Zena (needs LLM)
- ❌ AI classification (uses fallback)
- ❌ Draft generation (uses fallback)

## Next Steps

1. **Add your LLM API key** to test AI features
2. **Connect real email accounts** (requires OAuth setup)
3. **Add more sample data** or create your own
4. **Explore the UI** and test all features

## Useful Commands

```bash
# Backend
cd packages/backend
npm run dev              # Start dev server
npm run db:seed          # Re-seed database
npm run db:studio        # Open Prisma Studio (database GUI)
npm test                 # Run tests

# Frontend  
cd packages/frontend
npm run dev              # Start dev server
npm run build            # Build for production
```

## Need Help?

- Check the requirements: `.kiro/specs/zena-ai-real-estate-pwa/requirements.md`
- Check the design: `.kiro/specs/zena-ai-real-estate-pwa/design.md`
- Check the tasks: `.kiro/specs/zena-ai-real-estate-pwa/tasks.md`

Enjoy testing Zena! 🏠✨
