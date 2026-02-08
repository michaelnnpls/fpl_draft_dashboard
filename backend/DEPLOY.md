# Deploying to Google Cloud Run

## Prerequisites
- Google Cloud account with billing enabled
- `gcloud` CLI installed and authenticated
- Docker installed (optional, Cloud Run can build for you)

## Quick Deploy

From the `backend/` directory:

```bash
# 1. Set your GCP project
gcloud config set project YOUR_PROJECT_ID

# 2. Deploy to Cloud Run (builds and deploys in one command)
gcloud run deploy fpl-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GCP_PROJECT_ID=YOUR_PROJECT_ID,BQ_DATASET_ID=fpl_draft_data
```

That's it! Cloud Run will:
- Build your Docker image
- Deploy it to a managed container
- Give you a URL like: `https://fpl-api-xxxxx-uc.a.run.app`

## Environment Variables

Cloud Run needs these environment variables (set via `--set-env-vars`):
- `GCP_PROJECT_ID`: Your GCP project ID
- `BQ_DATASET_ID`: Your BigQuery dataset (default: `fpl_draft_data`)

**Note**: You don't need `GOOGLE_APPLICATION_CREDENTIALS` on Cloud Run! It automatically uses the service account attached to the Cloud Run service.

## Testing the Deployment

```bash
# Get your service URL
SERVICE_URL=$(gcloud run services describe fpl-api --region us-central1 --format 'value(status.url)')

# Test health endpoint
curl $SERVICE_URL/health

# Test standings endpoint
curl $SERVICE_URL/standings
```

## Updating the Deployment

After making code changes:

```bash
# Just run the deploy command again
gcloud run deploy fpl-api --source . --region us-central1
```

## Cost Estimate

Cloud Run pricing (as of 2024):
- **Free tier**: 2 million requests/month
- **After free tier**: ~$0.40 per million requests
- **Idle instances**: $0 (only pay when handling requests)

For a personal FPL dashboard with ~100 users checking daily:
- **Estimated cost**: $0/month (well within free tier)

## Troubleshooting

### Build Fails
```bash
# Build locally first to test
docker build -t fpl-api .
docker run -p 8080:8080 fpl-api
```

### BigQuery Permission Errors
Make sure the Cloud Run service account has BigQuery permissions:
```bash
# Get the service account email
gcloud run services describe fpl-api --region us-central1 --format 'value(spec.template.spec.serviceAccountName)'

# Grant BigQuery permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/bigquery.dataViewer"
```

## Advanced: Custom Domain

```bash
# Map a custom domain
gcloud run domain-mappings create \
  --service fpl-api \
  --domain api.yourdomain.com \
  --region us-central1
```
