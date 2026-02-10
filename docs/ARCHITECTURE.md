# System Architecture

![Bacon FPL Dashboard Architecture](architecture_diagram.png)

## Overview

The Bacon FPL Dashboard is a fully automated Fantasy Premier League analytics platform built on Google Cloud Platform. The system fetches data from the official FPL API, processes it through BigQuery, and presents it via an interactive Next.js dashboard.

## Architecture Components

### 1. Data Source
- **FPL Official API** (`draft.premierleague.com/api`)
  - Provides player stats, gameweek data, draft picks, and league information
  - Public API, no authentication required

### 2. Google Cloud Platform

#### Cloud Scheduler
- **Purpose**: Automated daily data refresh
- **Schedule**: Every day at 2:00 AM EST
- **Action**: Triggers POST request to `/refresh-data` endpoint
- **Cost**: FREE (first 3 jobs included)

#### Cloud Run - Backend API
- **Technology**: Python 3.11 + FastAPI
- **Container**: Docker (auto-built from source)
- **Resources**: 1Gi RAM, 1 CPU, 600s timeout
- **Key Endpoints**:
  - `/refresh-data` - Triggers data pipeline execution
  - `/standings` - League standings data
  - `/momentum` - Recent performance metrics
  - `/contributions` - Player contribution analysis
  - `/draft-analysis` - Draft picks vs transfers
  - 5 more chart endpoints
- **Auto-scaling**: 0 to N instances based on traffic
- **Cost**: FREE tier (2M requests/month)

#### Data Pipeline
- **Script**: `ingest.py` (Python)
- **Function**: Fetches and loads FPL data to BigQuery
- **Execution**: Triggered by `/refresh-data` endpoint
- **Duration**: ~30-60 seconds per run
- **Data Loaded**:
  - 817 players (dim_elements)
  - 20 teams (dim_teams)
  - 90 draft picks (fact_draft_picks)
  - ~19,000 gameweek stats (fact_gameweek_live)
  - ~2,250 weekly entries (fact_entry_weekly)

#### BigQuery
- **Purpose**: Data warehouse for FPL analytics
- **Dataset**: `fpl_draft_data`
- **Tables**: 5 fact/dimension tables
- **Views**: 9 aggregated views for charts
- **Query Performance**: Sub-second for dashboard queries
- **Cost**: FREE tier (1TB queries/month, 10GB storage)

#### Cloud Run - Frontend
- **Technology**: Next.js 16 + React + TypeScript
- **Container**: Docker (multi-stage build)
- **Resources**: 512Mi RAM, 1 CPU
- **Features**:
  - 9 interactive charts (Recharts)
  - Responsive design (mobile/tablet/desktop)
  - Auto dark/light mode
  - Bacon FPL branding
- **Auto-scaling**: 0 to N instances
- **Cost**: FREE tier (2M requests/month)

### 3. User Access
- **URL**: https://fpl-dashboard-79415053265.us-central1.run.app
- **Access**: Public (no authentication)
- **Performance**: Global CDN via Cloud Run
- **HTTPS**: Automatic SSL certificate

## Data Flow

### Automated Daily Refresh (2 AM EST)
```
1. Cloud Scheduler → POST /refresh-data
2. Backend API → Execute data_pipeline/ingest.py
3. Data Pipeline → Fetch from FPL API
4. Data Pipeline → Load to BigQuery (WRITE_TRUNCATE)
5. BigQuery Views → Auto-update with new data
```

### User Dashboard Request
```
1. User → Opens dashboard in browser
2. Frontend → Requests data from Backend API
3. Backend API → Queries BigQuery views
4. BigQuery → Returns aggregated data
5. Backend API → Returns JSON to frontend
6. Frontend → Renders interactive charts
```

## Key Design Decisions

### Why Cloud Run?
- **Auto-scaling**: Scales to zero when not in use (cost savings)
- **Serverless**: No infrastructure management
- **Fast deployments**: Direct from source code
- **Global**: Automatic multi-region deployment

### Why BigQuery?
- **Performance**: Optimized for analytics queries
- **Scalability**: Handles growing data without config changes
- **Cost**: Generous free tier for small datasets
- **SQL**: Familiar query language for views

### Why Separate Frontend/Backend?
- **Flexibility**: Can update each independently
- **Security**: Backend handles credentials, frontend is public
- **Performance**: Backend caching, frontend static assets
- **Development**: Different tech stacks optimized for each role

## Cost Breakdown

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| Cloud Run (Frontend) | ~1,000 requests | $0 (free tier) |
| Cloud Run (Backend) | ~1,000 requests + 1 daily refresh | $0 (free tier) |
| BigQuery Storage | <1 GB | $0 (free tier) |
| BigQuery Queries | <10 GB scanned | $0 (free tier) |
| Cloud Scheduler | 1 job | $0 (free tier) |
| **Total** | | **$0/month** |

*Expected to remain in free tier for personal use*

## Deployment

### Manual Deployment
```bash
# Backend
cd backend
cp -r ../data_pipeline .
gcloud run deploy fpl-api --source . --region us-central1

# Frontend  
cd frontend
gcloud run deploy fpl-dashboard --source . --region us-central1
```

### Automated Deployment
```bash
./deploy.sh  # Deploys both services
```

## Monitoring

### Check Data Freshness
```sql
SELECT MAX(scraped_at) FROM `fpl-draft-app-486711.fpl_draft_data.dim_elements`
```

### View Scheduler Status
```bash
gcloud scheduler jobs describe fpl-daily-refresh --location=us-central1
```

### Check Backend Logs
```bash
gcloud run logs read fpl-api --region us-central1 --limit 50
```

## Security

- **Secrets**: Service account key stored in Secret Manager (production)
- **Environment Variables**: Injected at deployment time
- **CORS**: Configured for frontend domain
- **HTTPS**: Enforced by Cloud Run
- **Public Access**: Intentional for transparency

## Future Enhancements

- [ ] Add authentication (Cloud IAP) for private leagues
- [ ] Custom domain mapping
- [ ] Email alerts for gameweek updates
- [ ] Historical trend analysis (multi-season)
- [ ] Mobile app (React Native)
- [ ] Real-time updates during gameweeks

## Troubleshooting

### Data Not Updating
1. Check Cloud Scheduler execution history
2. View backend logs for `/refresh-data` errors
3. Manually trigger: `curl -X POST https://fpl-api-*.run.app/refresh-data`

### Dashboard Not Loading
1. Check frontend deployment status
2. Verify backend API is responding
3. Check browser console for errors

### Charts Showing Old Data
1. Verify BigQuery data is current
2. Clear browser cache
3. Check backend is querying correct dataset

---

**Last Updated**: February 10, 2026  
**System Status**: ✅ Production Ready  
**Automation**: ✅ Enabled (Daily at 2 AM EST)
