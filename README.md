# fpl_draft_dashboard

## Project Overview

This project is currently undergoing a migration from a monolithic Streamlit application to a modern, scalable architecture using FastAPI, React/Next.js, and Google BigQuery.

## Directory Structure

### `/legacy_v1`
Contains the original Streamlit application.
- `draft_league_streamlit.py`: The legacy Streamlit app script.
- `requirements_v1.txt`: Python dependencies for the legacy app.
- `images/`: Static image assets used by the legacy app.

To run the legacy app:
```bash
cd legacy_v1
pip install -r requirements_v1.txt
streamlit run draft_league_streamlit.py
```

### `/backend`
The new Python API built with FastAPI.
- `main.py`: Entry point for the FastAPI application.
- `Dockerfile`: Configuration for containerizing the API (using Python 3.11).
- `requirements.txt`: Dependencies for the backend service.

### `/frontend`
The new frontend application (React/Next.js) intended to be hosted on Firebase.
- `src/`: Source code for the frontend application.
- `public/`: Static assets.
- `package.json`: Node.js dependencies and scripts.

### `/data_pipeline`
Scripts for data ingestion and processing with BigQuery.
- `ingest.py`: Script to fetch FPL data and load it into BigQuery.
- `schema.json`: BigQuery table schema definitions.

## Migration Status

- [x] Structure reorganization
- [ ] Backend API implementation
- [ ] Frontend implementation
- [ ] Data pipeline implementation
