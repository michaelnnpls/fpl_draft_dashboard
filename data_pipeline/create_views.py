from google.cloud import bigquery
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

GCP_PROJECT_ID = os.getenv('GCP_PROJECT_ID')
BQ_DATASET_ID = os.getenv('BQ_DATASET_ID')
CREDENTIALS_PATH = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')

if not GCP_PROJECT_ID or not BQ_DATASET_ID:
    print("Error: GCP_PROJECT_ID or BQ_DATASET_ID not set in .env")
    exit(1)

# Resolve credentials path to absolute
if CREDENTIALS_PATH and not Path(CREDENTIALS_PATH).is_absolute():
    project_root = Path(__file__).resolve().parent.parent
    CREDENTIALS_PATH = str(project_root / CREDENTIALS_PATH)

# Initialize BigQuery Client
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = CREDENTIALS_PATH
client = bigquery.Client(project=GCP_PROJECT_ID)

def create_views():
    print(f"Creating views in project {GCP_PROJECT_ID}, dataset {BQ_DATASET_ID}...")
    
    # Read SQL file
    sql_file_path = os.path.join(os.path.dirname(__file__), 'create_views.sql')
    with open(sql_file_path, 'r') as f:
        sql_content = f.read()

    # Format SQL with project and dataset IDs
    formatted_sql = sql_content.format(
        project_id=GCP_PROJECT_ID,
        dataset_id=BQ_DATASET_ID
    )

    # Split by semicolon to execute each statement
    # Note: simple split might break if semicolons are in strings/comments, 
    # but for our specific SQL file it should remain safe if we're careful.
    statements = formatted_sql.split(';')
    
    for statement in statements:
        if statement.strip():
            print(f"Executing statement...")
            try:
                job = client.query(statement)
                job.result()  # Wait for job to complete
                print("Statement executed successfully.")
            except Exception as e:
                print(f"Error executing statement: {e}")
                print(f"Statement:\n{statement[:100]}...")

if __name__ == "__main__":
    create_views()
