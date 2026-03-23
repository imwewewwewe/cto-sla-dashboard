# SLA Metrics Calculation Methodology

## Overview

The CTO SLA Dashboard tracks three critical Service Level Agreement (SLA) metrics across both production and staging environments. This document explains how each metric is calculated, the data sources used, and the synthetic traffic generation system that keeps staging metrics fresh.

---

## 📊 Metric 1: System Uptime (99.95% Target)

### Calculation Method

```
Uptime % = (Healthy Hours / Total Hours) × 100
```

### Data Sources

**AWS ECS Service Status:**
- Cluster: `prod-swap-cluster` (production) / `dev-swap-cluster` (staging)
- Service: `prod-swap-swap-app` / `dev-swap-swap-app`
- Metrics: `runningCount` vs `desiredCount`

**AWS CloudWatch ALB Metrics:**
- Namespace: `AWS/ApplicationELB`
- Metric: `HealthyHostCount`
- Target Groups:
  - Production: `targetgroup/prod-swap-swap-app-tg/f9e0ec4bc74c0adf`
  - Staging: `targetgroup/dev-swap-swap-app-tg/939ea8b389f1878c`
- Time Window: **Last 30 days**
- Resolution: **1-hour periods** (720 datapoints)

### Formula

```javascript
const datapoints = metricsData.Datapoints || [];
const totalPoints = datapoints.length;
const healthyPoints = datapoints.filter(dp => dp.Minimum > 0).length;
const uptimePercentage = (healthyPoints / totalPoints) * 100;
```

### Compliance Threshold

- **Target**: ≥ 99.95%
- **Status**:
  - `healthy` if ≥ 99.95%
  - `degraded` if < 99.95%

### What It Measures

- **Minimum healthy host count** per hour over 30 days
- If ANY hour has zero healthy hosts → counted as downtime
- Measures **availability** from AWS infrastructure perspective

---

## ⚡ Metric 2: API Response Time (95% < 500ms Target)

### Calculation Method

```
Compliance Rate = (Fast Responses / Total Responses) × 100
Fast Response = Average Response Time < 500ms
```

### Data Sources

**AWS CloudWatch ALB Metrics:**
- Namespace: `AWS/ApplicationELB`
- Metric: `TargetResponseTime`
- Load Balancers:
  - Production: `app/swap-prod-alb/5294a429ae8bf07c`
  - Staging: `app/swap-dev-alb/215d64e5d70d93a4`
- Time Window: **Last 30 days**
- Resolution: **1-hour periods** (720 datapoints)
- Statistics: `Average`, `Maximum`

### Formula

```javascript
const datapoints = data.Datapoints || [];

// Calculate average response time across all hours
const avgResponseTime = datapoints.reduce((sum, dp) =>
  sum + (dp.Average || 0), 0) / datapoints.length;

// Use Maximum as P95 approximation
const p95ResponseTime = Math.max(...datapoints.map(dp =>
  dp.Maximum || 0));

// Calculate compliance rate (% of hours under 500ms)
const complianceRate = (datapoints.filter(dp =>
  dp.Average < 0.5).length / datapoints.length) * 100;
```

### Compliance Threshold

- **Target**: ≥ 95% of requests under 500ms
- **Status**:
  - `compliant` if ≥ 95%
  - `non-compliant` if < 95%

### What It Measures

- **Hourly average response time** for 30 days
- Counts how many hours had average response < 500ms
- Maximum value approximates **P95 response time**
- Measures **performance** from user experience perspective

---

## 🚨 Metric 3: Error Rate (< 1 error/hour Target)

### Calculation Method

```
Error Rate = Total 5XX Errors / Number of Hours
```

### Data Sources

**AWS CloudWatch ALB Metrics:**
- Namespace: `AWS/ApplicationELB`
- Metric: `HTTPCode_Target_5XX_Count`
- Load Balancers: (same as API Response Time)
- Time Window: **Last 24 hours**
- Resolution: **1-hour periods** (24 datapoints)
- Statistics: `Sum`

### Formula

