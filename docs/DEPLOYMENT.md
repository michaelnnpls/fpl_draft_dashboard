# Bacon FPL Dashboard - Deployment Plan

## Overview
Deploy the Bacon FPL Dashboard to Google Cloud Platform using Cloud Run for both frontend and backend services.

## Prerequisites
- Google Cloud Project with billing enabled
- `gcloud` CLI installed and authenticated
- BigQuery dataset with data populated
- Service account JSON key for BigQuery access

## Critical Configuration Changes Needed

### 1. Frontend API URL Configuration

**Current Issue:** `frontend/lib/api.ts` has hardcoded localhost URL

**Solution:** Use environment variable

```typescript
// frontend/lib/api.ts - Line 1
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
```

### 2. Create Frontend Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the Next.js app
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy built assets from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "start"]
```

### 3. Create .dockerignore Files

**frontend/.dockerignore:**
```
node_modules
.next
.env
.git
README.md
```

**backend/.dockerignore:**
```
__pycache__
*.pyc
.venv
venv
.env
.git
service-account.json
```

## Deployment Steps

### Step 1: Deploy Backend to Cloud Run

```bash
# Navigate to project root
cd /Users/nano/Documents/GitHub/fpl_draft_dashboard

# Set your GCP project ID
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Build and deploy backend
cd backend
gcloud run deploy fpl-api \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars GCP_PROJECT_ID=$PROJECT_ID,BQ_DATASET_ID=fpl_draft \
  --set-secrets GOOGLE_APPLICATION_CREDENTIALS=fpl-service-account:latest

# Note the backend URL from output (e.g., https://fpl-api-xxxxx.run.app)
```

### Step 2: Create Service Account Secret

```bash
# Create secret for service account
gcloud secrets create fpl-service-account \
  --data-file=service-account.json \
  --replication-policy=automatic

# Grant Cloud Run access to the secret
gcloud secrets add-iam-policy-binding fpl-service-account \
  --member=serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

### Step 3: Deploy Frontend to Cloud Run

```bash
# Navigate to frontend directory
cd ../frontend

# Deploy frontend with backend URL
gcloud run deploy fpl-dashboard \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_API_URL=https://fpl-api-xxxxx.run.app

# Note the frontend URL from output
```

## Post-Deployment

### Update API URL in Code (Alternative to Environment Variable)

If environment variables don't work as expected, update `frontend/lib/api.ts`:

```typescript
const API_URL = 'https://fpl-api-xxxxx.run.app';
```

Then redeploy frontend.

### Verify Deployment

1. Visit the frontend URL
2. Check that all charts load correctly
3. Verify data is fetched from BigQuery

### Set Up Scheduled Data Updates

Create a Cloud Scheduler job to run data ingestion:

```bash
# Create a Cloud Run job for data ingestion
gcloud run jobs create fpl-data-ingest \
  --image gcr.io/$PROJECT_ID/fpl-data-pipeline \
  --region $REGION \
  --set-env-vars GCP_PROJECT_ID=$PROJECT_ID,BQ_DATASET_ID=fpl_draft \
  --set-secrets GOOGLE_APPLICATION_CREDENTIALS=fpl-service-account:latest

# Schedule it to run daily
gcloud scheduler jobs create http fpl-daily-update \
  --location $REGION \
  --schedule="0 2 * * *" \
  --uri="https://fpl-api-xxxxx.run.app/refresh-data" \
  --http-method=POST
```

## Troubleshooting

### Backend Issues
- Check logs: `gcloud run logs read fpl-api --region $REGION`
- Verify service account has BigQuery permissions
- Ensure environment variables are set correctly

### Frontend Issues
- Check logs: `gcloud run logs read fpl-dashboard --region $REGION`
- Verify NEXT_PUBLIC_API_URL is set correctly
- Check CORS settings if API calls fail

### CORS Configuration

If you encounter CORS issues, update `backend/main.py`:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://fpl-dashboard-xxxxx.run.app"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Cost Optimization

- Cloud Run charges only for actual usage
- Set minimum instances to 0 for cost savings
- Consider using Cloud Run's CPU throttling for idle services

## Security Recommendations

1. Enable Cloud Armor for DDoS protection
2. Set up Cloud IAP for authentication if dashboard should be private
3. Rotate service account keys regularly
4. Use Secret Manager for all sensitive data

## Monitoring

Set up monitoring in Google Cloud Console:
- Cloud Run metrics dashboard
- BigQuery query costs
- Error rate alerts
- Response time monitoring
