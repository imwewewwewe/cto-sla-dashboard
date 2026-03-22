import { useState, useEffect } from 'react'
import { TrendingUp, AlertTriangle, Plus, Filter } from 'lucide-react'

export default function TechnicalDebt() {
  const [debts, setDebts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchDebts()
  }, [])

  const fetchDebts = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/technical-debt', {
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
      setDebts(data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching technical debt:', error)
      setLoading(false)
    }
  }

  const createDebt = async (debtData) => {
    try {
      const token = localStorage.getItem('auth_token')
      await fetch('/api/technical-debt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(debtData)
      })
      fetchDebts()
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating technical debt:', error)
    }
  }

  const filteredDebts = debts.filter(debt =>
    filter === 'all' || debt.status === filter
  )

  const stats = {
    total: debts.length,
    open: debts.filter(d => d.status === 'open').length,
    inProgress: debts.filter(d => d.status === 'in-progress').length,
    resolved: debts.filter(d => d.status === 'resolved').length,
    critical: debts.filter(d => d.priority === 'critical').length,
    high: debts.filter(d => d.priority === 'high').length,
    medium: debts.filter(d => d.priority === 'medium').length,
    low: debts.filter(d => d.priority === 'low').length
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
          <h1 className="text-3xl font-bold text-gray-900">Technical Debt</h1>
          <p className="text-gray-600 mt-1">Track and manage codebase flexibility and experimentation readiness</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Technical Debt
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
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
          <p className="text-sm text-red-600">Critical</p>
          <p className="text-2xl font-bold mt-1">{stats.critical}</p>
        </div>
        <div className="card">
          <p className="text-sm text-orange-600">High</p>
          <p className="text-2xl font-bold mt-1">{stats.high}</p>
        </div>
        <div className="card">
          <p className="text-sm text-yellow-600">Medium</p>
          <p className="text-2xl font-bold mt-1">{stats.medium}</p>
        </div>
        <div className="card">
          <p className="text-sm text-blue-600">Low</p>
          <p className="text-2xl font-bold mt-1">{stats.low}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-500" />
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
      </div>

      {/* SLA Requirements Info */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <TrendingUp className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Codebase Flexibility & Experimentation Readiness</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• Codebase must be modular and maintainable</li>
              <li>• Features can be added/removed without major refactoring</li>
              <li>• New features and experiments can be developed, tested, and rolled back without impacting stability</li>
              <li>• Major technical debt risks must be identified, documented, and communicated</li>
              <li>• Trade-offs between speed, stability, and scalability should be clearly explained</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Technical Debt List */}
      <div className="space-y-4">
        {filteredDebts.map((debt) => (
          <div key={debt._id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    debt.priority === 'critical' ? 'bg-red-100 text-red-800' :
                    debt.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    debt.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {debt.priority.toUpperCase()}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    debt.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                    debt.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {debt.status}
                  </span>
                  {debt.category && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {debt.category}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mt-3">{debt.title}</h3>
                <p className="text-sm text-gray-600 mt-2">{debt.description}</p>

                {debt.impact && (
                  <div className="mt-3">
                    <span className="text-xs font-medium text-gray-700">Impact:</span>
                    <p className="text-sm text-gray-600 mt-1">{debt.impact}</p>
                  </div>
                )}

                {debt.proposedSolution && (
                  <div className="mt-2">
                    <span className="text-xs font-medium text-gray-700">Proposed Solution:</span>
                    <p className="text-sm text-gray-600 mt-1">{debt.proposedSolution}</p>
                  </div>
                )}

                {debt.tradeoffs && (
                  <div className="mt-2">
                    <span className="text-xs font-medium text-gray-700">Trade-offs:</span>
                    <p className="text-sm text-gray-600 mt-1">{debt.tradeoffs}</p>
                  </div>
                )}

                {debt.estimatedEffort && (
                  <div className="mt-3 text-sm text-gray-600">
                    <span className="font-medium">Estimated Effort:</span> {debt.estimatedEffort}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredDebts.length === 0 && (
          <div className="text-center py-12 card">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No technical debt items found</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateDebtModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createDebt}
        />
      )}
    </div>
  )
}

function CreateDebtModal({ onClose, onCreate }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'open',
    category: '',
    impact: '',
    proposedSolution: '',
    tradeoffs: '',
    estimatedEffort: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onCreate(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Add Technical Debt</h2>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select category...</option>
                <option value="architecture">Architecture</option>
                <option value="code-quality">Code Quality</option>
                <option value="performance">Performance</option>
                <option value="security">Security</option>
                <option value="scalability">Scalability</option>
                <option value="testing">Testing</option>
                <option value="documentation">Documentation</option>
                <option value="infrastructure">Infrastructure</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Describe the technical debt..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Impact
            </label>
            <textarea
              rows={3}
              value={formData.impact}
              onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="What is the impact on the system?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proposed Solution
            </label>
            <textarea
              rows={3}
              value={formData.proposedSolution}
              onChange={(e) => setFormData({ ...formData, proposedSolution: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="How can this be addressed?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trade-offs
            </label>
            <textarea
              rows={2}
              value={formData.tradeoffs}
              onChange={(e) => setFormData({ ...formData, tradeoffs: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Trade-offs between speed, stability, and scalability..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Effort
            </label>
            <input
              type="text"
              value={formData.estimatedEffort}
              onChange={(e) => setFormData({ ...formData, estimatedEffort: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="e.g., 2-3 days, 1 sprint, etc."
            />
          </div>

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
              Add Technical Debt
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
