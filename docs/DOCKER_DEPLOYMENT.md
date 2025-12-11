# 🐳 AlgoSheet Docker Deployment Guide

Complete guide for deploying AlgoSheet with Docker and Docker Compose.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Litestream Backup Configuration](#litestream-backup-configuration)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required

- **Docker** v20.10+ ([Install Docker](https://docs.docker.com/get-docker/))
- **Docker Compose** v2.0+ ([Install Docker Compose](https://docs.docker.com/compose/install/))
- **Gemini API Key** ([Get API Key](https://aistudio.google.com/app/apikey))

### Optional (for Litestream backup)

- **S3-compatible storage** (Cloudflare R2, AWS S3, MinIO, etc.)
  - Recommended: **Cloudflare R2** (10GB free, fast, no egress fees)

---

## Quick Start

### 1. Clone and Configure

```bash
# Navigate to project root
cd excel_project

# Copy environment template
cp .env.example .env

# Edit .env and add your GEMINI_API_KEY
nano .env  # or use your preferred editor
```

### 2. Build and Run

```bash
# Build and start all services
docker-compose up -d

# Check logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### 3. Access Services

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3100
- **Backend Health**: http://localhost:3100/health

### 4. Stop Services

```bash
# Stop services (keeps data)
docker-compose stop

# Stop and remove containers (keeps volumes)
docker-compose down

# Stop, remove containers and volumes (DELETES DATA!)
docker-compose down -v
```

---

## Environment Configuration

### Required Variables

```bash
# Gemini AI API Key (REQUIRED)
GEMINI_API_KEY=your_gemini_api_key_here
```

### Optional Variables

```bash
# Node environment (default: production)
NODE_ENV=production

# Litestream S3 Backup (optional)
LITESTREAM_BUCKET=my-bucket-name
LITESTREAM_ENDPOINT=https://account.r2.cloudflarestorage.com
LITESTREAM_REGION=auto
LITESTREAM_ACCESS_KEY_ID=your_access_key
LITESTREAM_SECRET_ACCESS_KEY=your_secret_key
```

---

## Local Development

### Development Mode

```bash
# Build images
docker-compose build

# Start with logs
docker-compose up

# Or start in background
docker-compose up -d

# Watch logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Rebuilding After Code Changes

```bash
# Rebuild specific service
docker-compose build backend
docker-compose up -d backend

# Rebuild all services
docker-compose build
docker-compose up -d
```

### Accessing Containers

```bash
# Backend shell
docker-compose exec backend sh

# Frontend shell
docker-compose exec frontend sh

# View backend logs
docker-compose logs -f backend

# View database files
docker-compose exec backend ls -lh /app/
```

---

## Production Deployment

### Coolify Deployment

[Coolify](https://coolify.io) is recommended for production deployment.

#### 1. Create New Project in Coolify

1. Go to your Coolify dashboard
2. Create new project: **algosheet**
3. Add new resource: **Docker Compose**

#### 2. Configure Git Repository

- Repository URL: `https://github.com/your-username/algosheet`
- Branch: `main`
- Build Pack: `docker-compose`

#### 3. Set Environment Variables

In Coolify dashboard, add these secrets:

```
GEMINI_API_KEY=your_actual_gemini_key
LITESTREAM_BUCKET=your_bucket_name
LITESTREAM_ENDPOINT=https://account.r2.cloudflarestorage.com
LITESTREAM_REGION=auto
LITESTREAM_ACCESS_KEY_ID=your_access_key
LITESTREAM_SECRET_ACCESS_KEY=your_secret_key
```

#### 4. Configure Domains

- **Frontend**: `algosheet.yourdomain.com`
- **Backend**: `api.algosheet.yourdomain.com`

Coolify will automatically provision SSL certificates via Let's Encrypt.

#### 5. Deploy

```bash
git push origin main
```

Coolify will automatically build and deploy your application.

### Alternative: VPS Deployment

#### 1. SSH into Your Server

```bash
ssh user@your-server.com
```

#### 2. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

#### 3. Clone Repository

```bash
git clone https://github.com/your-username/algosheet
cd algosheet
```

#### 4. Configure Environment

```bash
cp .env.example .env
nano .env  # Add your secrets
```

#### 5. Deploy

```bash
docker-compose up -d
```

#### 6. Setup Reverse Proxy (nginx)

```nginx
# /etc/nginx/sites-available/algosheet
server {
    listen 80;
    server_name algosheet.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name api.algosheet.yourdomain.com;

    location / {
        proxy_pass http://localhost:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 7. Enable SSL with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d algosheet.yourdomain.com -d api.algosheet.yourdomain.com
```

---

## Litestream Backup Configuration

Litestream provides **real-time SQLite replication** to S3-compatible storage.

### Why Litestream?

- ✅ **Continuous backup**: Replicates every 10 seconds
- ✅ **Point-in-time recovery**: Restore to any moment
- ✅ **Disaster recovery**: Automatic restore on container start
- ✅ **Cost-effective**: Uses S3-compatible storage

### Cloudflare R2 Setup (Recommended)

#### 1. Create R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2 Object Storage**
3. Create bucket: `algosheet-backup`

#### 2. Create API Token

1. Go to **R2** → **Manage R2 API Tokens**
2. Create API token with:
   - Permissions: **Read & Write**
   - Bucket: `algosheet-backup`
3. Copy **Access Key ID** and **Secret Access Key**

#### 3. Get Endpoint URL

- Format: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
- Find your Account ID in R2 dashboard URL

#### 4. Update `.env`

```bash
LITESTREAM_BUCKET=algosheet-backup
LITESTREAM_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
LITESTREAM_REGION=auto
LITESTREAM_ACCESS_KEY_ID=your_r2_access_key_id
LITESTREAM_SECRET_ACCESS_KEY=your_r2_secret_access_key
```

#### 5. Restart Backend

```bash
docker-compose restart backend
```

### AWS S3 Setup

```bash
LITESTREAM_BUCKET=algosheet-backup
LITESTREAM_ENDPOINT=https://s3.amazonaws.com
LITESTREAM_REGION=us-east-1
LITESTREAM_ACCESS_KEY_ID=your_aws_access_key_id
LITESTREAM_SECRET_ACCESS_KEY=your_aws_secret_access_key
```

### Verify Litestream is Working

```bash
# Check backend logs
docker-compose logs backend | grep -i litestream

# Should see:
# ✅ Litestream configured - Backup replication enabled
# 🔄 Starting Litestream replication...
```

### Manual Database Restore

```bash
# Enter backend container
docker-compose exec backend sh

# Restore from backup
litestream restore -config /etc/litestream.yml /app/cache.db

# Restart backend
docker-compose restart backend
```

---

## Monitoring and Maintenance

### Health Checks

```bash
# Check backend health
curl http://localhost:3100/health

# Check frontend health
curl http://localhost:3000/health

# Docker health status
docker-compose ps
```

### View Logs

```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend

# Since timestamp
docker-compose logs --since="2024-01-01T00:00:00" backend
```

### Database Maintenance

```bash
# Backup database manually (if not using Litestream)
docker-compose exec backend cp /app/cache.db /app/data/cache-backup-$(date +%Y%m%d).db

# View database size
docker-compose exec backend ls -lh /app/cache.db

# SQLite cache is auto-managed (30-day retention)
```

### Update Deployment

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# View startup logs
docker-compose logs -f
```

---

## Troubleshooting

### Backend Won't Start

**Check logs:**
```bash
docker-compose logs backend
```

**Common issues:**

1. **Missing GEMINI_API_KEY**
   ```
   Error: GEMINI_API_KEY is required
   ```
   → Add `GEMINI_API_KEY` to `.env`

2. **Port 3100 already in use**
   ```
   Error: bind: address already in use
   ```
   → Stop conflicting service: `lsof -ti:3100 | xargs kill -9`

3. **Litestream restore failed**
   ```
   WARN: No backup found, starting fresh
   ```
   → Normal on first run if no backup exists

### Frontend Build Fails

**Check logs:**
```bash
docker-compose logs frontend
```

**Common issues:**

1. **Webpack build error**
   → Check `apps/frontend/webpack.config.js` for syntax errors

2. **BACKEND_URL not set**
   → Verify `webpack.config.js` has correct `process.env.BACKEND_URL`

### Litestream Not Working

**Check logs:**
```bash
docker-compose exec backend sh
cat /etc/litestream.yml
env | grep LITESTREAM
```

**Verify configuration:**
- All `LITESTREAM_*` variables are set in `.env`
- Bucket exists and credentials are correct
- Network connectivity to S3 endpoint

**Test manually:**
```bash
docker-compose exec backend litestream version
docker-compose exec backend litestream restore -if-replica-exists -config /etc/litestream.yml /tmp/test.db
```

### Database Corruption

**Restore from Litestream backup:**
```bash
# Stop backend
docker-compose stop backend

# Remove corrupted DB
docker-compose run --rm backend rm /app/cache.db

# Restart (will auto-restore)
docker-compose up -d backend
```

### High Memory Usage

**Check memory usage:**
```bash
docker stats
```

**Optimize:**
```bash
# Limit memory in docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
```

---

## Architecture Overview

### Container Structure

```
┌─────────────────────────────────────────┐
│  Frontend Container (nginx:alpine)      │
│  - Office Add-in static files           │
│  - Port 3000 → 80                       │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  Backend Container (node:20-alpine)     │
│  - Fastify + tRPC API                   │
│  - SQLite cache (30-day retention)      │
│  - Litestream replication               │
│  - Port 3100                            │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  Litestream → S3 Backup (R2/S3)        │
│  - Real-time replication (10s interval) │
│  - Point-in-time recovery               │
│  - 30-day snapshot retention            │
└─────────────────────────────────────────┘
```

### Build Process

**Backend:**
1. Stage 1: Build TypeScript (multi-stage)
2. Stage 2: Install Litestream, copy artifacts
3. Runtime: Start with `run.sh` → Litestream → Node

**Frontend:**
1. Stage 1: Webpack production build
2. Stage 2: Nginx serve static files
3. Runtime: Nginx with custom config

---

## Security Best Practices

1. **Never commit `.env`** - Use `.env.example` as template
2. **Use secrets management** - In production, use Coolify secrets or Docker secrets
3. **Enable HTTPS** - Use reverse proxy with SSL (Caddy, nginx, Traefik)
4. **Regular backups** - Enable Litestream for automated backups
5. **Update dependencies** - Run `npm audit` and update packages regularly
6. **Limit permissions** - Run containers as non-root user (TODO: implement)
7. **Monitor logs** - Set up log aggregation (Loki, CloudWatch, etc.)

---

## Performance Tuning

### Backend Optimization

```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Frontend Optimization

- Nginx already configured with:
  - ✅ Gzip compression
  - ✅ Static asset caching (1 year)
  - ✅ Security headers

### Database Optimization

SQLite cache is automatically optimized:
- 30-day auto-cleanup
- WAL mode for better concurrency
- Indexed queries

---

## Support

**Documentation:**
- [Docker Documentation](https://docs.docker.com/)
- [Litestream Documentation](https://litestream.io/)
- [Coolify Documentation](https://coolify.io/docs/)

**Issues:**
- Create issue in GitHub repository
- Check existing issues first

---

**✅ Phase 4 Complete: Docker containerization ready for deployment!**
