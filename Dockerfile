# ============================================================
# Stage 1: Build React Frontend
# ============================================================
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

# Copy frontend dependencies first (cache optimization)
COPY frontend/package*.json ./
RUN npm ci --silent

# Copy source and build
COPY frontend/ ./
RUN npm run build

# ============================================================
# Stage 2: Python Backend with Playwright + Frontend static files
# ============================================================
FROM mcr.microsoft.com/playwright/python:v1.52.0-noble

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright Chromium browser
RUN python -m playwright install chromium --with-deps

# Copy backend source code
COPY backend/ ./backend/

# Copy built frontend static files into backend/static/
COPY --from=frontend-builder /app/frontend/dist ./backend/static/

# Create temp_images directory for image processing
RUN mkdir -p ./backend/temp_images

# Expose port (Cloud Run injects PORT env variable)
EXPOSE 8080

# Set working directory to backend for running uvicorn
WORKDIR /app/backend

# Start command - Cloud Run sets $PORT automatically (default 8080)
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
