import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { CloudWatchClient, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch';
import { ECSClient, DescribeServicesCommand, DescribeTasksCommand, ListTasksCommand } from '@aws-sdk/client-ecs';
import { MongoClient } from 'mongodb';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../dist')));

// Authentication configuration
const DASHBOARD_USERNAME = process.env.DASHBOARD_USERNAME || 'admin';
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'SwapCTO2026!';
const AUTH_SECRET = process.env.AUTH_SECRET || 'cto-sla-dashboard-secret-key-2026';

// Simple token store (in production, use Redis or database)
const activeSessions = new Map();

// Authentication middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);

  if (!activeSessions.has(token)) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const session = activeSessions.get(token);
  if (Date.now() > session.expires) {
    activeSessions.delete(token);
    return res.status(401).json({ error: 'Session expired' });
  }

  req.user = session.username;
  next();
}

// AWS Clients
const cloudwatchClient = new CloudWatchClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const ecsClient = new ECSClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// MongoDB Connection
let mongoClient;
let db;

async function connectMongo() {
  try {
    mongoClient = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27017');
    await mongoClient.connect();
    db = mongoClient.db('sla-monitoring');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}

// Store metrics in memory and MongoDB
const metricsStore = {
  uptime: [],
  apiResponseTime: [],
  errorRates: [],
  incidents: [],
  backups: []
};

// Environment configuration with real AWS resources
const AWS_CONFIG = {
  production: {
    cluster: 'prod-swap-cluster',
    service: 'prod-swap-swap-app',
    targetGroup: 'targetgroup/prod-swap-swap-app-tg/f9e0ec4bc74c0adf',
    loadBalancer: 'app/swap-prod-alb/5294a429ae8bf07c'
  },
  staging: {
    cluster: 'dev-swap-cluster',
    service: 'dev-swap-swap-app',
    targetGroup: 'targetgroup/dev-swap-swap-app-tg/939ea8b389f1878c',
    loadBalancer: 'app/swap-dev-alb/215d64e5d70d93a4'
  }
};

// Calculate uptime percentage
async function calculateUptime(environment) {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days

  try {
    const config = AWS_CONFIG[environment];
    if (!config) {
      throw new Error(`Invalid environment: ${environment}`);
    }

    // Get service status from ECS
    const describeCommand = new DescribeServicesCommand({
      cluster: config.cluster,
      services: [config.service]
    });

    const serviceData = await ecsClient.send(describeCommand);
    const serviceInfo = serviceData.services[0];

    if (!serviceInfo) {
      throw new Error(`Service ${config.service} not found in cluster ${config.cluster}`);
    }

    // Get CloudWatch metrics for ALB health
    const metricsCommand = new GetMetricStatisticsCommand({
      Namespace: 'AWS/ApplicationELB',
      MetricName: 'HealthyHostCount',
      Dimensions: [
        {
          Name: 'TargetGroup',
          Value: config.targetGroup
        }
      ],
      StartTime: startTime,
      EndTime: endTime,
      Period: 3600, // 1 hour
      Statistics: ['Average', 'Minimum']
    });

    const metricsData = await cloudwatchClient.send(metricsCommand);

    // Calculate uptime from healthy host count
    const datapoints = metricsData.Datapoints || [];
    const totalPoints = datapoints.length;
    const healthyPoints = datapoints.filter(dp => dp.Minimum > 0).length;

    const uptimePercentage = totalPoints > 0 ? (healthyPoints / totalPoints) * 100 : 100;

    return {
      percentage: uptimePercentage.toFixed(4),
      status: uptimePercentage >= 99.95 ? 'healthy' : 'degraded',
      runningTasks: serviceInfo.runningCount,
      desiredTasks: serviceInfo.desiredCount,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error calculating uptime:', error);
    return {
      percentage: 0,
      status: 'error',
      error: error.message,
      runningTasks: 0,
      desiredTasks: 0,
      timestamp: new Date().toISOString()
    };
  }
}

// Get API response time metrics
async function getAPIResponseMetrics(environment) {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    const config = AWS_CONFIG[environment];
    if (!config) {
      throw new Error(`Invalid environment: ${environment}`);
    }

    const command = new GetMetricStatisticsCommand({
      Namespace: 'AWS/ApplicationELB',
      MetricName: 'TargetResponseTime',
      Dimensions: [
        {
          Name: 'LoadBalancer',
          Value: config.loadBalancer
        }
      ],
      StartTime: startTime,
      EndTime: endTime,
      Period: 3600,
      Statistics: ['Average', 'Maximum'],
      ExtendedStatistics: ['p95']
    });

    const data = await cloudwatchClient.send(command);
    const datapoints = data.Datapoints || [];

    const avgResponseTime = datapoints.length > 0
      ? datapoints.reduce((sum, dp) => sum + dp.Average, 0) / datapoints.length
      : 0;

    const p95ResponseTime = datapoints.length > 0
      ? Math.max(...datapoints.map(dp => dp.Maximum || 0))
      : 0;

    const complianceRate = datapoints.length > 0
      ? (datapoints.filter(dp => dp.Average < 0.5).length / datapoints.length * 100)
      : 100;

    return {
      avgResponseTime: avgResponseTime.toFixed(3),
      p95ResponseTime: p95ResponseTime.toFixed(3),
      complianceRate: complianceRate.toFixed(2),
      status: complianceRate >= 95 ? 'compliant' : 'non-compliant',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting API metrics:', error);
    return {
      avgResponseTime: 0,
      p95ResponseTime: 0,
      complianceRate: 0,
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Get error rates
async function getErrorRates(environment) {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

  try {
    const config = AWS_CONFIG[environment];
    if (!config) {
      throw new Error(`Invalid environment: ${environment}`);
    }

    const command = new GetMetricStatisticsCommand({
      Namespace: 'AWS/ApplicationELB',
      MetricName: 'HTTPCode_Target_5XX_Count',
      Dimensions: [
        {
          Name: 'LoadBalancer',
          Value: config.loadBalancer
        }
      ],
      StartTime: startTime,
      EndTime: endTime,
      Period: 3600,
      Statistics: ['Sum']
    });

    const data = await cloudwatchClient.send(command);
    const datapoints = data.Datapoints || [];

    const totalErrors = datapoints.reduce((sum, dp) => sum + (dp.Sum || 0), 0);
    const errorRate = datapoints.length > 0 ? totalErrors / datapoints.length : 0;

    return {
      totalErrors,
      errorRate: errorRate.toFixed(2),
      status: errorRate < 1 ? 'healthy' : 'elevated',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting error rates:', error);
    return {
      totalErrors: 0,
      errorRate: 0,
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// API Endpoints

// Public health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Authentication endpoints
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (username === DASHBOARD_USERNAME && password === DASHBOARD_PASSWORD) {
    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

    activeSessions.set(token, {
      username,
      expires,
      createdAt: Date.now()
    });

    console.log(`User ${username} logged in successfully`);

    res.json({
      token,
      expiresIn: 86400 // seconds
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/api/auth/verify', requireAuth, (req, res) => {
  res.json({ valid: true, user: req.user });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader.substring(7);
  activeSessions.delete(token);
  res.json({ success: true });
});

app.get('/api/metrics/uptime', requireAuth, async (req, res) => {
  try {
    const environment = req.query.env || 'production';
    const uptime = await calculateUptime(environment);
    res.json(uptime);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/metrics/api-performance', requireAuth, async (req, res) => {
  try {
    const environment = req.query.env || 'production';
    const metrics = await getAPIResponseMetrics(environment);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/metrics/errors', requireAuth, async (req, res) => {
  try {
    const environment = req.query.env || 'production';
    const errors = await getErrorRates(environment);
    res.json(errors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/metrics/dashboard', requireAuth, async (req, res) => {
  try {
    const environment = req.query.env || 'production';

    const [uptime, apiPerf, errors] = await Promise.all([
      calculateUptime(environment),
      getAPIResponseMetrics(environment),
      getErrorRates(environment)
    ]);

    // Calculate SLA compliance
    const slaCompliance = {
      uptime: {
        current: parseFloat(uptime.percentage),
        target: 99.95,
        compliant: parseFloat(uptime.percentage) >= 99.95
      },
      apiResponseTime: {
        current: parseFloat(apiPerf.complianceRate),
        target: 95,
        compliant: parseFloat(apiPerf.complianceRate) >= 95
      },
      errorRate: {
        current: parseFloat(errors.errorRate),
        target: 1,
        compliant: parseFloat(errors.errorRate) < 1
      }
    };

    const overallCompliance = Object.values(slaCompliance).every(metric => metric.compliant);

    res.json({
      environment,
      timestamp: new Date().toISOString(),
      uptime,
      apiPerformance: apiPerf,
      errors,
      slaCompliance,
      overallCompliance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Incidents Management
app.get('/api/incidents', requireAuth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const incidents = await db.collection('incidents')
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    res.json(incidents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/incidents', requireAuth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const incident = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('incidents').insertOne(incident);
    res.json({ ...incident, _id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/incidents/:id', requireAuth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { ObjectId } = require('mongodb');
    const result = await db.collection('incidents').updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          ...req.body,
          updatedAt: new Date()
        }
      }
    );

    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Backup status
app.get('/api/backups/status', requireAuth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const latestBackups = await db.collection('backups')
      .find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    // Check compliance
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const lastDailyBackup = latestBackups.find(b => b.type === 'incremental');
    const lastWeeklyBackup = latestBackups.find(b => b.type === 'full');

    const dailyCompliant = lastDailyBackup && new Date(lastDailyBackup.timestamp) > oneDayAgo;
    const weeklyCompliant = lastWeeklyBackup && new Date(lastWeeklyBackup.timestamp) > oneWeekAgo;

    res.json({
      latestBackups,
      compliance: {
        daily: {
          compliant: dailyCompliant,
          lastBackup: lastDailyBackup?.timestamp,
          status: dailyCompliant ? 'compliant' : 'overdue'
        },
        weekly: {
          compliant: weeklyCompliant,
          lastBackup: lastWeeklyBackup?.timestamp,
          status: weeklyCompliant ? 'compliant' : 'overdue'
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reports
app.get('/api/reports/weekly', requireAuth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const reports = await db.collection('weekly_reports')
      .find({})
      .sort({ weekEnding: -1 })
      .limit(12)
      .toArray();

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reports/weekly', requireAuth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const report = {
      ...req.body,
      createdAt: new Date()
    };

    const result = await db.collection('weekly_reports').insertOne(report);
    res.json({ ...report, _id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/monthly', requireAuth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const reports = await db.collection('monthly_reports')
      .find({})
      .sort({ monthEnding: -1 })
      .limit(12)
      .toArray();

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reports/monthly', requireAuth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const report = {
      ...req.body,
      createdAt: new Date()
    };

    const result = await db.collection('monthly_reports').insertOne(report);
    res.json({ ...report, _id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Technical debt tracking
app.get('/api/technical-debt', requireAuth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const debts = await db.collection('technical_debt')
      .find({})
      .sort({ priority: 1, createdAt: -1 })
      .toArray();

    res.json(debts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/technical-debt', requireAuth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const debt = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('technical_debt').insertOne(debt);
    res.json({ ...debt, _id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Catch-all route to serve React app for non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Scheduled metrics collection (every 5 minutes)
cron.schedule('*/5 * * * *', async () => {
  console.log('Collecting metrics...');
  try {
    const [prodUptime, prodApiPerf, prodErrors] = await Promise.all([
      calculateUptime('production'),
      getAPIResponseMetrics('production'),
      getErrorRates('production')
    ]);

    if (db) {
      await db.collection('metrics_history').insertOne({
        environment: 'production',
        timestamp: new Date(),
        uptime: prodUptime,
        apiPerformance: prodApiPerf,
        errors: prodErrors
      });
    }

    console.log('Metrics collected successfully');
  } catch (error) {
    console.error('Error collecting metrics:', error);
  }
});

// Start server
connectMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`CTO SLA Dashboard API running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  if (mongoClient) {
    await mongoClient.close();
  }
  process.exit(0);
});
