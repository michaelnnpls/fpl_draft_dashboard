# Bacon FPL Dashboard - Infrastructure Cheatsheet

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                     │
│                  Project: fpl-draft-app-486711              │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐     ┌──────────────┐
│  Cloud Run   │      │  Cloud Run   │     │   BigQuery   │
│  (Frontend)  │─────▶│  (Backend)   │────▶│   Database   │
│              │      │              │     │              │
│ Next.js App  │      │ FastAPI App  │     │ fpl_draft_   │
│              │      │              │     │    data      │
└──────────────┘      └──────────────┘     └──────────────┘
        │                     │                     ▲
        │                     │                     │
        ▼                     ▼                     │
   User Browser      API Endpoints          Data Pipeline
                                            (Local/Manual)
```

## 📍 Where Everything Lives

### **Frontend Dashboard**
- **Service**: Cloud Run
- **Name**: `fpl-dashboard`
- **URL**: https://fpl-dashboard-79415053265.us-central1.run.app
- **Region**: us-central1
- **Technology**: Next.js 16 (React)
- **Container**: Node.js 20 Alpine
- **Resources**: 512Mi RAM, 1 CPU
- **Source**: `/frontend` directory

### **Backend API**
- **Service**: Cloud Run
- **Name**: `fpl-api`
- **URL**: https://fpl-api-rnamha534q-uc.a.run.app
- **Region**: us-central1
- **Technology**: FastAPI (Python)
- **Container**: Python 3.11 Slim
- **Resources**: 512Mi RAM, 1 CPU
- **Source**: `/backend` directory

### **Database**
- **Service**: BigQuery
- **Dataset**: `fpl_draft_data`
- **Location**: US (multi-region)
- **Tables**: 
  - `dim_manager_gameweek` - Player stats per gameweek
  - `fact_draft_picks` - Draft pick history
  - `dim_players` - Player metadata
  - `dim_teams` - Team metadata
  - `dim_element_types` - Position types
- **Views**: 9 aggregated views for charts

### **Data Pipeline**
- **Location**: Local machine (your Mac)
- **Script**: `/data_pipeline/ingest.py`
- **Runs**: Manually (not automated yet)
- **Function**: Fetches FPL API data → Loads to BigQuery

## 🔐 Authentication & Secrets

### **Service Account**
- **File**: `backend/service-account.json` (local only, gitignored)
- **Purpose**: Backend authenticates to BigQuery
- **Permissions**: BigQuery Data Viewer, Job User
- **In Production**: Stored in Secret Manager (not file-based)

### **Environment Variables**

**Backend:**
```bash
GCP_PROJECT_ID=fpl-draft-app-486711
BQ_DATASET_ID=fpl_draft_data
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json (local)
```

**Frontend:**
```bash
NEXT_PUBLIC_API_URL=https://fpl-api-rnamha534q-uc.a.run.app (production)
NEXT_PUBLIC_API_URL=http://localhost:8000 (local dev)
```

## 💰 Cost Breakdown

### **Current Monthly Costs: ~$0-5** (likely $0)

| Service | Pricing | Your Usage | Est. Cost |
|---------|---------|------------|-----------|
| **Cloud Run (Frontend)** | $0.00002400/vCPU-second<br>$0.00000250/GiB-second<br>First 2M requests free | Low traffic<br>512Mi RAM<br>1 vCPU | **$0** |
| **Cloud Run (Backend)** | Same as above | Low traffic<br>512Mi RAM<br>1 vCPU | **$0** |
| **BigQuery Storage** | $0.02/GB/month<br>First 10GB free | ~0.1 GB | **$0** |
| **BigQuery Queries** | $6.25/TB scanned<br>First 1TB/month free | ~1MB per page load | **$0** |
| **Cloud Build** | First 120 build-minutes/day free | Only on deployments | **$0** |
| **Networking** | $0.12/GB (egress) | Minimal | **$0-1** |

**Total: $0-5/month** (well within free tier)

### **Cost Optimization Tips**
- ✅ Min instances = 0 (scales to zero when idle)
- ✅ Small memory allocation (512Mi)
- ✅ BigQuery views (not materialized tables)
- ⚠️ If traffic increases, consider Cloud CDN

## 🔄 Data Flow

### **User Visits Dashboard**
```
1. Browser → Frontend (Cloud Run)
2. Frontend → Backend API (Cloud Run)
3. Backend → BigQuery (queries views)
4. BigQuery → Backend (returns JSON)
5. Backend → Frontend (returns JSON)
6. Frontend → Browser (renders charts)
```

### **Data Update Flow**
```
1. Run: python data_pipeline/ingest.py (local)
2. Script → FPL API (fetches latest data)
3. Script → BigQuery (uploads to tables)
4. BigQuery → Updates views automatically
5. Next dashboard visit shows new data
```

## 🛠️ What Manages What

| Component | Managed By | Update Method |
|-----------|------------|---------------|
| **Frontend Code** | You (Git) | `gcloud run deploy fpl-dashboard --source .` |
| **Backend Code** | You (Git) | `gcloud run deploy fpl-api --source .` |
| **BigQuery Schema** | You (SQL) | `bq query < create_views.sql` |
| **BigQuery Data** | Data Pipeline | `python ingest.py` |
| **Service Account** | GCP Console | Manual creation |
| **Cloud Run Config** | gcloud CLI | Deploy commands |
| **SSL Certificates** | Google (auto) | Automatic |
| **Scaling** | Cloud Run (auto) | 0 to N instances |

## 📊 Dashboard Features

| Chart | Data Source (BigQuery View) | Update Frequency |
|-------|----------------------------|------------------|
| League Standings | `agg_standings` | Manual data refresh |
| Cumulative Points | `dim_manager_gameweek` | Manual data refresh |
| Points Ahead | `agg_points_ahead` | Manual data refresh |
| Momentum (Last 4 GWs) | `agg_momentum` | Manual data refresh |
| Bench Points | `agg_bench_points` | Manual data refresh |
| Consistency | `agg_consistency` | Manual data refresh |
| Player Contributions | `agg_player_contributions` | Manual data refresh |
| Draft Analysis | `agg_draft_picks_analysis` | Manual data refresh |
| Top Transfers | `agg_top_transfers` | Manual data refresh |

## 🎨 UI/UX Features

- **Dark/Light Mode**: Auto-detects from OS settings (System Preferences → Appearance)
- **Responsive**: Works on desktop, tablet, mobile
- **Branding**: Bacon FPL logo from `frontend/public/logo.png`
- **Charts**: Recharts library (React)
- **Styling**: Tailwind CSS
- **Tooltips**: Interactive hover details on all charts

## 🔧 Local Development

### **Frontend**
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

### **Backend**
```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload
# Runs on http://localhost:8000
```

### **Data Pipeline**
```bash
cd data_pipeline
python ingest.py
# Loads data to BigQuery
```

## 🚀 Deployment Commands

### **Quick Deploy (Both Services)**
```bash
export GCP_PROJECT_ID="fpl-draft-app-486711"
./deploy.sh
```

### **Backend Only**
```bash
cd backend
gcloud run deploy fpl-api \
  --source . \
  --region us-central1 \
  --set-env-vars GCP_PROJECT_ID=fpl-draft-app-486711,BQ_DATASET_ID=fpl_draft_data
