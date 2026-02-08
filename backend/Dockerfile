FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port (Cloud Run will set PORT env variable)
EXPOSE 8080

# Use Gunicorn with Uvicorn workers for production
# - Gunicorn manages multiple worker processes
# - Each worker is an async Uvicorn server
# - Timeout 0 allows long-running requests (important for BigQuery)
# - PORT env variable is set by Cloud Run
CMD exec gunicorn main:app \
    --bind :${PORT:-8080} \
    --workers 2 \
    --worker-class uvicorn.workers.UvicornWorker \
    --timeout 0 \
    --access-logfile - \
    --error-logfile -
