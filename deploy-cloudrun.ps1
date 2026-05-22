#!/usr/bin/env pwsh
# ============================================================
# deploy-cloudrun.ps1 - Deploy Auto Website Post to Google Cloud Run
# Usage: .\deploy-cloudrun.ps1 -ProjectId "your-gcp-project-id"
# ============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectId,
    
    [string]$Region = "asia-southeast1",
    [string]$ServiceName = "auto-website-post",
    [string]$ImageName = "auto-website-post"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying Auto Website Post to Google Cloud Run" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "Project: $ProjectId"
Write-Host "Region:  $Region"
Write-Host "Service: $ServiceName"
Write-Host ""

# Step 1: Set GCP project
Write-Host "📋 [1/5] Setting GCP project..." -ForegroundColor Yellow
gcloud config set project $ProjectId

# Step 2: Enable required APIs
Write-Host "🔧 [2/5] Enabling Cloud Run & Artifact Registry APIs..." -ForegroundColor Yellow
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

# Step 3: Create Artifact Registry repository (if not exists)
Write-Host "📦 [3/5] Setting up Artifact Registry..." -ForegroundColor Yellow
$RepoExists = gcloud artifacts repositories list --location=$Region --format="value(name)" 2>$null | Select-String "auto-post-repo"
if (-not $RepoExists) {
    gcloud artifacts repositories create auto-post-repo `
        --repository-format=docker `
        --location=$Region `
        --description="Auto Website Post Docker images"
    Write-Host "  ✅ Repository created." -ForegroundColor Green
} else {
    Write-Host "  ✅ Repository already exists." -ForegroundColor Green
}

# Configure Docker to use GCP credentials
gcloud auth configure-docker "$Region-docker.pkg.dev" --quiet

# Step 4: Build and push Docker image using Cloud Build
Write-Host "🏗️  [4/5] Building & pushing image via Cloud Build..." -ForegroundColor Yellow
$ImageTag = "$Region-docker.pkg.dev/$ProjectId/auto-post-repo/$ImageName`:latest"
gcloud builds submit --tag $ImageTag --timeout=20m .

# Step 5: Deploy to Cloud Run
Write-Host "🚀 [5/5] Deploying to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $ServiceName `
    --image $ImageTag `
    --platform managed `
    --region $Region `
    --allow-unauthenticated `
    --memory 2Gi `
    --cpu 2 `
    --timeout 300 `
    --max-instances 3 `
    --set-env-vars "WP_URL=https://mpuh.vn,WP_USERNAME=autoposter"

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
$Url = gcloud run services describe $ServiceName --region=$Region --format="value(status.url)"
Write-Host "🌐 Your app is live at: $Url" -ForegroundColor Cyan
