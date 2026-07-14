# FIFA 2026 E2E Operations & Deployment Guide

This guide outlines how to build, run, and scale the FIFA 2026 Ticket Seating Pathfinder ecosystem using Docker, Docker Compose, and Kubernetes.

---

## 🐋 1. Local Container Deployment (Docker Compose)

The multi-container stack maps the frontend React Organizer Dashboard and Node Express backend server seamlessly.

### Prerequisites
- Docker and Docker Compose installed on your host machine.

### Execution Instructions
1. Navigate to the project root:
   ```bash
   cd C:\Users\hp\.gemini\antigravity\scratch
   ```
2. (Optional) Set your Gemini API key in a `.env` file in the root:
   ```env
   GEMINI_API_KEY=your-actual-api-key
   ```
3. Compile and start the containers:
   ```bash
   docker-compose up --build -d
   ```
4. Verify that the containers are healthy:
   ```bash
   docker-compose ps
   ```
5. Access the endpoints:
   - **React Organizer Dashboard**: `http://localhost:3000`
   - **Express Backend API**: `http://localhost:8000`

---

## ☸️ 2. Cloud Orchestration (Kubernetes)

For large-scale stadium deployments, Kubernetes handles load balancing and persistence of JSON records.

### Step 1: Create Secrets Configuration
Create a Kubernetes secret containing your GenAI API key:
```bash
kubectl create secret generic gemini-secrets --from-literal=api-key="YOUR_GEMINI_API_KEY"
```

### Step 2: Apply the Configurations
Launch the PVC persistent storage, backend deployment, frontend dashboard, services, and ingress route rules:
```bash
kubectl apply -f k8s-deployment.yaml
```

### Step 3: Verify the Cluster State
1. Check PVC status (should transition to `Bound`):
   ```bash
   kubectl get pvc
   ```
2. Inspect pod startup:
   ```bash
   kubectl get pods -w
   ```
3. List the services:
   ```bash
   kubectl get svc
   ```

---

## 🚀 3. Continuous Integration pipeline (CI/CD)

The GitHub Actions configuration inside `.github/workflows/deploy.yml` triggers checks automatically on every push:
- **Backend**: Runs security checks, dependency audits, and test suites.
- **Dashboard**: Validates React compilation and static asset construction.
- **Mobile**: Configures Dart and Flutter environment variables, lints using `flutter analyze`, and runs widget tests.
- **Packaging**: Builds Docker test images to verify Dockerfile health.
