import os
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.cloud import bigquery
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(
    title="FPL Draft Dashboard API",
    description="Backend API for FPL Draft League Analytics",
    version="1.0.0"
)

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
GCP_PROJECT_ID = os.getenv('GCP_PROJECT_ID')
BQ_DATASET_ID = os.getenv('BQ_DATASET_ID', 'fpl_draft_data')

# Ensure GOOGLE_APPLICATION_CREDENTIALS points to the correct file path
if os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
    service_account_path = Path(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
    if not service_account_path.is_absolute():
        project_root = Path(__file__).resolve().parent.parent
        resolved_path = project_root / service_account_path
        if resolved_path.exists():
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(resolved_path)

# Initialize BigQuery client
client = bigquery.Client(project=GCP_PROJECT_ID)

# ============================================================================
# Pydantic Models (Response Schemas)
# ============================================================================

class StandingEntry(BaseModel):
    entry_id: int
    manager_name: str
    total_points: int
    rank: int

class MomentumEntry(BaseModel):
    entry_id: int
    manager_name: str
    total_points_last_4_gw: int

class BenchPointsEntry(BaseModel):
    entry_id: int
    manager_name: str
    bench_points: int

class PlayerContribution(BaseModel):
    entry_id: int
    manager_name: str
    web_name: str
    total_points: int

class ConsistencyEntry(BaseModel):
    gameweek: int
    entry_id: int
    manager_name: str
    weekly_points: int

class DraftPickAnalysis(BaseModel):
    manager_name: str
    pick: int
    round: int
    element_id: int
    player_name: str
    total_points_contributed: int
    pick_bucket: str

class TopTransfersEntry(BaseModel):
    player_name: str
    manager_name: str
    total_points: int

# ============================================================================
# Helper Functions
# ============================================================================

def run_query(query: str):
    """Execute a BigQuery query and return results as list of dicts."""
    try:
        query_job = client.query(query)
        results = query_job.result()
        return [dict(row) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"BigQuery error: {str(e)}")

# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/")
def read_root():
    """Health check endpoint."""
    return {
        "service": "FPL Draft Dashboard API",
        "status": "running",
        "gcp_project": GCP_PROJECT_ID,
        "dataset": BQ_DATASET_ID
    }

@app.get("/health")
def health_check():
    """Verify BigQuery connectivity."""
    try:
        query = f"SELECT COUNT(*) as count FROM `{GCP_PROJECT_ID}.{BQ_DATASET_ID}.dim_entries`"
        result = run_query(query)
        return {
            "status": "healthy",
            "bigquery_connected": True,
            "manager_count": result[0]['count']
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")

@app.get("/standings", response_model=List[StandingEntry])
def get_standings():
    """Get current league standings (total points and rank)."""
    query = f"""
        SELECT entry_id, manager_name, total_points, rank
        FROM `{GCP_PROJECT_ID}.{BQ_DATASET_ID}.agg_league_standings`
        ORDER BY rank ASC
    """
    return run_query(query)

@app.get("/momentum", response_model=List[MomentumEntry])
def get_momentum():
    """Get manager form guide (points in last 4 gameweeks)."""
    query = f"""
        SELECT entry_id, manager_name, total_points_last_4_gw
        FROM `{GCP_PROJECT_ID}.{BQ_DATASET_ID}.agg_manager_momentum`
        ORDER BY total_points_last_4_gw DESC
    """
    return run_query(query)

@app.get("/bench-points", response_model=List[BenchPointsEntry])
def get_bench_points():
    """Get points left on the bench per manager."""
    query = f"""
        SELECT entry_id, manager_name, bench_points
        FROM `{GCP_PROJECT_ID}.{BQ_DATASET_ID}.agg_bench_points`
        ORDER BY bench_points DESC
    """
    return run_query(query)

@app.get("/contributions", response_model=List[PlayerContribution])
def get_contributions(manager_name: Optional[str] = None):
    """Get player points contribution breakdown (optionally filter by manager)."""
    base_query = f"""
        SELECT entry_id, manager_name, web_name, total_points
        FROM `{GCP_PROJECT_ID}.{BQ_DATASET_ID}.agg_player_contribution`
    """
    
    if manager_name:
        query = base_query + f" WHERE manager_name = '{manager_name}'"
    else:
        query = base_query
    
    query += " ORDER BY total_points DESC"
    return run_query(query)

@app.get("/consistency", response_model=List[ConsistencyEntry])
def get_consistency():
    """Get weekly points for each manager (for consistency analysis/box plots)."""
    query = f"""
        SELECT gameweek, entry_id, manager_name, weekly_points
        FROM `{GCP_PROJECT_ID}.{BQ_DATASET_ID}.agg_manager_consistency`
        ORDER BY gameweek ASC, manager_name ASC
    """
    return run_query(query)

@app.get("/draft-analysis", response_model=List[DraftPickAnalysis])
def get_draft_analysis():
    """Get draft pick performance analysis."""
    query = f"""
        SELECT 
            manager_name, 
            pick, 
            round, 
            element_id, 
            player_name, 
            total_points_contributed, 
            pick_bucket
        FROM `{GCP_PROJECT_ID}.{BQ_DATASET_ID}.agg_draft_picks_analysis`
        ORDER BY pick ASC
    """
    return run_query(query)

@app.get("/top-transfers", response_model=List[TopTransfersEntry])
def get_top_transfers():
    """Get top performing transfer players."""
    query = f"""
        SELECT player_name, manager_name, total_points
        FROM `{GCP_PROJECT_ID}.{BQ_DATASET_ID}.agg_top_transfers`
        ORDER BY total_points DESC
        LIMIT 20
    """
    return run_query(query)

# ============================================================================
# Data Pipeline Management
# ============================================================================

@app.post("/refresh-data")
async def refresh_data():
    """
    Trigger data pipeline refresh.
    This endpoint runs the data ingestion script to update BigQuery with latest FPL data.
    Designed to be called by Cloud Scheduler for automated daily updates.
    """
    import subprocess
    from pathlib import Path
    
    # Get the data_pipeline directory
    # In Docker: data_pipeline is copied to backend directory
    # In local dev: data_pipeline is in parent directory
    backend_dir = Path(__file__).resolve().parent
    pipeline_dir = backend_dir / "data_pipeline"
    
    # Fallback to parent directory for local development
    if not pipeline_dir.exists():
        pipeline_dir = backend_dir.parent / "data_pipeline"
    
    pipeline_script = pipeline_dir / "ingest.py"
    
    if not pipeline_script.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Data pipeline script not found at {pipeline_script}"
        )
    
    try:
        # Run the data pipeline script
        result = subprocess.run(
            ["python", str(pipeline_script)],
            cwd=str(pipeline_dir),
            capture_output=True,
            text=True,
            timeout=600  # 10 minute timeout
        )
        
        if result.returncode == 0:
            return {
                "status": "success",
                "message": "Data refreshed successfully",
                "output": result.stdout[-500:] if result.stdout else ""  # Last 500 chars
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Pipeline failed: {result.stderr[-500:]}"
            )
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=504,
            detail="Data pipeline timed out after 10 minutes"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error running pipeline: {str(e)}"
        )

# ============================================================================
# Run with: uvicorn main:app --reload
# API Docs available at: http://localhost:8000/docs
# ============================================================================