```javascript
const datapoints = data.Datapoints || [];

// Sum all 5XX errors across all hours
const totalErrors = datapoints.reduce((sum, dp) =>
  sum + (dp.Sum || 0), 0);

// Calculate average errors per hour
const errorRate = datapoints.length > 0
  ? totalErrors / datapoints.length
  : 0;
```

### Compliance Threshold

- **Target**: < 1 error/hour
- **Status**:
  - `healthy` if < 1 error/hour
  - `elevated` if ≥ 1 error/hour

### What It Measures

- **5XX server errors** only (not 4XX client errors)
- Calculated as **average errors per hour** over 24h
- Includes:
  - 500 Internal Server Error
  - 502 Bad Gateway
  - 503 Service Unavailable
  - 504 Gateway Timeout
- Measures **reliability** and server-side stability

---

## 🤖 Synthetic Traffic Generation System

### Problem Statement

Staging environments typically have **zero real user traffic**, causing:
- Stale CloudWatch metrics (hours/days old)
- Inaccurate dashboard data
- Inability to validate deployments

### Solution Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  CTO SLA Dashboard Backend (Node.js)                        │
│  - Runs on: 152.53.103.198:3001                            │
│  - Docker Container: cto-sla-dashboard                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Every 3 minutes (cron)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  generateStagingTraffic()                                   │
│  - Sends HTTP GET requests to 4 public endpoints           │
│  - User-Agent: CTO-Dashboard-Synthetic-Monitor/1.0         │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS Requests
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Staging Environment (api.dev.swapegypt.app)                │
│  - AWS ECS: dev-swap-cluster                                │
│  - AWS ALB: swap-dev-alb                                    │
│  - Backend: Java Spring Boot                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Automatically recorded
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  AWS CloudWatch Metrics                                     │
│  - RequestCount (per 5-min period)                          │
│  - TargetResponseTime (Average, Max)                        │
│  - HTTPCode_Target_5XX_Count                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ API queries (every 5 min)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Dashboard Frontend (React)                                 │
│  - URL: https://a-cto.swapegypt.app                        │
│  - Displays: Uptime, Response Time, Errors                  │
│  - Environment Switcher: Production / Staging               │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Details

**Cron Schedule:**
```javascript
// Runs every 3 minutes
cron.schedule('*/3 * * * *', async () => {
  await generateStagingTraffic();
});
```

**Target Endpoints:**
```javascript
const stagingEndpoints = [
  'https://api.dev.swapegypt.app/api/v1/categories',
  'https://api.dev.swapegypt.app/api/v1/locations',
  'https://api.dev.swapegypt.app/api/v1/app/version',
  'https://api.dev.swapegypt.app/.well-known/assetlinks.json'
];
```

**Why These Endpoints:**
- All are **public** (no authentication required)
- All are **read-only** (no side effects)
- All are **lightweight** (fast response)
- All are **real** API endpoints (not test stubs)

**Traffic Volume:**
```
Requests per cycle: 4 endpoints
Cycles per hour: 20 (every 3 minutes)
Total requests/hour: 80
Total requests/day: 1,920
```

### Metric Update Timeline

```
T+0:00  → Synthetic traffic hits staging endpoints
T+0:01  → AWS ALB processes requests
T+0:02  → CloudWatch receives metrics data
T+0:05  → CloudWatch aggregates into 5-min period
T+0:10  → Dashboard queries CloudWatch API
T+0:11  → Fresh metrics displayed on dashboard
```

**Typical Delay**: 5-10 minutes from traffic → dashboard

---

## 🔄 Data Collection Flow

### Step 1: Synthetic Traffic Generation

**Frequency:** Every 3 minutes
**Method:** HTTP GET requests
**Purpose:** Keep staging metrics fresh

```javascript
async function generateStagingTraffic() {
  for (const endpoint of stagingEndpoints) {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'User-Agent': 'CTO-Dashboard-Synthetic-Monitor/1.0'
      }
    });
    // Count successes and failures
  }
  console.log(`✅ Synthetic traffic complete: ${successCount} success, ${errorCount} errors`);
}
```

### Step 2: AWS CloudWatch Recording

