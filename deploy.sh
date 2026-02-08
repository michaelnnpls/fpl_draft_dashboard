#!/bin/bash

# Bacon FPL Dashboard - Deployment Script
# This script deploys both frontend and backend to Google Cloud Run

set -e  # Exit on error

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-your-gcp-project-id}"
REGION="${GCP_REGION:-us-central1}"
DATASET_ID="fpl_draft"

echo "🚀 Deploying Bacon FPL Dashboard to Google Cloud Run"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install it first."
    exit 1
fi

# Set project
echo "📋 Setting GCP project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com

# Deploy Backend
echo ""
echo "🔨 Deploying Backend API..."
cd backend

gcloud run deploy fpl-api \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars GCP_PROJECT_ID=$PROJECT_ID,BQ_DATASET_ID=$DATASET_ID \
  --timeout 300 \
  --memory 512Mi \
  --cpu 1

# Get backend URL
BACKEND_URL=$(gcloud run services describe fpl-api --region $REGION --format='value(status.url)')
echo "✅ Backend deployed at: $BACKEND_URL"

# Deploy Frontend
echo ""
echo "🎨 Deploying Frontend Dashboard..."
cd ../frontend

gcloud run deploy fpl-dashboard \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_API_URL=$BACKEND_URL \
  --timeout 300 \
  --memory 512Mi \
  --cpu 1

# Get frontend URL
FRONTEND_URL=$(gcloud run services describe fpl-dashboard --region $REGION --format='value(status.url)')
echo "✅ Frontend deployed at: $FRONTEND_URL"

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "📊 Dashboard URL: $FRONTEND_URL"
echo "🔌 API URL: $BACKEND_URL"
echo ""
echo "Next steps:"
echo "1. Visit $FRONTEND_URL to view your dashboard"
echo "2. Set up Cloud Scheduler for automated data updates"
echo "3. Configure monitoring and alerts"
