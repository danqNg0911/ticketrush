import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { adminApi, extractApiErrorMessage } from '@/lib/api'
import type { AdminEventRevenueItem, AdminTicketSaleItem, DashboardSummary } from '@/types'
import { Calendar, DollarSign, Download, RefreshCcw, Ticket, TrendingUp } from 'lucide-react'

const PAGE_SIZE = 10

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

function statusBadge(status: string) {
  if (status === 'paid') return <Badge variant="success" size="sm">Paid</Badge>
  if (status === 'pending') return <Badge variant="warning" size="sm">Pending</Badge>
  return <Badge variant="default" size="sm">Cancelled</Badge>
}

const DEFAULT_SUMMARY: DashboardSummary = {
  total_revenue: 0,
  tickets_sold: 0,
  cancelled_tickets: 0,
  active_events: 0,
  waiting_queue_users: 0,
}

export default function AdminTickets() {
  const [summary, setSummary] = useState<DashboardSummary>(DEFAULT_SUMMARY)
  const [revenueByEvent, setRevenueByEvent] = useState<AdminEventRevenueItem[]>([])
  const [ticketSales, setTicketSales] = useState<AdminTicketSaleItem[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [eventFilter, setEventFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalSales, setTotalSales] = useState(0)

  const selectedEventId = eventFilter === 'all' ? undefined : Number(eventFilter)

  async function loadStaticData() {
    const [summaryRes, revenueRes] = await Promise.all([adminApi.summary(), adminApi.revenueByEvent()])
    setSummary(summaryRes)
    setRevenueByEvent(revenueRes)
  }

  async function loadSalesData() {
    const salesRes = await adminApi.ticketSales({
      event_id: selectedEventId,
      status_filter: statusFilter === 'all' ? undefined : statusFilter,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    })
    setTicketSales(salesRes.items)
    setTotalSales(salesRes.total)
  }

  async function loadTicketsData(isRefresh = false) {
    setError(null)
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      await Promise.all([loadStaticData(), loadSalesData()])
    } catch (errorValue) {
      setError(extractApiErrorMessage(errorValue, 'Khong the tai du lieu ve va doanh thu.'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadTicketsData()
  }, [page, statusFilter, selectedEventId])

  const totalRevenue = summary.total_revenue
  const totalTicketsSold = summary.tickets_sold
  const totalPages = Math.max(1, Math.ceil(totalSales / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">Ve va doanh thu</h2>
          <p className="text-gray-400 mt-1">Filter va phan trang server-side cho ticket sales</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void loadTicketsData(true)} isLoading={refreshing}>
            <RefreshCcw className="h-4 w-4" />
            Lam moi
          </Button>
          <Button variant="outline" disabled>
            <Download className="h-4 w-4" />
            Export (soon)
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="pt-6 text-sm text-red-200">{error}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Doanh thu tong</p>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-green-400"><TrendingUp className="h-4 w-4" /><span>Cap nhat tu /admin/dashboard/summary</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Ve da ban</p>
                <p className="text-2xl font-bold text-brand-red">{totalTicketsSold.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-brand-red/20 flex items-center justify-center"><Ticket className="h-6 w-6 text-brand-red" /></div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-400"><Ticket className="h-4 w-4" /><span>{summary.cancelled_tickets} ve da huy</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Ket qua filter</p>
                <p className="text-2xl font-bold text-brand-yellow">{totalSales}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-brand-yellow/20 flex items-center justify-center"><Calendar className="h-6 w-6 text-brand-yellow" /></div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-400"><span>Page {page}/{totalPages}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Doanh thu theo su kien</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-300">Dang tai doanh thu...</p>
          ) : revenueByEvent.length === 0 ? (
            <p className="text-sm text-gray-400">Chua co du lieu doanh thu theo su kien.</p>
          ) : (
            <div className="space-y-4">
              {revenueByEvent.map((item) => {
                const progress = summary.tickets_sold > 0 ? (item.tickets_sold / summary.tickets_sold) * 100 : 0
                return (
                  <div key={item.event_id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white font-medium">{item.event_title}</span>
                      <div className="flex items-center gap-4"><span className="text-gray-400">{item.tickets_sold} ve</span><span className="text-green-400 font-medium">{formatCurrency(item.revenue)}</span></div>
                    </div>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-brand-red to-brand-yellow rounded-full" style={{ width: `${Math.max(progress, 2)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span>Giao dich ve gan day</span>
            <div className="flex items-center gap-2">
              <select
                className="h-9 px-3 rounded-lg bg-space-700/50 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
                value={eventFilter}
                onChange={(event) => {
                  setEventFilter(event.target.value)
                  setPage(1)
                }}
              >
                <option value="all">Tat ca su kien</option>
                {revenueByEvent.map((eventItem) => (
                  <option key={eventItem.event_id} value={String(eventItem.event_id)}>{eventItem.event_title}</option>
                ))}
              </select>
              <select
                className="h-9 px-3 rounded-lg bg-space-700/50 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value)
                  setPage(1)
                }}
              >
                <option value="all">Tat ca status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-300">Dang tai giao dich...</p>
          ) : ticketSales.length === 0 ? (
            <p className="text-sm text-gray-400">Khong co giao dich phu hop.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-gray-400">
                    <th className="pb-3 font-medium">ID</th>
                    <th className="pb-3 font-medium">Su kien</th>
                    <th className="pb-3 font-medium">Khach hang</th>
                    <th className="pb-3 font-medium">Ghe</th>
                    <th className="pb-3 font-medium">Gia</th>
                    <th className="pb-3 font-medium">Thoi gian</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketSales.map((sale) => (
                    <tr key={sale.id} className="border-b border-white/5">
                      <td className="py-3 text-gray-400 font-mono text-xs">#{sale.id.toString().padStart(4, '0')}</td>
                      <td className="py-3 text-white max-w-[220px] truncate">{sale.event_title}</td>
                      <td className="py-3 text-gray-300">{sale.customer_name}</td>
                      <td className="py-3 text-gray-300">{sale.zone_name} - {sale.seat_label}</td>
                      <td className="py-3 text-green-400">{formatCurrency(sale.price)}</td>
                      <td className="py-3 text-gray-400">{new Date(sale.purchased_at).toLocaleString('vi-VN')}</td>
                      <td className="py-3">{statusBadge(sale.order_status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Truoc</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Sau</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
