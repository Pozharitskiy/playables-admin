'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useState } from 'react'
import { format, subDays } from 'date-fns'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  })
  const [selectedPlayable, setSelectedPlayable] = useState<number | null>(null)

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['analytics-summary', dateRange],
    queryFn: () => apiClient.getAnalyticsSummary(dateRange.startDate, dateRange.endDate),
  })

  const { data: playableAnalytics, isLoading: playableLoading } = useQuery({
    queryKey: ['analytics-playable', dateRange],
    queryFn: () => apiClient.getAnalyticsByPlayable(dateRange.startDate, dateRange.endDate),
  })

  const { data: timeSeriesData, isLoading: timeSeriesLoading } = useQuery({
    queryKey: ['analytics-timeseries', dateRange],
    queryFn: () => apiClient.getTimeSeriesAllPlayables(dateRange.startDate, dateRange.endDate),
  })

  const { data: playables } = useQuery({
    queryKey: ['playables'],
    queryFn: () => apiClient.getPlayables(),
  })

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  const formatPercent = (num: number) => {
    return num.toFixed(2) + '%'
  }

  // Calculate conversion rates for funnel
  const conversionData = summary ? [
    { stage: 'Impressions', value: 100, count: summary.total_impressions },
    { 
      stage: 'Clicks', 
      value: summary.total_impressions > 0 ? (summary.total_clicks / summary.total_impressions) * 100 : 0,
      count: summary.total_clicks 
    },
    { 
      stage: 'Installs', 
      value: summary.total_impressions > 0 ? (summary.total_installs / summary.total_impressions) * 100 : 0,
      count: summary.total_installs 
    },
  ] : []

  // Prepare combined time series data for overall chart
  const combinedTimeSeries = timeSeriesData?.reduce((acc: any[], playable) => {
    playable.time_series.forEach((data) => {
      const existingDay = acc.find(item => item.date === data.date)
      if (existingDay) {
        existingDay.impressions += data.impressions
        existingDay.clicks += data.clicks
        existingDay.installs += data.installs
      } else {
        acc.push({
          date: data.date,
          impressions: data.impressions,
          clicks: data.clicks,
          installs: data.installs,
        })
      }
    })
    return acc
  }, []).sort((a, b) => a.date.localeCompare(b.date)) || []

  // Get selected playable data
  const selectedPlayableData = selectedPlayable 
    ? timeSeriesData?.find(p => p.playable_id === selectedPlayable)
    : null

  const selectedPlayableInfo = selectedPlayable
    ? playables?.find(p => p.id === selectedPlayable)
    : null

  const selectedPlayableAnalytics = selectedPlayable
    ? playableAnalytics?.find(p => p.playable_id === selectedPlayable)
    : null

  // Create radar chart data for playable comparison
  const radarData = playableAnalytics?.slice(0, 6).map(p => ({
    playable: p.playable_name,
    impressions: p.summary.total_impressions,
    clicks: p.summary.total_clicks,
    installs: p.summary.total_installs,
    ctr: p.summary.ctr,
    ipm: p.summary.ipm,
  })) || []

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}>
          <p style={{ fontWeight: '600', marginBottom: '8px', color: '#171717' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color, fontSize: '14px', marginTop: '4px' }}>
              {entry.name}: <strong>{formatNumber(entry.value)}</strong>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '600',
          color: '#171717',
          marginBottom: '8px',
          letterSpacing: '-0.02em'
        }}>
          📊 Analytics Dashboard
        </h1>
        <p style={{ color: '#737373', fontSize: '14px' }}>
          Comprehensive performance metrics and insights for your playables
        </p>
      </div>

      {/* Date Range Selector */}
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
          <button
            className="btn btn-secondary"
            onClick={() => setDateRange({
              startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
              endDate: format(new Date(), 'yyyy-MM-dd'),
            })}
          >
            Last 7 Days
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setDateRange({
              startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
              endDate: format(new Date(), 'yyyy-MM-dd'),
            })}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summaryLoading ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <p style={{ color: '#737373' }}>Loading summary...</p>
        </div>
      ) : summary ? (
        <>
          <div style={{
            display: 'grid',
            gap: '16px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            marginBottom: '32px'
          }}>
            <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', color: 'white' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', opacity: 0.9 }}>
                👁️ Impressions
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700' }}>
                {formatNumber(summary.total_impressions)}
              </div>
              <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.8 }}>
                Total views of your playables
              </div>
            </div>

            <div className="card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', border: 'none', color: 'white' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', opacity: 0.9 }}>
                👆 Clicks
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700' }}>
                {formatNumber(summary.total_clicks)}
              </div>
              <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.8 }}>
                Users engaged with content
              </div>
            </div>

            <div className="card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', border: 'none', color: 'white' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', opacity: 0.9 }}>
                📱 Installs
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700' }}>
                {formatNumber(summary.total_installs)}
              </div>
              <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.8 }}>
                Successful conversions
              </div>
            </div>

            <div className="card" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', border: 'none', color: 'white' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', opacity: 0.9 }}>
                🎯 CTR
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700' }}>
                {formatPercent(summary.ctr)}
              </div>
              <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.8 }}>
                Click-through rate
              </div>
            </div>

            <div className="card" style={{ background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', border: 'none', color: 'white' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', opacity: 0.9 }}>
                💎 IPM
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700' }}>
                {summary.ipm.toFixed(2)}
              </div>
              <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.8 }}>
                Installs per mille (1000)
              </div>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: '#171717' }}>
              🔄 Conversion Funnel
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conversionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="stage" type="category" width={100} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div style={{
                          background: 'white',
                          border: '1px solid #e5e5e5',
                          borderRadius: '8px',
                          padding: '12px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}>
                          <p style={{ fontWeight: '600', marginBottom: '4px' }}>{data.stage}</p>
                          <p style={{ fontSize: '14px' }}>Count: {formatNumber(data.count)}</p>
                          <p style={{ fontSize: '14px' }}>Percentage: {data.value.toFixed(2)}%</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="value" fill="#667eea" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : null}

      {/* Time Series Chart */}
      {!timeSeriesLoading && combinedTimeSeries.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: '#171717' }}>
            📈 Performance Over Time
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={combinedTimeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => format(new Date(value), 'MMM d')}
              />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="impressions"
                fill="#667eea"
                stroke="#667eea"
                fillOpacity={0.2}
                name="Impressions"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="clicks"
                stroke="#f5576c"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Clicks"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="installs"
                stroke="#00f2fe"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Installs"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Playable Comparison Radar */}
      {!playableLoading && radarData.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: '#171717' }}>
            🎮 Playable Performance Comparison
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e5e5" />
              <PolarAngleAxis dataKey="playable" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 'auto']} />
              <Radar name="CTR" dataKey="ctr" stroke="#667eea" fill="#667eea" fillOpacity={0.6} />
              <Radar name="IPM" dataKey="ipm" stroke="#f5576c" fill="#f5576c" fillOpacity={0.6} />
              <Tooltip />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-Playable Analytics */}
      {playableLoading ? (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <p style={{ color: '#737373' }}>Loading playable analytics...</p>
          </div>
        </div>
      ) : playableAnalytics && playableAnalytics.length > 0 ? (
        <>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            marginBottom: '20px',
            color: '#171717'
          }}>
            🎯 Performance by Playable
          </h2>
          
          <div style={{
            display: 'grid',
            gap: '16px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            marginBottom: '32px'
          }}>
            {playableAnalytics.map((item) => (
              <div 
                key={item.playable_id} 
                className="card"
                onClick={() => setSelectedPlayable(item.playable_id)}
                style={{
                  cursor: 'pointer',
                  borderColor: selectedPlayable === item.playable_id ? '#667eea' : '#e5e5e5',
                  borderWidth: selectedPlayable === item.playable_id ? '2px' : '1px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid #f5f5f5'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#171717' }}>
                    {item.playable_name}
                  </h3>
                  <span style={{
                    fontSize: '11px',
                    color: '#737373',
                    background: '#fafafa',
                    padding: '4px 8px',
                    borderRadius: '4px',
                  }}>
                    ID #{item.playable_id}
                  </span>
                </div>
                
                <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 1fr' }}>
                  <div style={{ padding: '12px', background: '#fafafa', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#737373', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Views</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#667eea' }}>
                      {formatNumber(item.summary.total_impressions)}
                    </div>
                  </div>
                  
                  <div style={{ padding: '12px', background: '#fafafa', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#737373', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Clicks</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#f5576c' }}>
                      {formatNumber(item.summary.total_clicks)}
                    </div>
                  </div>
                  
                  <div style={{ padding: '12px', background: '#fafafa', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#737373', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Installs</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#00f2fe' }}>
                      {formatNumber(item.summary.total_installs)}
                    </div>
                  </div>
                  
                  <div style={{ padding: '12px', background: '#fafafa', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#737373', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>CTR</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#fa709a' }}>
                      {formatPercent(item.summary.ctr)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Playable View */}
          {selectedPlayable && selectedPlayableData && selectedPlayableInfo && (
            <div className="card" style={{ marginBottom: '24px', borderColor: '#667eea', borderWidth: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#171717', marginBottom: '4px' }}>
                    {selectedPlayableData.playable_name}
                  </h2>
                  <p style={{ fontSize: '14px', color: '#737373' }}>
                    {selectedPlayableInfo.description || 'No description available'}
                  </p>
                </div>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setSelectedPlayable(null)}
                  style={{ padding: '8px 16px' }}
                >
                  Close Details
                </button>
              </div>

              {/* Detailed Metrics */}
              {selectedPlayableAnalytics && (
                <div style={{
                  display: 'grid',
                  gap: '12px',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  marginBottom: '24px',
                  padding: '20px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '8px',
                  color: 'white'
                }}>
                  <div>
                    <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Impressions</div>
                    <div style={{ fontSize: '24px', fontWeight: '700' }}>
                      {formatNumber(selectedPlayableAnalytics.summary.total_impressions)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Clicks</div>
                    <div style={{ fontSize: '24px', fontWeight: '700' }}>
                      {formatNumber(selectedPlayableAnalytics.summary.total_clicks)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Installs</div>
                    <div style={{ fontSize: '24px', fontWeight: '700' }}>
                      {formatNumber(selectedPlayableAnalytics.summary.total_installs)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>CTR</div>
                    <div style={{ fontSize: '24px', fontWeight: '700' }}>
                      {formatPercent(selectedPlayableAnalytics.summary.ctr)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>IPM</div>
                    <div style={{ fontSize: '24px', fontWeight: '700' }}>
                      {selectedPlayableAnalytics.summary.ipm.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              {/* Time Series for Selected Playable */}
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#171717' }}>
                Performance Timeline
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={selectedPlayableData.time_series}>
                  <defs>
                    <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f5576c" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f5576c" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorInstalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#00f2fe" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => format(new Date(value), 'MMM d')}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="impressions" 
                    stroke="#667eea" 
                    fillOpacity={1} 
                    fill="url(#colorImpressions)"
                    name="Impressions"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="clicks" 
                    stroke="#f5576c" 
                    fillOpacity={1} 
                    fill="url(#colorClicks)"
                    name="Clicks"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="installs" 
                    stroke="#00f2fe" 
                    fillOpacity={1} 
                    fill="url(#colorInstalls)"
                    name="Installs"
                  />
                </AreaChart>
              </ResponsiveContainer>

              {/* CTR and IPM Over Time */}
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginTop: '32px', marginBottom: '16px', color: '#171717' }}>
                Conversion Metrics Over Time
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={selectedPlayableData.time_series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => format(new Date(value), 'MMM d')}
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} label={{ value: 'CTR (%)', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} label={{ value: 'IPM', angle: 90, position: 'insideRight' }} />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div style={{
                            background: 'white',
                            border: '1px solid #e5e5e5',
                            borderRadius: '8px',
                            padding: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          }}>
                            <p style={{ fontWeight: '600', marginBottom: '8px' }}>{label}</p>
                            {payload.map((entry: any, index: number) => (
                              <p key={index} style={{ color: entry.color, fontSize: '14px', marginTop: '4px' }}>
                                {entry.name}: <strong>{entry.value.toFixed(2)}</strong>
                              </p>
                            ))}
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="ctr" 
                    stroke="#fa709a" 
                    strokeWidth={3}
                    dot={{ r: 5 }}
                    name="CTR (%)"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="ipm" 
                    stroke="#30cfd0" 
                    strokeWidth={3}
                    dot={{ r: 5 }}
                    name="IPM"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Summary Table */}
          <div className="card">
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '16px',
              color: '#171717'
            }}>
              📊 Summary Table
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Playable</th>
                    <th style={{ textAlign: 'right' }}>Impressions</th>
                    <th style={{ textAlign: 'right' }}>Clicks</th>
                    <th style={{ textAlign: 'right' }}>Installs</th>
                    <th style={{ textAlign: 'right' }}>CTR</th>
                    <th style={{ textAlign: 'right' }}>IPM</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {playableAnalytics.map((item) => (
                    <tr key={item.playable_id}>
                      <td style={{ fontWeight: '500' }}>{item.playable_name}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(item.summary.total_impressions)}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(item.summary.total_clicks)}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(item.summary.total_installs)}</td>
                      <td style={{ textAlign: 'right' }}>{formatPercent(item.summary.ctr)}</td>
                      <td style={{ textAlign: 'right' }}>{item.summary.ipm.toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setSelectedPlayable(item.playable_id)}
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <p style={{ fontSize: '16px', color: '#737373', marginBottom: '8px' }}>
              No analytics data available yet
            </p>
            <p style={{ fontSize: '14px', color: '#a3a3a3' }}>
              Track some events from the Playables page to see analytics here
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
