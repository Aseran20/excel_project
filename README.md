# AlgoSheet

AI-powered Excel Add-in for M&A analysis using Google Gemini API.

## 🚀 Project Structure

```
algosheet/
├── backend/                 # Node.js backend API (Fastify)
├── excel-addin-new/        # Excel Office Add-in (Office.js)
├── data/                   # Data and documentation
├── scripts/                # Build and test scripts (.bat, .ps1)
├── docs/                   # Documentation (.md files)
└── .archive/               # Archived old versions
```

## 📦 Quick Start

### Prerequisites
- Node.js 18+
- npm 8+

### Installation

```bash
# Install all dependencies (backend + addin)
npm install

# Or install individually
cd backend && npm install
cd excel-addin-new && npm install
```

### Development

```bash
# Start backend server
npm run start:backend

# Start Excel add-in (in another terminal)
npm run start:addin

# Build all workspaces
npm run build
```

## 🔧 Backend API

**Tech Stack:**
- Fastify (Node.js framework)
- Google Gemini API (gemini-2.5-flash)
- SQLite cache (7-day TTL)
- p-queue (rate limiting: 5 concurrent, 50 req/min)

**Features:**
- Web search with Google Search integration
- Structured JSON responses with schema validation
- Request caching for performance
- Two-branch configuration (web search vs strict JSON)

**Endpoints:**
- `POST /algosheet` - Main AI endpoint

See [backend/README.md](backend/README.md) for details.

## 📊 Excel Add-in

**Tech Stack:**
- Office.js Custom Functions API
- TypeScript
- Webpack
- SharedRuntime for task pane communication

**Features:**
- Custom functions: `ALGOSHEET()` and `ALGOSHEET_PARSE()`
- Queue management system with concurrency control
- Real-time progress tracking in task pane
- Request deduplication
- Error cell coloring (red for failures)
- Retry failed requests

**Queue Manager:**
- Configurable concurrency (1-10, default 5)
- Rate limiting (50 req/min)
- 90-second timeout per request
- Request deduplication (same prompt = shared promise)

See [excel-addin-new/README.md](excel-addin-new/README.md) for details.

## 📝 Documentation

- [FIX-WEB-SEARCH.md](docs/FIX-WEB-SEARCH.md) - Web search + JSON limitation fix
- [UPDATE-SDK-GEMINI.md](docs/UPDATE-SDK-GEMINI.md) - SDK update guide
- [UPDATE-VPS.md](docs/UPDATE-VPS.md) - VPS deployment instructions
- [LANCEMENT.md](docs/LANCEMENT.md) - Launch guide
- [roadmap.md](docs/roadmap.md) - Feature roadmap

## 🛠️ Scripts

See [scripts/](scripts/) directory:
- `test-api-simple.bat` - Simple API test
- `test-local.bat` - Local backend test
- `test-web-search-fix.bat` - Web search test
- `update-sdk.bat` - Update Gemini SDK
- `verifier-modele.bat` - Verify model configuration

## 🌐 Deployment

**Backend:** Hosted on VPS at `https://algosheet.auraia.ch/api/algosheet`

**Deployment process:**
```bash
# On VPS
cd /var/www/algosheet
git pull
cd backend
npm install
npm run build
pm2 restart algosheet-backend
```

## 🔐 Environment Variables

**Backend `.env`:**
```env
GEMINI_API_KEY=your_api_key_here
PORT=3100
NODE_ENV=production
```

## 📄 License

MIT License - Copyright (c) 2024

## 🤝 Contributing

This is a private project. Contact the owner for access.

---

**Last updated:** December 2024
**Version:** 1.0.0
