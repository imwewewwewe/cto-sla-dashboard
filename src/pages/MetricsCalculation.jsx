import { Activity, Clock, AlertCircle, Zap, Info } from 'lucide-react'

export default function MetricsCalculation() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Metrics Calculation Methodology</h1>
        <p className="text-gray-600 mt-2">Understanding how each SLA metric is measured and calculated</p>
      </div>

      {/* Overview */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <Info className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">How It Works</h3>
            <p className="text-sm text-blue-800">
              All metrics are automatically collected from AWS CloudWatch, which monitors the Application Load Balancer (ALB)
              and ECS services. The dashboard queries these metrics every 5 minutes to provide real-time SLA compliance tracking.
            </p>
          </div>
        </div>
      </div>

      {/* Metric 1: System Uptime */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <Activity className="w-8 h-8 text-green-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">System Uptime</h2>
            <p className="text-sm text-gray-600">Target: ≥ 99.95%</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Calculation Formula</h3>
            <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
              Uptime % = (Healthy Hours / Total Hours) × 100
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Data Source</h3>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              <li><strong>AWS CloudWatch Metric:</strong> HealthyHostCount</li>
              <li><strong>Time Window:</strong> Last 30 days (720 hourly datapoints)</li>
              <li><strong>Measurement:</strong> Minimum healthy host count per hour</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">How It's Measured</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <ol className="list-decimal list-inside text-sm text-gray-700 space-y-2">
                <li>CloudWatch records healthy targets in the ALB target group every hour</li>
                <li>Each hour where <strong>Minimum healthy hosts &gt; 0</strong> counts as uptime</li>
                <li>If ANY hour has 0 healthy hosts → counted as downtime</li>
                <li>Percentage = (Uptime hours / 720 hours) × 100</li>
              </ol>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              <strong>✓ Compliant:</strong> ≥ 99.95% (max 22 minutes downtime per month)
            </p>
            <p className="text-sm text-red-800 mt-1">
              <strong>✗ Non-Compliant:</strong> &lt; 99.95%
            </p>
          </div>
        </div>
      </div>

      {/* Metric 2: API Response Time */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <Clock className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">API Response Time</h2>
            <p className="text-sm text-gray-600">Target: ≥ 95% of responses under 500ms</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Calculation Formula</h3>
            <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
              Compliance Rate = (Fast Responses / Total Responses) × 100<br/>
              Fast Response = Average Response Time &lt; 500ms
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Data Source</h3>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              <li><strong>AWS CloudWatch Metric:</strong> TargetResponseTime</li>
              <li><strong>Time Window:</strong> Last 30 days (720 hourly datapoints)</li>
              <li><strong>Statistics:</strong> Average (mean) and Maximum per hour</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">How It's Measured</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <ol className="list-decimal list-inside text-sm text-gray-700 space-y-2">
                <li>ALB records response time for every request processed</li>
                <li>CloudWatch calculates hourly average response time</li>
                <li>Count hours where average response time &lt; 500ms</li>
                <li>Compliance rate = (Compliant hours / 720 hours) × 100</li>
              </ol>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Displayed Metrics:</strong>
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li><strong>Avg Response Time:</strong> Mean of all hourly averages</li>
              <li><strong>P95 Response Time:</strong> Approximated using Maximum value</li>
              <li><strong>Compliance Rate:</strong> Percentage shown on dashboard</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>✓ Compliant:</strong> ≥ 95% (684+ hours out of 720 under 500ms)
            </p>
            <p className="text-sm text-red-800 mt-1">
              <strong>✗ Non-Compliant:</strong> &lt; 95%
            </p>
          </div>
        </div>
      </div>

      {/* Metric 3: Error Rate */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Error Rate</h2>
            <p className="text-sm text-gray-600">Target: &lt; 1 error per hour</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Calculation Formula</h3>
            <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
              Error Rate = Total 5XX Errors / Number of Hours
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Data Source</h3>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              <li><strong>AWS CloudWatch Metric:</strong> HTTPCode_Target_5XX_Count</li>
              <li><strong>Time Window:</strong> Last 24 hours (24 hourly datapoints)</li>
              <li><strong>Error Types:</strong> 500, 502, 503, 504 status codes only</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">How It's Measured</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <ol className="list-decimal list-inside text-sm text-gray-700 space-y-2">
                <li>ALB records every 5XX response returned by backend</li>
                <li>CloudWatch sums errors per hour</li>
                <li>Sum all 5XX errors across 24 hours</li>
                <li>Error rate = Total errors / 24 hours</li>
              </ol>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-2">
              <strong>What Counts as an Error:</strong>
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✓ 500 Internal Server Error (application crashes, unhandled exceptions)</li>
              <li>✓ 502 Bad Gateway (backend unreachable)</li>
              <li>✓ 503 Service Unavailable (backend overloaded)</li>
              <li>✓ 504 Gateway Timeout (backend too slow)</li>
              <li>✗ 4XX Client Errors (NOT counted - user's fault, not server)</li>
            </ul>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              <strong>✓ Healthy:</strong> &lt; 1 error/hour (&lt; 24 errors in 24h)
            </p>
            <p className="text-sm text-red-800 mt-1">
              <strong>✗ Elevated:</strong> ≥ 1 error/hour
            </p>
          </div>
        </div>
      </div>

      {/* Synthetic Traffic System */}
      <div className="card bg-purple-50 border-purple-200">
        <div className="flex items-center space-x-3 mb-4">
          <Zap className="w-8 h-8 text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Synthetic Traffic (Staging Only)</h2>
            <p className="text-sm text-gray-600">Automated monitoring to keep staging metrics fresh</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Problem</h3>
            <p className="text-sm text-gray-700">
              Staging environments typically have zero real user traffic, causing CloudWatch metrics to become
              stale (hours or days old) and making it impossible to validate deployments.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Solution</h3>
            <p className="text-sm text-gray-700 mb-2">
              This dashboard automatically generates traffic to staging endpoints every 3 minutes:
            </p>
            <div className="bg-white p-4 rounded-lg border border-purple-200">
              <ol className="list-decimal list-inside text-sm text-gray-700 space-y-2">
                <li>Dashboard backend runs cron job every 3 minutes</li>
                <li>Sends HTTP GET requests to 4 public staging endpoints</li>
                <li>Staging ALB processes requests and records to CloudWatch</li>
                <li>Metrics update within 5-10 minutes</li>
                <li>Dashboard displays fresh staging data</li>
              </ol>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Traffic Volume</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded-lg border border-purple-200 text-center">
                <p className="text-2xl font-bold text-purple-600">4</p>
                <p className="text-xs text-gray-600 mt-1">Endpoints per cycle</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-purple-200 text-center">
                <p className="text-2xl font-bold text-purple-600">20</p>
                <p className="text-xs text-gray-600 mt-1">Cycles per hour</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-purple-200 text-center">
                <p className="text-2xl font-bold text-purple-600">1,920</p>
                <p className="text-xs text-gray-600 mt-1">Requests per day</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Monitored Endpoints</h3>
            <ul className="list-none text-sm text-gray-700 space-y-1">
              <li className="font-mono bg-white p-2 rounded border border-purple-200">
                GET /api/v1/categories
              </li>
              <li className="font-mono bg-white p-2 rounded border border-purple-200">
                GET /api/v1/locations
              </li>
              <li className="font-mono bg-white p-2 rounded border border-purple-200">
                GET /api/v1/app/version
              </li>
              <li className="font-mono bg-white p-2 rounded border border-purple-200">
                GET /.well-known/assetlinks.json
              </li>
            </ul>
            <p className="text-xs text-gray-600 mt-2">
              * All endpoints are public (no authentication) and read-only (no side effects)
            </p>
          </div>
        </div>
      </div>

      {/* Data Collection Timeline */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Metric Update Timeline</h2>
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-20 text-sm font-mono text-gray-600">T+0:00</div>
              <div className="flex-1">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900">Traffic hits endpoints</p>
                  <p className="text-xs text-blue-700 mt-1">Real users or synthetic monitor</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-20 text-sm font-mono text-gray-600">T+0:01</div>
              <div className="flex-1">
                <div className="bg-green-100 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-green-900">AWS ALB processes requests</p>
                  <p className="text-xs text-green-700 mt-1">Response times and status codes recorded</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-20 text-sm font-mono text-gray-600">T+0:05</div>
              <div className="flex-1">
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-900">CloudWatch aggregates data</p>
                  <p className="text-xs text-yellow-700 mt-1">Metrics published to CloudWatch API</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-20 text-sm font-mono text-gray-600">T+0:10</div>
              <div className="flex-1">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-purple-900">Dashboard fetches metrics</p>
                  <p className="text-xs text-purple-700 mt-1">Backend queries CloudWatch API</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-20 text-sm font-mono text-gray-600">T+0:11</div>
              <div className="flex-1">
                <div className="bg-indigo-100 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-indigo-900">Fresh metrics displayed</p>
                  <p className="text-xs text-indigo-700 mt-1">UI updates with latest SLA data</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm font-semibold text-gray-700">
              Typical delay: <span className="text-blue-600">5-10 minutes</span> from traffic to dashboard
            </p>
          </div>
        </div>
      </div>

      {/* SLA Targets Summary */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">SLA Targets Summary</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Metric</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Target</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Period</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">System Uptime</td>
                <td className="px-4 py-3 text-sm text-gray-700">≥ 99.95%</td>
                <td className="px-4 py-3 text-sm text-gray-700">30 days</td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                    Max 22 min downtime/month
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">API Response Time</td>
                <td className="px-4 py-3 text-sm text-gray-700">≥ 95% under 500ms</td>
                <td className="px-4 py-3 text-sm text-gray-700">30 days</td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    684+ hours compliant
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">Error Rate</td>
                <td className="px-4 py-3 text-sm text-gray-700">&lt; 1 error/hour</td>
                <td className="px-4 py-3 text-sm text-gray-700">24 hours</td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                    &lt; 24 errors/day
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Note */}
      <div className="card bg-gray-50 border-gray-200">
        <p className="text-sm text-gray-600">
          <strong>Note:</strong> All metrics are collected automatically from AWS CloudWatch.
          The dashboard queries these metrics every 5 minutes for production and relies on synthetic traffic
          for staging. Historical data is stored in MongoDB for trend analysis and reporting.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Last updated: March 23, 2026 | Maintained by Homains DevOps Team
        </p>
      </div>
    </div>
  )
}
