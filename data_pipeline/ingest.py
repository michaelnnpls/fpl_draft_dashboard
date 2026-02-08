import os
import requests
import json
import pandas as pd
from google.cloud import bigquery
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime

# Load environment variables
load_dotenv()

# Resolve GCP credentials path
if os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
    service_account_path = Path(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
    if not service_account_path.is_absolute():
        project_root = Path(__file__).resolve().parent.parent
        resolved_path = project_root / service_account_path
        if resolved_path.exists():
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(resolved_path)

GCP_PROJECT_ID = os.getenv('GCP_PROJECT_ID')
BQ_DATASET_ID = os.getenv('BQ_DATASET_ID', 'fpl_draft_data')
DATASET_LOCATION = os.getenv('DATASET_LOCATION', 'EU')
LEAGUE_ID = "4193" # Hardcoded for now based on legacy code

def get_bigquery_client():
    try:
        return bigquery.Client(project=GCP_PROJECT_ID) if GCP_PROJECT_ID else bigquery.Client()
    except Exception as e:
        print(f"Failed to initialize BigQuery client: {e}")
        return None

def ensure_dataset_exists(client, dataset_id):
    dataset_ref = client.dataset(dataset_id)
    try:
        client.get_dataset(dataset_ref)
        print(f"Dataset {dataset_id} exists.")
    except Exception:
        print(f"Dataset {dataset_id} not found, creating in {DATASET_LOCATION}...")
        dataset = bigquery.Dataset(dataset_ref)
        dataset.location = DATASET_LOCATION
        client.create_dataset(dataset)
        print(f"Dataset {dataset_id} created.")

def load_dataframe_to_bigquery(client, df, table_name):
    if df.empty:
        print(f"Skipping {table_name}: DataFrame is empty.")
        return

    table_id = f"{client.project}.{BQ_DATASET_ID}.{table_name}"
    
    # Add scraped_at timestamp
    df['scraped_at'] = datetime.utcnow()

    job_config = bigquery.LoadJobConfig(
        write_disposition="WRITE_TRUNCATE", # For V1, we overwrite. Later can use WRITE_APPEND with day partitioning
    )

    print(f"Loading {len(df)} rows to {table_id}...")
    job = client.load_table_from_dataframe(df, table_id, job_config=job_config)
    job.result() # Wait for job to complete
    print(f"Loaded {table_name} successfully.")

# --- Data Fetching Functions ---

def fetch_bootstrap_static():
    """Fetches core metadata: elements (players), teams, element_types."""
    url = "https://draft.premierleague.com/api/bootstrap-static"
    print(f"Fetching {url}...")
    r = requests.get(url)
    if r.status_code != 200:
        return None, None, None
    data = r.json()
    
    # Process Elements
    elements = pd.DataFrame(data['elements'])
    # Keep key columns but can ingest mostly everything
    
    # Process Teams
    teams = pd.DataFrame(data['teams'])
    
    # Process Element Types
    element_types = pd.DataFrame(data['element_types'])
    
    return elements, teams, element_types, data['events']

def fetch_gameweek_live(gameweek, element_ids_df):
    """Fetches stats for all players for a specific gameweek."""
    url = f"https://draft.premierleague.com/api/event/{gameweek}/live"
    print(f"Fetching {url}...")
    r = requests.get(url)
    if r.status_code != 200:
        return pd.DataFrame()
    
    data = r.json()['elements']
    
    # data is a dict keyed by element_id. Need to flatten.
    all_stats = []
    
    # We iterate through the official element list to ensure we capture everyone
    # or just iterate the response keys
    for element_id, info in data.items():
        stats = info['stats']
        stats['element_id'] = int(element_id)
        stats['gameweek'] = gameweek
        all_stats.append(stats)
        
    return pd.DataFrame(all_stats)

def fetch_draft_picks(league_id):
    """Fetches the initial draft picks."""
    url = f"https://draft.premierleague.com/api/draft/{league_id}/choices"
    print(f"Fetching {url}...")
    r = requests.get(url)
    if r.status_code != 200:
        return pd.DataFrame()
    
    data = r.json()['choices']
    return pd.DataFrame(data)

def fetch_manager_weekly_picks(league_id, entry_ids, gameweek):
    """Fetches picks and subs for each manager for a gameweek."""
    all_picks = []
    
    for entry_id in entry_ids:
        url = f"https://draft.premierleague.com/api/entry/{entry_id}/event/{gameweek}"
        r = requests.get(url)
        if r.status_code == 200:
            data = r.json()
            picks = data['picks']
            # Add metadata
            for p in picks:
                p['entry_id'] = entry_id
                p['gameweek'] = gameweek
                all_picks.append(p)
                
    return pd.DataFrame(all_picks)

def fetch_league_entries(league_id):
    """Gets the list of managers/teams in the league."""
    # The 'choices' endpoint returns entry_id and entry_name, which is useful
    # simpler than another call if we already have it.
    # Alternatively use: https://draft.premierleague.com/api/league/{league_id}/details
    url = f"https://draft.premierleague.com/api/league/{league_id}/details"
    print(f"Fetching {url}...")
    r = requests.get(url)
    if r.status_code != 200:
        return []
    
    return r.json()['league_entries']


# --- Main Orchestration ---

def run_ingestion():
    client = get_bigquery_client()
    if not client:
        return
    ensure_dataset_exists(client, BQ_DATASET_ID)

    # 1. Static Data
    print("\n--- Ingesting Static Data ---")
    elements, teams, element_types, events = fetch_bootstrap_static()
    
    if elements is not None:
        load_dataframe_to_bigquery(client, elements, "dim_elements")
        load_dataframe_to_bigquery(client, teams, "dim_teams")
        load_dataframe_to_bigquery(client, element_types, "dim_element_types")
        
        # Determine current/next gameweek
        # The Draft API 'events' key might not be a list of dicts like the main FPL API.
        # It seems 'events' in bootstrap-static for Draft might be different.
        # Let's try to infer max gameweek from the events data if possible, or default to 38.
        
        max_gw = 38
        try:
            # If events is a dict (which the error suggests it might not be what we expect)
            # or if it's the main FPL structure.
            # Let's just try to find the "current" one.
            if isinstance(events, list):
                current_gw_event = next((e for e in events if e.get('is_current')), None)
                if current_gw_event:
                    max_gw = current_gw_event['id']
            elif isinstance(events, dict):
                 # Draft API sometimes puts 'current' directly in top level or structure is different
                 if 'current' in events:
                     max_gw = events['current']
        except Exception as e:
            print(f"Could not determine current gameweek from events, defaulting to {max_gw}: {e}")
            
        print(f"Current/Max processed Gameweek: {max_gw}")
    else:
        print("Failed to fetch static data. Aborting.")
        return

    # 2. Draft Picks
    print("\n--- Ingesting Draft Picks & League Entries ---")
    draft_picks = fetch_draft_picks(LEAGUE_ID)
    
    entries_list = fetch_league_entries(LEAGUE_ID)
    entries_df = pd.DataFrame(entries_list)
    if not entries_df.empty:
        # Keep relevant columns: entry_id, entry_name, player_first_name, player_last_name, short_name
        load_dataframe_to_bigquery(client, entries_df, "dim_entries")

    if not draft_picks.empty:
        load_dataframe_to_bigquery(client, draft_picks, "fact_draft_picks")
        entry_ids = [e['entry_id'] for e in entries_list]
    else:
        entry_ids = []

    # 3. Weekly Stats loops
    print("\n--- Ingesting Weekly Data (This may take a moment) ---")
    
    all_gw_stats = []
    all_manager_picks = []

    # We loop from GW 1 to current max
    for gw in range(1, max_gw + 1):
        print(f"Processing Gameweek {gw}...")
        
        # Player Stats
        gw_stats = fetch_gameweek_live(gw, elements)
        if not gw_stats.empty:
            all_gw_stats.append(gw_stats)
            
        # Manager Picks
        if entry_ids:
            mgr_picks = fetch_manager_weekly_picks(LEAGUE_ID, entry_ids, gw)
            if not mgr_picks.empty:
                all_manager_picks.append(mgr_picks)

    # Bulk Load Weekly Data
    if all_gw_stats:
        combined_gw_stats = pd.concat(all_gw_stats, ignore_index=True)
        load_dataframe_to_bigquery(client, combined_gw_stats, "fact_gameweek_live")
        
    if all_manager_picks:
        combined_manager_picks = pd.concat(all_manager_picks, ignore_index=True)
        load_dataframe_to_bigquery(client, combined_manager_picks, "fact_entry_weekly")

if __name__ == "__main__":
    run_ingestion()
