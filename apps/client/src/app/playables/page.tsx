'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useState } from 'react'

export default function PlayablesPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'draft',
  })
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const { data: playables, isLoading, error } = useQuery({
    queryKey: ['playables'],
    queryFn: () => apiClient.getPlayables(),
  })

  // Query analytics for the last 365 days to show all data
  const { data: analyticsData } = useQuery({
    queryKey: ['playables-analytics'],
    queryFn: () => {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setFullYear(startDate.getFullYear() - 1) // Last year
      return apiClient.getAnalyticsByPlayable(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      )
    },
    refetchInterval: 5000,
  })

  const getPlayableAnalytics = (playableId: number) => {
    return analyticsData?.find(a => a.playable_id === playableId)?.summary || {
      total_impressions: 0,
      total_clicks: 0,
      total_installs: 0,
      ctr: 0,
      ipm: 0
    }
  }

  const createMutation = useMutation({
    mutationFn: apiClient.createPlayable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playables'] })
      queryClient.invalidateQueries({ queryKey: ['playables-analytics'] })
      setShowForm(false)
      setFormData({ name: '', description: '', status: 'draft' })
      showNotification('Playable created successfully!', 'success')
    },
    onError: (error) => {
      console.error('Failed to create playable:', error)
      showNotification(`Failed to create playable: ${error.message}`, 'error')
    },
  })

  const trackEventMutation = useMutation({
    mutationFn: ({ playableId, eventType }: { playableId: number, eventType: string }) =>
      apiClient.trackEvent({
        playable_id: playableId,
        type: eventType as 'impression' | 'click' | 'install',
      }),
    onSuccess: (_, variables) => {
      // Immediately invalidate to refetch analytics
      queryClient.invalidateQueries({ queryKey: ['playables-analytics'] })
      showNotification(`${variables.eventType.charAt(0).toUpperCase() + variables.eventType.slice(1)} event tracked successfully!`, 'success')
    },
    onError: (error) => {
      console.error('Failed to track event:', error)
      showNotification(`Failed to track event: ${error.message}`, 'error')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  const handleTrackEvent = (playableId: number, eventType: string) => {
    trackEventMutation.mutate({ playableId, eventType })
  }

  if (error) {
    return (
      <div className="card" style={{ borderLeft: '3px solid #dc2626' }}>
        <p style={{ color: '#dc2626' }}>Error loading playables: {(error as Error).message}</p>
      </div>
    )
  }

  return (
    <div>
      {notification && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 1000,
          padding: '16px 24px',
          borderRadius: '8px',
          background: notification.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          fontWeight: '500',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          animation: 'slideInRight 0.3s ease-out',
          maxWidth: '400px'
        }}>
          {notification.message}
        </div>
      )}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px'
      }}>
        <div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '600',
            color: '#171717',
            marginBottom: '8px',
            letterSpacing: '-0.02em'
          }}>
            Playables
          </h1>
          <p style={{ color: '#737373', fontSize: '14px' }}>
            Manage your interactive ad creatives
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'New Playable'}
        </button>
      </div>

      {!showForm && (
        <div className="card" style={{ marginBottom: '24px', background: '#fafafa' }}>
          <p style={{ fontSize: '14px', color: '#737373', lineHeight: '1.6' }}>
            Track events to simulate user interactions. Events are processed through NATS and stored in ClickHouse.
            Check the Analytics page after a few seconds to see results.
          </p>
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '24px',
            color: '#171717'
          }}>
            Create New Playable
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label className="label">Name</label>
              <input
                className="input"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter playable name"
                required
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label className="label">Description</label>
              <textarea
                className="input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your playable"
                rows={3}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label className="label">Status</label>
              <select
                className="input"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Playable'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <p style={{ color: '#737373' }}>Loading playables...</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', color: '#737373' }}>
                Total: {playables?.length || 0} playables
              </p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Views</th>
                    <th style={{ textAlign: 'center' }}>Clicks</th>
                    <th style={{ textAlign: 'center' }}>Installs</th>
                    <th style={{ textAlign: 'center' }}>CTR</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {playables?.map((playable) => {
                    const analytics = getPlayableAnalytics(playable.id)
                    return (
                    <tr key={playable.id}>
                      <td style={{ fontWeight: '500', color: '#737373' }}>#{playable.id}</td>
                      <td style={{ fontWeight: '500' }}>{playable.name}</td>
                      <td>
                        <span className={`badge ${
                          playable.status === 'active' ? 'badge-success' :
                          playable.status === 'draft' ? 'badge-warning' :
                          'badge-info'
                        }`}>
                          {playable.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {analytics.total_impressions}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {analytics.total_clicks}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {analytics.total_installs}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {analytics.ctr.toFixed(2)}%
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleTrackEvent(playable.id, 'impression')}
                            disabled={trackEventMutation.isPending}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleTrackEvent(playable.id, 'click')}
                            disabled={trackEventMutation.isPending}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                          >
                            Click
                          </button>
                          <button
                            onClick={() => handleTrackEvent(playable.id, 'install')}
                            disabled={trackEventMutation.isPending}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                          >
                            Install
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