**Automatic Process** (No configuration needed):
- ALB automatically publishes metrics to CloudWatch
- Metrics available with 1-5 minute delay
- Stored for 15 months (default retention)

**Metrics Published:**
- `RequestCount` - Number of requests per period
- `TargetResponseTime` - Time to receive response from target
- `HTTPCode_Target_5XX_Count` - Count of 5XX responses
- `HealthyHostCount` - Number of healthy targets

### Step 3: Dashboard Data Fetching

**Frequency:** Every 5 minutes (production) + On-demand (user refresh)
**Method:** AWS SDK API calls

```javascript
// Example: Fetch error rates
const command = new GetMetricStatisticsCommand({
  Namespace: 'AWS/ApplicationELB',
  MetricName: 'HTTPCode_Target_5XX_Count',
  Dimensions: [
    { Name: 'LoadBalancer', Value: config.loadBalancer }
  ],
  StartTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
  EndTime: new Date(),
  Period: 3600, // 1 hour
  Statistics: ['Sum']
});

const data = await cloudwatchClient.send(command);
```

### Step 4: Dashboard Display

**Frontend Rendering:**
- React components fetch from `/api/metrics/dashboard?env=staging`
- Backend aggregates all three metrics
- Calculates compliance status for each metric
- Returns overall SLA compliance status

```javascript
const slaCompliance = {
  uptime: {
    current: 99.98,
    target: 99.95,
    compliant: true
  },
  apiResponseTime: {
    current: 96.5,
    target: 95,
    compliant: true
  },
  errorRate: {
    current: 0.042,
    target: 1,
    compliant: true
  }
};

const overallCompliance = Object.values(slaCompliance)
  .every(metric => metric.compliant);
```

---

## 📈 Historical Data Storage

**MongoDB Collections:**

1. **metrics_history** (collected every 5 minutes)
   ```javascript
   {
     environment: 'production' | 'staging',
     timestamp: ISODate,
     uptime: { percentage, status, runningTasks, desiredTasks },
     apiPerformance: { avgResponseTime, p95ResponseTime, complianceRate },
     errors: { totalErrors, errorRate, status }
   }
   ```

2. **incidents** (manual entry)
   - Root cause analysis
   - Resolution time
   - Impact assessment

3. **weekly_reports** / **monthly_reports**
   - Aggregated SLA performance
   - Trend analysis
   - Compliance summaries

---

## 🎯 SLA Targets Summary

| Metric | Target | Measurement Period | Compliance Threshold |
|--------|--------|-------------------|---------------------|
| **Uptime** | ≥ 99.95% | 30 days | Healthy hosts per hour |
| **API Response** | ≥ 95% < 500ms | 30 days | % of hours under threshold |
| **Error Rate** | < 1 error/hour | 24 hours | Average 5XX errors/hour |

---

## 🔍 Troubleshooting

### Stale Metrics on Staging

**Symptom:** Dashboard shows old timestamps
**Cause:** No traffic to staging environment
**Solution:** Synthetic traffic generator (automatic)

Check synthetic traffic logs:
```bash
docker logs cto-sla-dashboard | grep "🤖"
```

Expected output:
```
🤖 Generating synthetic traffic to staging...
✅ Synthetic traffic complete: 4 success, 0 errors
```

### Zero Datapoints in CloudWatch

**Symptom:** Metrics show 0 or empty
**Cause:** No requests reaching ALB
**Solution:**
1. Verify ECS tasks are running
2. Check ALB target health
3. Ensure security groups allow traffic

### High Error Rates

**Symptom:** Error rate > 1 error/hour
**Cause:** Application issues (e.g., JWT expiration logged as ERROR)
**Solution:** Fix application code, redeploy

Example fix: [JWT Expiration Fix](./ERROR_ANALYSIS_2026-03-22.md)

---

## 📝 References

- AWS CloudWatch Metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/working_with_metrics.html
- AWS ALB Metrics: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- CTO SLA Dashboard: https://a-cto.swapegypt.app
- Error Analysis: `docs/ERROR_ANALYSIS_2026-03-22.md`

---

**Last Updated:** 2026-03-23
**Maintained By:** Homains DevOps Team
**Version:** 1.0
