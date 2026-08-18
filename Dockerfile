# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies with BuildKit cache mount
# This caches pip downloads between builds WITHOUT increasing image size
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Copy application files
COPY . .

# Expose port
EXPOSE 80

# Health check for FastAPI
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/api/health || exit 1

# Run FastAPI application with uvicorn
# --timeout-keep-alive: Keep-alive connections timeout (default 5s, increased for long-running operations)
# --timeout-graceful-shutdown: Graceful shutdown timeout
CMD ["uvicorn", "app.api_main:app", "--host", "0.0.0.0", "--port", "80", "--workers", "2", "--timeout-keep-alive", "300"]