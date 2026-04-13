import { useEffect, useMemo, useState } from 'react'

import { AdminSidebar } from '../components/AdminSidebar'
import { useAuth } from '../hooks/useAuth'
import { useWebSocketHeartbeat } from '../hooks/useWebSocketHeartbeat'
import { adminApi } from '../lib/api'
import type { AudienceDistribution, DashboardSummary, OccupancyItem, RevenuePoint } from '../types'

const summaryDefault: DashboardSummary = {
  total_revenue: 0,
  tickets_sold: 0,
  active_events: 0,
  waiting_queue_users: 0,
}

export function AdminDashboardPage() {
  const { token } = useAuth()

  const [summary, setSummary] = useState<DashboardSummary>(summaryDefault)
  const [revenue, setRevenue] = useState<RevenuePoint[]>([])
  const [audience, setAudience] = useState<AudienceDistribution>({ age_groups: {}, gender_groups: {} })
  const [occupancy, setOccupancy] = useState<OccupancyItem[]>([])
  const [loading, setLoading] = useState(true)

  const wsBase = import.meta.env.VITE_WS_BASE_URL ?? 'ws://localhost:8000/ws'

  useWebSocketHeartbeat({
    url: token ? `${wsBase}/admin/dashboard?token=${token}` : null,
    onMessage: (event) => {
      try {
        const message = JSON.parse(event.data) as { type: string; payload: DashboardSummary }
        if (message.type === 'dashboard_update') {
          setSummary(message.payload)
        }
      } catch {
        // noop
      }
    },
  })

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const [summaryRes, revenueRes, audienceRes, occupancyRes] = await Promise.all([
        adminApi.summary(),
        adminApi.revenue(14),
        adminApi.audience(),
        adminApi.occupancy(),
      ])

      setSummary(summaryRes)
      setRevenue(revenueRes)
      setAudience(audienceRes)
      setOccupancy(occupancyRes)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchDashboard()
  }, [])

  const maxRevenue = useMemo(() => Math.max(...revenue.map((item) => item.revenue), 1), [revenue])

  return (
    <main className="admin-shell">
      <AdminSidebar />

      <section className="admin-content">
        <header className="section-head">
          <h1>Market Performance</h1>
          <p>Real-time dashboard for seat occupancy, queue pressure and revenue.</p>
        </header>

        {loading && <p className="state-text">Loading dashboard...</p>}

        <section className="kpi-grid">
          <article className="kpi-card">
            <p>Total Revenue</p>
            <h3>${summary.total_revenue.toLocaleString()}</h3>
          </article>
          <article className="kpi-card">
            <p>Tickets Sold</p>
            <h3>{summary.tickets_sold.toLocaleString()}</h3>
          </article>
          <article className="kpi-card">
            <p>Active Events</p>
            <h3>{summary.active_events}</h3>
          </article>
          <article className="kpi-card">
            <p>Waiting Queue Users</p>
            <h3>{summary.waiting_queue_users}</h3>
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="panel">
            <h2>Revenue (14 days)</h2>
            <div className="bar-chart">
              {revenue.map((item) => (
                <div key={item.date} className="bar-chart__item" title={`${item.date}: $${item.revenue}`}>
                  <div className="bar-chart__bar" style={{ height: `${(item.revenue / maxRevenue) * 100}%` }} />
                  <span>{item.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <h2>Audience Demographics</h2>
            <div className="demographic-grid">
              <div>
                <h3>Age</h3>
                <ul>
                  {Object.entries(audience.age_groups).map(([label, value]) => (
                    <li key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Gender</h3>
                <ul>
                  {Object.entries(audience.gender_groups).map(([label, value]) => (
                    <li key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>

          <article className="panel panel-full">
            <h2>Seat Occupancy Snapshot</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Total Seats</th>
                    <th>Sold</th>
                    <th>Locked</th>
                    <th>Occupancy</th>
                  </tr>
                </thead>
                <tbody>
                  {occupancy.map((item) => (
                    <tr key={item.event_id}>
                      <td>{item.event_title}</td>
                      <td>{item.total_seats}</td>
                      <td>{item.sold_seats}</td>
                      <td>{item.locked_seats}</td>
                      <td>{item.occupancy_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </section>
    </main>
  )
}