```

### **Frontend Only**
```bash
cd frontend
gcloud run deploy fpl-dashboard \
  --source . \
  --region us-central1 \
  --set-env-vars NEXT_PUBLIC_API_URL=https://fpl-api-rnamha534q-uc.a.run.app
```

## 📝 Maintenance Tasks

| Task | Frequency | Command |
|------|-----------|---------|
| Update FPL data | Weekly (during season) | `python data_pipeline/ingest.py` |
| Check costs | Monthly | GCP Console → Billing |
| Update dependencies | Quarterly | `npm update` / `pip install -U` |
| Review logs | As needed | `gcloud run services logs read [service]` |
| Redeploy code | After changes | `./deploy.sh` |

## 🔍 Monitoring & Logs

### **View Frontend Logs**
```bash
gcloud run services logs read fpl-dashboard --region us-central1 --limit 50
```

### **View Backend Logs**
```bash
gcloud run services logs read fpl-api --region us-central1 --limit 50
```

### **Check Service Status**
```bash
gcloud run services describe fpl-dashboard --region us-central1
gcloud run services describe fpl-api --region us-central1
```

### **BigQuery Query History**
GCP Console → BigQuery → Query History

## 🎯 Quick Reference URLs

| Resource | URL |
|----------|-----|
| **Live Dashboard** | https://fpl-dashboard-79415053265.us-central1.run.app |
| **Backend API** | https://fpl-api-rnamha534q-uc.a.run.app |
| **API Docs** | https://fpl-api-rnamha534q-uc.a.run.app/docs |
| **GCP Console** | https://console.cloud.google.com |
| **Cloud Run Console** | https://console.cloud.google.com/run |
| **BigQuery Console** | https://console.cloud.google.com/bigquery |

## 🆘 Troubleshooting

### **Dashboard shows error**
```bash
# Check backend API
curl https://fpl-api-rnamha534q-uc.a.run.app/standings

# Check backend logs
gcloud run services logs read fpl-api --region us-central1
```

### **Data is stale**
```bash
# Run data pipeline
cd data_pipeline
python ingest.py
```

### **Deployment fails**
```bash
# Check build logs (URL in error message)
# Common issues:
# - Node.js version mismatch → Update Dockerfile
# - Missing dependencies → Check package.json/requirements.txt
# - Environment variables → Check deploy command
```

## 📦 Project Structure

```
fpl_draft_dashboard/
├── frontend/              # Next.js dashboard
│   ├── app/              # Pages and layouts
│   ├── components/       # React components (charts)
│   ├── lib/              # API client
│   ├── public/           # Static assets (logo)
│   └── Dockerfile        # Container config
├── backend/              # FastAPI server
│   ├── main.py           # API endpoints
│   ├── requirements.txt  # Python deps
│   └── Dockerfile        # Container config
├── data_pipeline/        # Data ingestion
│   ├── ingest.py         # Main script
│   ├── create_views.sql  # BigQuery views
│   └── schema.json       # Table schemas
└── deploy.sh             # Deployment script
```

---

**Last Updated**: February 8, 2026
**Dashboard Version**: 1.0
**Total Development Time**: ~1 session
**Status**: ✅ Production Ready
