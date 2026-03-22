import { useState, useEffect } from 'react'
import { AlertTriangle, Clock, CheckCircle, XCircle, Plus, Search } from 'lucide-react'
import { format, differenceInMinutes } from 'date-fns'

export default function Incidents() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchIncidents()
  }, [])

  const fetchIncidents = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/incidents', {
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
      setIncidents(data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching incidents:', error)
      setLoading(false)
    }
  }

  const createIncident = async (incidentData) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(incidentData)
      })

      if (response.status === 401) {
        localStorage.removeItem('auth_token')
        window.location.reload()
        return
      }

      const newIncident = await response.json()
      setIncidents([newIncident, ...incidents])
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating incident:', error)
    }
  }

  const updateIncidentStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('auth_token')
      await fetch(`/api/incidents/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, resolvedAt: status === 'resolved' ? new Date() : null })
      })
      fetchIncidents()
    } catch (error) {
      console.error('Error updating incident:', error)
    }
  }

  const calculateResponseCompliance = (incident) => {
    if (!incident.respondedAt) return null

    const responseTime = differenceInMinutes(
      new Date(incident.respondedAt),
      new Date(incident.createdAt)
    )

    const slaTargets = {
      P1: 15,
      P2: 60,
      P3: 480
    }

    const target = slaTargets[incident.severity]
    return {
      minutes: responseTime,
      compliant: responseTime <= target,
      target
    }
  }

  const calculateResolutionCompliance = (incident) => {
    if (!incident.resolvedAt) return null

    const resolutionTime = differenceInMinutes(
      new Date(incident.resolvedAt),
      new Date(incident.createdAt)
    )

    const slaTargets = {
      P1: 120,
      P2: 360,
      P3: 4320 // 3 days
    }

    const target = slaTargets[incident.severity]
    return {
      minutes: resolutionTime,
      compliant: resolutionTime <= target,
      target
    }
  }

  const filteredIncidents = incidents
    .filter(inc => filter === 'all' || inc.status === filter)
    .filter(inc =>
      inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )

  const stats = {
    total: incidents.length,
    open: incidents.filter(i => i.status === 'open').length,
    inProgress: incidents.filter(i => i.status === 'in-progress').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
    p1: incidents.filter(i => i.severity === 'P1').length,
    p2: incidents.filter(i => i.severity === 'P2').length,
    p3: incidents.filter(i => i.severity === 'P3').length
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
          <h1 className="text-3xl font-bold text-gray-900">Incidents</h1>
          <p className="text-gray-600 mt-1">Track and manage incidents with SLA response times</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Incident
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="card">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Open</p>
          <p className="text-2xl font-bold mt-1 text-yellow-600">{stats.open}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">In Progress</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">{stats.inProgress}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Resolved</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{stats.resolved}</p>
        </div>
        <div className="card">
          <p className="text-sm text-red-600">P1 Critical</p>
          <p className="text-2xl font-bold mt-1">{stats.p1}</p>
        </div>
        <div className="card">
          <p className="text-sm text-yellow-600">P2 High</p>
          <p className="text-2xl font-bold mt-1">{stats.p2}</p>
        </div>
        <div className="card">
          <p className="text-sm text-blue-600">P3 Medium</p>
          <p className="text-2xl font-bold mt-1">{stats.p3}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('open')}
              className={`px-4 py-2 rounded-md ${filter === 'open' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Open
            </button>
            <button
              onClick={() => setFilter('in-progress')}
              className={`px-4 py-2 rounded-md ${filter === 'in-progress' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              In Progress
            </button>
            <button
              onClick={() => setFilter('resolved')}
              className={`px-4 py-2 rounded-md ${filter === 'resolved' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Resolved
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search incidents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-md w-full md:w-64"
            />
          </div>
        </div>
      </div>

      {/* Incidents List */}
      <div className="space-y-4">
        {filteredIncidents.map((incident) => {
          const responseCompliance = calculateResponseCompliance(incident)
          const resolutionCompliance = calculateResolutionCompliance(incident)

          return (
            <div key={incident._id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      incident.severity === 'P1' ? 'bg-red-100 text-red-800' :
                      incident.severity === 'P2' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {incident.severity}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      incident.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                      incident.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {incident.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(incident.createdAt), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mt-2">{incident.title}</h3>
                  {incident.description && (
                    <p className="text-sm text-gray-600 mt-1">{incident.description}</p>
                  )}

                  <div className="mt-3 flex items-center space-x-6 text-sm">
                    {responseCompliance && (
                      <div className="flex items-center space-x-2">
                        {responseCompliance.compliant ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="text-gray-700">
                          Response: {responseCompliance.minutes}min (Target: {responseCompliance.target}min)
                        </span>
                      </div>
                    )}

                    {resolutionCompliance && (
                      <div className="flex items-center space-x-2">
                        {resolutionCompliance.compliant ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="text-gray-700">
                          Resolution: {Math.floor(resolutionCompliance.minutes / 60)}h {resolutionCompliance.minutes % 60}min
                          (Target: {Math.floor(resolutionCompliance.target / 60)}h)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  {incident.status !== 'resolved' && (
                    <>
                      {incident.status === 'open' && (
                        <button
                          onClick={() => updateIncidentStatus(incident._id, 'in-progress')}
                          className="btn-primary text-sm"
                        >
                          Start Working
                        </button>
                      )}
                      <button
                        onClick={() => updateIncidentStatus(incident._id, 'resolved')}
                        className="btn-secondary text-sm"
                      >
                        Resolve
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {filteredIncidents.length === 0 && (
          <div className="text-center py-12 card">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No incidents found</p>
          </div>
        )}
      </div>

      {/* Create Incident Modal */}
      {showCreateModal && (
        <CreateIncidentModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createIncident}
        />
      )}
    </div>
  )
}

function CreateIncidentModal({ onClose, onCreate }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'P3',
    status: 'open'
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onCreate({
      ...formData,
      respondedAt: new Date()
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Create New Incident</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Severity
            </label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="P1">P1 - Critical (System Down)</option>
              <option value="P2">P2 - High (Major Feature Broken)</option>
              <option value="P3">P3 - Medium (Minor Bug)</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
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
              Create Incident
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
