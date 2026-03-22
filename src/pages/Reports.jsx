import { useState, useEffect } from 'react'
import { FileText, Download, Plus, Calendar } from 'lucide-react'
import { format } from 'date-fns'

export default function Reports() {
  const [weeklyReports, setWeeklyReports] = useState([])
  const [monthlyReports, setMonthlyReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [reportType, setReportType] = useState('weekly')

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const [weekly, monthly] = await Promise.all([
        fetch('/api/reports/weekly').then(r => r.json()),
        fetch('/api/reports/monthly').then(r => r.json())
      ])
      setWeeklyReports(weekly)
      setMonthlyReports(monthly)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching reports:', error)
      setLoading(false)
    }
  }

  const createReport = async (reportData) => {
    try {
      const endpoint = reportType === 'weekly' ? '/api/reports/weekly' : '/api/reports/monthly'
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      })
      fetchReports()
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating report:', error)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">Weekly and monthly technical reports as per SLA requirements</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Report
        </button>
      </div>

      {/* Weekly Reports */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Weekly Reports</h2>
        <p className="text-sm text-gray-600 mb-4">
          Weekly updates covering system health, identified risks, and ongoing improvements
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {weeklyReports.map((report) => (
            <div key={report._id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold">Week of {format(new Date(report.weekEnding), 'MMM dd, yyyy')}</h3>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">System Health:</span>
                  <p className="text-gray-600 mt-1">{report.systemHealth}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Risks:</span>
                  <p className="text-gray-600 mt-1">{report.risks || 'None identified'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Improvements:</span>
                  <p className="text-gray-600 mt-1">{report.improvements}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Created {format(new Date(report.createdAt), 'MMM dd, yyyy')}
                </span>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center">
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </button>
              </div>
            </div>
          ))}

          {weeklyReports.length === 0 && (
            <div className="col-span-full text-center py-12 card">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No weekly reports yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Reports */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Monthly Reports</h2>
        <p className="text-sm text-gray-600 mb-4">
          Monthly technical summaries covering stability, performance, security, and scalability
        </p>
        <div className="space-y-4">
          {monthlyReports.map((report) => (
            <div key={report._id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-6 h-6 text-purple-600" />
                  <div>
                    <h3 className="text-lg font-semibold">
                      {format(new Date(report.monthEnding), 'MMMM yyyy')} Report
                    </h3>
                    <p className="text-sm text-gray-500">
                      Created {format(new Date(report.createdAt), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                <button className="btn-secondary text-sm flex items-center">
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Stability & Performance</h4>
                  <p className="text-sm text-gray-600">{report.stabilityPerformance}</p>

                  <h4 className="font-medium text-gray-900 mt-4 mb-2">Security Status</h4>
                  <p className="text-sm text-gray-600">{report.securityStatus}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Scalability Readiness</h4>
                  <p className="text-sm text-gray-600">{report.scalabilityReadiness}</p>

                  <h4 className="font-medium text-gray-900 mt-4 mb-2">Experimentation Capability</h4>
                  <p className="text-sm text-gray-600">{report.experimentationCapability}</p>
                </div>
              </div>

              {report.keyMetrics && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium text-gray-900 mb-3">Key Metrics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <p className="text-2xl font-bold text-gray-900">{report.keyMetrics.uptime}%</p>
                      <p className="text-xs text-gray-600 mt-1">Uptime</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <p className="text-2xl font-bold text-gray-900">{report.keyMetrics.avgResponseTime}ms</p>
                      <p className="text-xs text-gray-600 mt-1">Avg Response</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <p className="text-2xl font-bold text-gray-900">{report.keyMetrics.incidents}</p>
                      <p className="text-xs text-gray-600 mt-1">Incidents</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <p className="text-2xl font-bold text-gray-900">{report.keyMetrics.deployments}</p>
                      <p className="text-xs text-gray-600 mt-1">Deployments</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {monthlyReports.length === 0 && (
            <div className="text-center py-12 card">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No monthly reports yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Report Modal */}
      {showCreateModal && (
        <CreateReportModal
          reportType={reportType}
          setReportType={setReportType}
          onClose={() => setShowCreateModal(false)}
          onCreate={createReport}
        />
      )}
    </div>
  )
}

function CreateReportModal({ reportType, setReportType, onClose, onCreate }) {
  const [formData, setFormData] = useState({
    weekEnding: format(new Date(), 'yyyy-MM-dd'),
    monthEnding: format(new Date(), 'yyyy-MM-dd'),
    systemHealth: '',
    risks: '',
    improvements: '',
    stabilityPerformance: '',
    securityStatus: '',
    scalabilityReadiness: '',
    experimentationCapability: '',
    keyMetrics: {
      uptime: '',
      avgResponseTime: '',
      incidents: '',
      deployments: ''
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onCreate(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Create New Report</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setReportType('weekly')}
              className={`px-4 py-2 rounded-md ${
                reportType === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setReportType('monthly')}
              className={`px-4 py-2 rounded-md ${
                reportType === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {reportType === 'weekly' ? 'Week Ending' : 'Month Ending'}
            </label>
            <input
              type="date"
              required
              value={reportType === 'weekly' ? formData.weekEnding : formData.monthEnding}
              onChange={(e) => setFormData({
                ...formData,
                [reportType === 'weekly' ? 'weekEnding' : 'monthEnding']: e.target.value
              })}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          {reportType === 'weekly' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System Health
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.systemHealth}
                  onChange={(e) => setFormData({ ...formData, systemHealth: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Overall system health status..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Identified Risks
                </label>
                <textarea
                  rows={3}
                  value={formData.risks}
                  onChange={(e) => setFormData({ ...formData, risks: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Any risks or concerns identified..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ongoing Improvements
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.improvements}
                  onChange={(e) => setFormData({ ...formData, improvements: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Improvements and ongoing work..."
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stability & Performance
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.stabilityPerformance}
                  onChange={(e) => setFormData({ ...formData, stabilityPerformance: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Security Status
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.securityStatus}
                  onChange={(e) => setFormData({ ...formData, securityStatus: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scalability Readiness
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.scalabilityReadiness}
                  onChange={(e) => setFormData({ ...formData, scalabilityReadiness: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Experimentation Capability
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.experimentationCapability}
                  onChange={(e) => setFormData({ ...formData, experimentationCapability: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-medium text-gray-900 mb-3">Key Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Uptime %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.keyMetrics.uptime}
                      onChange={(e) => setFormData({
                        ...formData,
                        keyMetrics: { ...formData.keyMetrics, uptime: e.target.value }
                      })}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Avg Response Time (ms)</label>
                    <input
                      type="number"
                      value={formData.keyMetrics.avgResponseTime}
                      onChange={(e) => setFormData({
                        ...formData,
                        keyMetrics: { ...formData.keyMetrics, avgResponseTime: e.target.value }
                      })}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Total Incidents</label>
                    <input
                      type="number"
                      value={formData.keyMetrics.incidents}
                      onChange={(e) => setFormData({
                        ...formData,
                        keyMetrics: { ...formData.keyMetrics, incidents: e.target.value }
                      })}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Deployments</label>
                    <input
                      type="number"
                      value={formData.keyMetrics.deployments}
                      onChange={(e) => setFormData({
                        ...formData,
                        keyMetrics: { ...formData.keyMetrics, deployments: e.target.value }
                      })}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Create Report
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
