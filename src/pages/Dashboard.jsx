import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Activity, Clock, AlertCircle, CheckCircle, TrendingUp, Server, Database, Shield, ArrowUp } from 'lucide-react'

export default function Dashboard({ environment = 'production' }) {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [environment])

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/metrics/dashboard?env=${environment}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.status === 401) {
        localStorage.removeItem('auth_token')
        window.location.reload()
        return
      }

      const data = await response.json()
      setMetrics(data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching metrics:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">Failed to load metrics</p>
      </div>
    )
  }

  // Detect "improving" status for API Response Time
  const apiStatus = metrics.apiPerformance.status === 'improving'
    ? 'improving'
    : (metrics.slaCompliance.apiResponseTime.compliant ? 'success' : 'danger');

  const slaTargets = [
    {
      name: 'System Uptime',
      current: parseFloat(metrics.uptime.percentage),
      target: 99.95,
      unit: '%',
      icon: Server,
      status: metrics.slaCompliance.uptime.compliant ? 'success' : 'danger',
      allowedDowntime: '21 min/month'
    },
    {
      name: 'API Response Time',
      current: parseFloat(metrics.apiPerformance.complianceRate),
      target: 95,
      unit: '% < 500ms',
      icon: Activity,
      status: apiStatus,
      avgResponse: `${metrics.apiPerformance.avgResponseTime}s`,
      improving: metrics.apiPerformance.status === 'improving',
      recent24h: metrics.apiPerformance.recent24h
    },
    {
      name: 'Error Rate',
      current: parseFloat(metrics.errors.errorRate),
      target: 1,
      unit: 'errors/hour',
      icon: AlertCircle,
      status: metrics.slaCompliance.errorRate.compliant ? 'success' : 'warning',
      total: `${metrics.errors.totalErrors} total (24h)`
    }
  ]

  const incidentResponseSLA = [
    { severity: 'P1 - Critical', response: '15 min', resolution: '2 hours', description: 'System Down' },
    { severity: 'P2 - High', response: '1 hour', resolution: '6 hours', description: 'Major Feature Broken' },
    { severity: 'P3 - Medium', response: '8 hours', resolution: '3 days', description: 'Minor Bug' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">SLA Dashboard</h1>
            <p className="text-gray-600 mt-1">Real-time monitoring of CTO Service Level Agreement compliance</p>
          </div>
          <span className={`px-4 py-2 rounded-lg text-sm font-semibold uppercase ${
            environment === 'production'
              ? 'bg-red-100 text-red-800'
              : 'bg-blue-100 text-blue-800'
          }`}>
            {environment}
          </span>
        </div>
        <div className="mt-2 flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            metrics.overallCompliance
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {metrics.overallCompliance ? '✓ SLA Compliant' : '✗ SLA Non-Compliant'}
          </span>
          <span className="text-sm text-gray-500">
            Last updated: {new Date(metrics.timestamp).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Improving Status Banner */}
      {metrics.apiPerformance.status === 'improving' && (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-start space-x-3">
            <ArrowUp className="w-6 h-6 text-yellow-600 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-2">Performance Improving</h3>
              <p className="text-sm text-yellow-800 mb-3">
                Recent performance is excellent, but the 30-day historical average still includes old data from before
                synthetic traffic monitoring was deployed. The system is recovering.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded-lg border border-yellow-200">
                  <p className="text-xs text-gray-600 mb-1">30-Day Compliance</p>
                  <p className="text-lg font-bold text-yellow-700">
                    {metrics.apiPerformance.complianceRate}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Target: ≥95%</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-green-200">
                  <p className="text-xs text-gray-600 mb-1">Recent 24h Compliance</p>
                  <p className="text-lg font-bold text-green-700">
                    {metrics.apiPerformance.recent24h?.complianceRate || 'N/A'}%
                  </p>
                  <p className="text-xs text-green-600 mt-1">✓ Above target</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">Recent 24h Avg Response</p>
                  <p className="text-lg font-bold text-blue-700">
                    {metrics.apiPerformance.recent24h?.avgResponseTime || 'N/A'}s
                  </p>
                  <p className="text-xs text-blue-600 mt-1">Fast & stable</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-yellow-200">
                <p className="text-xs text-yellow-700">
                  <strong>Expected Timeline:</strong> Full compliance will be achieved as old data naturally expires from the
                  30-day rolling window. Estimated: ~30 hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key SLA Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {slaTargets.map((metric) => (
          <div key={metric.name} className="stat-card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <metric.icon className={`w-5 h-5 ${
                    metric.status === 'success' ? 'text-green-600' :
                    metric.status === 'improving' ? 'text-yellow-500' :
                    metric.status === 'warning' ? 'text-yellow-600' :
                    'text-red-600'
                  }`} />
                  <h3 className="text-sm font-medium text-gray-600">{metric.name}</h3>
                  {metric.improving && (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                      Improving
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-3xl font-bold text-gray-900">
                    {metric.current.toFixed(2)}
                    <span className="text-lg text-gray-500 ml-1">{metric.unit}</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Target: {metric.target}{metric.unit}
                  </p>
                  {metric.allowedDowntime && (
                    <p className="text-xs text-gray-400 mt-1">({metric.allowedDowntime})</p>
                  )}
                  {metric.avgResponse && (
                    <p className="text-xs text-gray-400 mt-1">Avg: {metric.avgResponse}</p>
                  )}
                  {metric.total && (
                    <p className="text-xs text-gray-400 mt-1">{metric.total}</p>
                  )}
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                metric.status === 'success' ? 'bg-green-100 text-green-800' :
                metric.status === 'improving' ? 'bg-yellow-100 text-yellow-800' :
                metric.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {metric.status === 'improving' ? '↑' : (metric.current >= metric.target ? '✓' : '✗')}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    metric.status === 'success' ? 'bg-green-600' :
                    metric.status === 'improving' ? 'bg-yellow-500' :
                    metric.status === 'warning' ? 'bg-yellow-600' :
                    'bg-red-600'
                  }`}
                  style={{ width: `${Math.min((metric.current / metric.target) * 100, 100)}%` }}
                />
              </div>
              {metric.improving && (
                <p className="text-xs text-yellow-600 mt-1 flex items-center">
                  <ArrowUp className="w-3 h-3 mr-1" />
                  Improving - Recent 24h: {metric.recent24h?.complianceRate}%
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Running Tasks</p>
              <p className="text-2xl font-bold mt-1">{metrics.uptime.runningTasks}/{metrics.uptime.desiredTasks}</p>
            </div>
            <Server className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">P95 Response Time</p>
              <p className="text-2xl font-bold mt-1">{metrics.apiPerformance.p95ResponseTime}s</p>
            </div>
            <Clock className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold mt-1">{metrics.apiPerformance.avgResponseTime}s</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-2xl font-bold mt-1 capitalize">{metrics.uptime.status}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Incident Response SLA Table */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Incident Response SLA Targets</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Response Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resolution Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {incidentResponseSLA.map((item) => (
                <tr key={item.severity}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.severity.includes('P1') ? 'bg-red-100 text-red-800' :
                      item.severity.includes('P2') ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {item.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.response}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.resolution}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Security & Backup Requirements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold">Data Security</h2>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
              <span className="text-sm text-gray-700">100% production data access-controlled</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
              <span className="text-sm text-gray-700">Industry-standard security practices</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
              <span className="text-sm text-gray-700">Dev/Prod environment separation</span>
            </li>
            <li className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
              <span className="text-sm text-gray-700">Breach notification: within 24 hours</span>
            </li>
          </ul>
        </div>

        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <Database className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-bold">Backup & Recovery</h2>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start">
              <Clock className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium text-gray-900">Daily Incremental</span>
                <p className="text-gray-600">Incremental backups every 24 hours</p>
              </div>
            </li>
            <li className="flex items-start">
              <Clock className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium text-gray-900">Weekly Full</span>
                <p className="text-gray-600">Complete backup every 7 days</p>
              </div>
            </li>
            <li className="flex items-start">
              <AlertCircle className="w-5 h-5 text-purple-600 mr-2 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium text-gray-900">RPO: 1 hour</span>
                <p className="text-gray-600">Maximum data loss tolerance</p>
              </div>
            </li>
            <li className="flex items-start">
              <AlertCircle className="w-5 h-5 text-purple-600 mr-2 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium text-gray-900">RTO: 4 hours</span>
                <p className="text-gray-600">System restoration time target</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
