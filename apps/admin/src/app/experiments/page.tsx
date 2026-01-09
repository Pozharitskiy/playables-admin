'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useState } from 'react'
import { format, subDays } from 'date-fns'

export default function ExperimentsPage() {
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  })

  const { data: experimentAnalytics, isLoading, error } = useQuery({
    queryKey: ['analytics-experiment', dateRange],
    queryFn: () => apiClient.getAnalyticsByExperiment(dateRange.startDate, dateRange.endDate),
  })

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  const formatPercent = (num: number) => {
    return num.toFixed(2) + '%'
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '600',
          color: '#171717',
          marginBottom: '8px',
          letterSpacing: '-0.02em'
        }}>
          Experiments
        </h1>
        <p style={{ color: '#737373', fontSize: '14px' }}>
          Compare A/B test performance and results
        </p>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label className="label">Start Date</label>
            <input
              className="input"
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            />
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label className="label">End Date</label>
            <input
              className="input"
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: '24px', borderLeft: '3px solid #dc2626' }}>
          <p style={{ color: '#dc2626' }}>
            Error loading experiments: {(error as Error).message}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <p style={{ color: '#737373' }}>Loading experiment data...</p>
          </div>
        </div>
      ) : experimentAnalytics && experimentAnalytics.length > 0 ? (
        <div className="card">
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '14px', color: '#737373' }}>
              Total Experiments: {experimentAnalytics.length}
            </p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Experiment</th>
                  <th>Impressions</th>
                  <th>Clicks</th>
                  <th>Installs</th>
                  <th>CTR</th>
                  <th>IPM</th>
                </tr>
              </thead>
              <tbody>
                {experimentAnalytics.map((item) => (
                  <tr key={item.experiment_id}>
                    <td style={{ fontWeight: '500' }}>{item.experiment_name}</td>
                    <td>{formatNumber(item.summary.total_impressions)}</td>
                    <td>{formatNumber(item.summary.total_clicks)}</td>
                    <td>{formatNumber(item.summary.total_installs)}</td>
                    <td>{formatPercent(item.summary.ctr)}</td>
                    <td>{item.summary.ipm.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <p style={{ color: '#737373', marginBottom: '8px' }}>No experiment data available</p>
            <p style={{ color: '#a3a3a3', fontSize: '14px' }}>
              Try adjusting the date range
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
