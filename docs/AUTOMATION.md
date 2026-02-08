# Automated Data Pipeline - Implementation Plan

## Goal
Automate the FPL data ingestion pipeline to run daily without manual intervention using Google Cloud Scheduler.

## Option 1: Backend Endpoint + Cloud Scheduler (Simplest)

### Step 1: Add Refresh Endpoint to Backend

Add this to `backend/main.py`:

```python
@app.post("/refresh-data")
async def refresh_data():
    """Trigger data pipeline refresh"""
    import subprocess
    import os
    
    # Run the data pipeline script
    result = subprocess.run(
        ["python", "../data_pipeline/ingest.py"],
        capture_output=True,
        text=True
    )
    
    if result.returncode == 0:
        return {"status": "success", "message": "Data refreshed successfully"}
    else:
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {result.stderr}")
```

### Step 2: Deploy Updated Backend

```bash
cd backend
gcloud run deploy fpl-api --source . --region us-central1
```

### Step 3: Create Cloud Scheduler Job

```bash
gcloud scheduler jobs create http fpl-daily-refresh \
  --location=us-central1 \
  --schedule="0 2 * * *" \
  --uri="https://fpl-api-rnamha534q-uc.a.run.app/refresh-data" \
  --http-method=POST \
  --time-zone="America/New_York"
```

**Schedule**: Runs at 2 AM daily (adjust timezone as needed)

---

## Option 2: Cloud Run Job (More Robust)

### Step 1: Create Dockerfile for Data Pipeline

Create `data_pipeline/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "ingest.py"]
```

### Step 2: Deploy as Cloud Run Job

```bash
cd data_pipeline
gcloud run jobs create fpl-data-ingest \
  --image gcr.io/fpl-draft-app-486711/data-pipeline \
  --region us-central1 \
  --set-env-vars GCP_PROJECT_ID=fpl-draft-app-486711,BQ_DATASET_ID=fpl_draft_data \
  --max-retries 3 \
  --task-timeout 10m
```

### Step 3: Schedule with Cloud Scheduler

```bash
gcloud scheduler jobs create http fpl-daily-ingest \
  --location=us-central1 \
  --schedule="0 2 * * *" \
  --uri="https://us-central1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/fpl-draft-app-486711/jobs/fpl-data-ingest:run" \
  --http-method=POST \
  --oauth-service-account-email=PROJECT_NUMBER-compute@developer.gserviceaccount.com
```

---

## Option 3: GitHub Actions (If Using GitHub)

Create `.github/workflows/daily-refresh.yml`:

```yaml
name: Daily FPL Data Refresh

on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM daily
  workflow_dispatch:  # Manual trigger

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd data_pipeline
          pip install -r requirements.txt
      
      - name: Run data pipeline
        env:
          GCP_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
          BQ_DATASET_ID: fpl_draft_data
          GOOGLE_APPLICATION_CREDENTIALS: ${{ secrets.GCP_SA_KEY }}
        run: |
          cd data_pipeline
          python ingest.py
```

---

## Recommendation

**Use Option 1** (Backend Endpoint + Cloud Scheduler) because:
- ✅ Simplest to set up
- ✅ No additional infrastructure
- ✅ Easy to test manually (just POST to endpoint)
- ✅ Minimal cost (Cloud Scheduler is free for first 3 jobs)

## Cost

- **Cloud Scheduler**: FREE (first 3 jobs)
- **Cloud Run execution**: ~$0.01 per run (well within free tier)
- **Total**: ~$0/month

## Testing

After setup, test manually:
```bash
curl -X POST https://fpl-api-rnamha534q-uc.a.run.app/refresh-data
```

## Monitoring

View scheduler logs:
```bash
gcloud scheduler jobs describe fpl-daily-refresh --location=us-central1
```
