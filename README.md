# SWAP CTO SLA Dashboard

**Developed by [Homains](https://homains.eu) for SWAP**

A comprehensive monitoring dashboard for tracking CTO Service Level Agreement compliance and system performance metrics.

## Features

### 1. Real-time SLA Monitoring
- **System Uptime**: 99.95% monthly availability target
- **API Response Time**: <500ms for 95% of requests
- **Error Rates**: Track 5XX errors and system failures
- **Live Metrics**: Auto-refresh every minute

### 2. Incident Management
- Track incidents by severity (P1/P2/P3)
- Response time tracking against SLA targets:
  - P1 (Critical): 15 min response, 2 hours resolution
  - P2 (High): 1 hour response, 6 hours resolution
  - P3 (Medium): 8 hours response, 3 days resolution
- Compliance indicators for each incident

### 3. Reporting System
- **Weekly Reports**: System health, risks, and improvements
- **Monthly Reports**: Comprehensive technical summaries
- Export capabilities for stakeholder review

### 4. Technical Debt Tracking
- Document codebase flexibility issues
- Track experimentation readiness
- Prioritize by impact (Critical/High/Medium/Low)
- Monitor trade-offs between speed, stability, and scalability

## Technology Stack

- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Cloud**: AWS (CloudWatch, ECS, ECR)
- **Charts**: Recharts
- **Icons**: Lucide React

## Prerequisites

- Node.js 18+
- MongoDB 7+
- AWS Account with appropriate permissions
- Docker & Docker Compose (for deployment)

## Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your AWS credentials and MongoDB URI
   ```

3. **Start MongoDB**:
   ```bash
   docker-compose up mongo -d
   ```

4. **Run the application**:
   ```bash
   # Terminal 1: Start API server
   npm run api

   # Terminal 2: Start frontend dev server
   npm run dev
   ```

5. **Access the dashboard**:
   - Frontend: http://localhost:3000
   - API: http://localhost:3001

## Production Deployment

### Option 1: Docker Compose

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop
docker-compose down
```

### Option 2: AWS ECS (Recommended)

1. **Create ECR Repository**:
   ```bash
   aws ecr create-repository \
     --repository-name cto-sla-dashboard \
     --region eu-central-1 \
     --profile swap
   ```

2. **Build and Push Image**:
   ```bash
   # Authenticate Docker to ECR
   aws ecr get-login-password --region eu-central-1 --profile swap | \
     docker login --username AWS --password-stdin 226293104860.dkr.ecr.eu-central-1.amazonaws.com

   # Build image
   docker build -t cto-sla-dashboard .

   # Tag image
   docker tag cto-sla-dashboard:latest \
     226293104860.dkr.ecr.eu-central-1.amazonaws.com/cto-sla-dashboard:latest

   # Push to ECR
   docker push 226293104860.dkr.ecr.eu-central-1.amazonaws.com/cto-sla-dashboard:latest
   ```

3. **Create ECS Task Definition** (see `aws/task-definition.json`)

4. **Create ECS Service**:
   ```bash
   aws ecs create-service \
     --cluster prod-swap-cluster \
     --service-name cto-sla-dashboard \
     --task-definition cto-sla-dashboard \
     --desired-count 1 \
     --launch-type FARGATE \
     --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
     --region eu-central-1 \
     --profile swap
   ```

5. **Configure Load Balancer** for `a-cto.swapegypt.app`

### Option 3: GitHub Actions CI/CD

The repository includes a GitHub Actions workflow that automatically:
1. Builds Docker image
2. Pushes to Amazon ECR
3. Updates ECS service

**Setup**:
1. Add GitHub Secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

2. Push to `main` branch to trigger deployment

## Environment Variables

```bash
# API Configuration
PORT=3001
NODE_ENV=production

# AWS Configuration
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key

# MongoDB Configuration
MONGO_URI=mongodb://mongo:27017/sla-monitoring

# Application URLs
CLIENT_URL=https://a-cto.swapegypt.app
API_URL=https://a-cto.swapegypt.app/api
```

## API Endpoints

### Metrics
- `GET /api/health` - Health check
- `GET /api/metrics/uptime?env=production` - System uptime metrics
- `GET /api/metrics/api-performance?env=production` - API performance metrics
- `GET /api/metrics/errors?env=production` - Error rate metrics
- `GET /api/metrics/dashboard?env=production` - Combined dashboard metrics

### Incidents
- `GET /api/incidents` - List all incidents
- `POST /api/incidents` - Create new incident
- `PATCH /api/incidents/:id` - Update incident status

### Reports
- `GET /api/reports/weekly` - Get weekly reports
- `POST /api/reports/weekly` - Create weekly report
- `GET /api/reports/monthly` - Get monthly reports
- `POST /api/reports/monthly` - Create monthly report

### Technical Debt
- `GET /api/technical-debt` - List technical debt items
- `POST /api/technical-debt` - Create technical debt item

### Backups
- `GET /api/backups/status` - Check backup compliance

## SLA Requirements Tracked

### 1. System Performance
- ✅ 99.95% monthly uptime (21 min downtime/month)
- ✅ API response time <500ms for 95% of requests
- ✅ Error rate monitoring

### 2. Incident Response
- ✅ P1: 15 min response, 2 hour resolution
- ✅ P2: 1 hour response, 6 hour resolution
- ✅ P3: 8 hour response, 3 day resolution

### 3. Data Protection
- ✅ Daily incremental backups
- ✅ Weekly full backups
- ✅ RPO: 1 hour (max data loss)
- ✅ RTO: 4 hours (recovery time)

### 4. Reporting
- ✅ Weekly technical updates
- ✅ Monthly comprehensive reports

### 5. Codebase Quality
- ✅ Technical debt tracking
- ✅ Experimentation readiness
- ✅ Trade-off documentation

## Monitoring & Alerts

The dashboard collects metrics from:
- AWS CloudWatch (ECS, ALB metrics)
- Application logs
- MongoDB database

Metrics are collected every 5 minutes via cron job and stored in MongoDB for historical analysis.

## Security

- All endpoints require authentication (except health check)
- AWS credentials secured via environment variables
- HTTPS enforced in production
- Security headers configured in nginx
- MongoDB access restricted

## Maintenance

### Backup MongoDB
```bash
docker exec -it cto-sla-dashboard-mongo-1 mongodump --out /backup
```

### View Logs
```bash
# Docker Compose
docker-compose logs -f app

# ECS
aws logs tail /aws/ecs/cto-sla-dashboard --follow --profile swap --region eu-central-1
```

### Update Service
```bash
aws ecs update-service \
  --cluster prod-swap-cluster \
  --service cto-sla-dashboard \
  --force-new-deployment \
  --region eu-central-1 \
  --profile swap
```

## Support

For issues or questions:
- **Email**: [mahmoud.e@homains.eu](mailto:mahmoud.e@homains.eu)
- **Company**: [Homains](https://homains.eu)

## License

© 2026 Homains. All rights reserved.

This dashboard is provided by Homains to SWAP for CTO SLA monitoring and performance tracking.
