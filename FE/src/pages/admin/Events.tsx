import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { adminApi, extractApiErrorMessage } from '@/lib/api'
import type { EventCard, EventStatus } from '@/types'
import { Calendar, Clock, Edit, Filter, MapPin, Plus, Search, Trash2, Users } from 'lucide-react'

interface EventFormState {
  title: string
  description: string
  category: string
  venue: string
  start_at: string
  end_at: string
  status: EventStatus
  queue_enabled: boolean
  hold_minutes: string
  queue_release_batch: string
  max_active_queue_tokens: string
  zone_code: string
  zone_name: string
  row_count: string
  seats_per_row: string
  zone_price: string
  zone_color: string
}

const INITIAL_FORM: EventFormState = {
  title: '',
  description: '',
  category: '',
  venue: '',
  start_at: '',
  end_at: '',
  status: 'live',
  queue_enabled: true,
  hold_minutes: '10',
  queue_release_batch: '50',
  max_active_queue_tokens: '200',
  zone_code: 'A',
  zone_name: 'Standard',
  row_count: '10',
  seats_per_row: '20',
  zone_price: '500000',
  zone_color: '#024ddf',
}

function toDatetimeLocal(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const timezoneOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16)
}

function statusBadge(status: EventStatus) {
  if (status === 'live') return <Badge variant="success" size="sm">Live</Badge>
  if (status === 'closed') return <Badge variant="warning" size="sm">Closed</Badge>
  return <Badge variant="outline" size="sm">Draft</Badge>
}

export default function AdminEvents() {
  const [events, setEvents] = useState<EventCard[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | EventStatus>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<EventCard | null>(null)
  const [form, setForm] = useState<EventFormState>(INITIAL_FORM)
  const [error, setError] = useState<string | null>(null)

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const matchesSearch =
          event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.venue.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = statusFilter === 'all' || event.status === statusFilter
        return matchesSearch && matchesStatus
      }),
    [events, searchTerm, statusFilter],
  )

  async function loadEvents() {
    setLoading(true)
    setError(null)
    try {
      const response = await adminApi.listEvents()
      setEvents(response)
    } catch (errorValue) {
      setError(extractApiErrorMessage(errorValue, 'Khong the tai danh sach su kien.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadEvents()
  }, [])

  function openCreateModal() {
    setEditingEvent(null)
    setForm(INITIAL_FORM)
    setIsModalOpen(true)
  }

  function openEditModal(event: EventCard) {
    setEditingEvent(event)
    setForm((previous) => ({
      ...previous,
      title: event.title,
      description: event.description,
      category: event.category,
      venue: event.venue,
      start_at: toDatetimeLocal(event.start_at),
      end_at: toDatetimeLocal(event.end_at),
      status: event.status,
      queue_enabled: event.queue_enabled,
    }))
    setIsModalOpen(true)
  }

  async function handleDeleteEvent(eventKey: string) {
    const accepted = window.confirm('Ban co chac chan muon xoa su kien nay?')
    if (!accepted) return

    try {
      await adminApi.deleteEvent(eventKey)
      setEvents((previous) => previous.filter((event) => event.slug !== eventKey))
    } catch (errorValue) {
      setError(extractApiErrorMessage(errorValue, 'Khong the xoa su kien.'))
    }
  }

  async function handleSubmit() {
    if (!form.title || !form.description || !form.category || !form.venue || !form.start_at || !form.end_at) {
      setError('Vui long nhap day du thong tin bat buoc.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const basePayload = {
        title: form.title,
        description: form.description,
        category: form.category,
        venue: form.venue,
        start_at: new Date(form.start_at).toISOString(),
        end_at: new Date(form.end_at).toISOString(),
        status: form.status,
        queue_enabled: form.queue_enabled,
        hold_minutes: Number(form.hold_minutes),
        queue_release_batch: Number(form.queue_release_batch),
        max_active_queue_tokens: Number(form.max_active_queue_tokens),
      }

      if (editingEvent) {
        const updated = await adminApi.updateEvent(editingEvent.slug, basePayload)
        setEvents((previous) => previous.map((event) => (event.id === updated.id ? updated : event)))
      } else {
        const created = await adminApi.createEvent({
          ...basePayload,
          zones: [
            {
              code: form.zone_code,
              name: form.zone_name,
              row_count: Number(form.row_count),
              seats_per_row: Number(form.seats_per_row),
              price: Number(form.zone_price),
              color: form.zone_color,
            },
          ],
        })
        setEvents((previous) => [created, ...previous])
      }

      setIsModalOpen(false)
    } catch (errorValue) {
      setError(extractApiErrorMessage(errorValue, 'Khong the luu su kien.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">Quan ly su kien</h2>
          <p className="text-gray-400 mt-1">Ket noi truc tiep voi backend admin event API</p>
        </div>
        <Button variant="primary" onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          Tao su kien
        </Button>
      </div>

      {error && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="pt-6 text-sm text-red-200">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tim theo ten su kien hoac dia diem..."
                className="pl-10"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                className="h-10 px-3 rounded-lg bg-space-700/50 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | EventStatus)}
              >
                <option value="all">Tat ca status</option>
                <option value="draft">Draft</option>
                <option value="live">Live</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="pt-6 text-sm text-gray-300">Dang tai su kien...</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredEvents.map((event) => {
            const startDate = new Date(event.start_at)
            const endDate = new Date(event.end_at)
            return (
              <Card key={event.id} className="group hover:border-brand-red/30 transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">{event.description}</p>
                    </div>
                    {statusBadge(event.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Calendar className="h-4 w-4 text-brand-red" />
                      <span>{startDate.toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Clock className="h-4 w-4 text-brand-yellow" />
                      <span>{startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300 col-span-2">
                      <MapPin className="h-4 w-4 text-green-400" />
                      <span className="truncate">{event.venue}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300 col-span-2">
                      <Users className="h-4 w-4 text-cyan-400" />
                      <span>
                        Queue: {event.queue_enabled ? 'enabled' : 'disabled'} | Ket thuc: {endDate.toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" size="sm">{event.category}</Badge>
                    {event.cover_image_url ? <Badge variant="info" size="sm">Has image</Badge> : null}
                    <Badge variant="default" size="sm">/{event.slug}</Badge>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(event)}>
                      <Edit className="h-4 w-4" />
                      Sua
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => void handleDeleteEvent(event.slug)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Xoa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {!loading && filteredEvents.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">Khong tim thay su kien phu hop.</CardContent>
        </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEvent ? 'Cap nhat su kien' : 'Tao su kien moi'}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tên sự kiện</label>
            <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Mô tả</label>
            <textarea
              className="w-full rounded-lg border bg-space-700/50 border-white/20 px-4 py-2.5 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-red"
              rows={3}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Loại sự kiện</label>
              <Input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Địa điểm</label>
              <Input value={form.venue} onChange={(event) => setForm({ ...form, venue: event.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Thời điểm bắt đầu</label>
              <Input
                type="datetime-local"
                value={form.start_at}
                onChange={(event) => setForm({ ...form, start_at: event.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Thời điểm kết thúc</label>
              <Input
                type="datetime-local"
                value={form.end_at}
                onChange={(event) => setForm({ ...form, end_at: event.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Trạng thái</label>
              <select
                className="w-full rounded-lg border bg-space-700/50 border-white/20 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-red"
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value as EventStatus })}
              >
                <option value="draft">Draft</option>
                <option value="live">Live</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Hàng đợi</label>
              <select
                className="w-full rounded-lg border bg-space-700/50 border-white/20 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-red"
                value={form.queue_enabled ? 'true' : 'false'}
                onChange={(event) => setForm({ ...form, queue_enabled: event.target.value === 'true' })}
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Thời gian giữ (Phút)</label>
              <Input
                type="number"
                min={1}
                value={form.hold_minutes}
                onChange={(event) => setForm({ ...form, hold_minutes: event.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Release batch</label>
              <Input
                type="number"
                min={1}
                value={form.queue_release_batch}
                onChange={(event) => setForm({ ...form, queue_release_batch: event.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Hàng đợi tối đa</label>
              <Input
                type="number"
                min={1}
                value={form.max_active_queue_tokens}
                onChange={(event) => setForm({ ...form, max_active_queue_tokens: event.target.value })}
              />
            </div>
          </div>

          {!editingEvent && (
            <>
              <div className="pt-3 border-t border-white/10">
                <p className="text-sm text-gray-300 mb-3">Zone khởi tạo (Bắt buộc khi tạo mới)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Mã Zone</label>
                    <Input value={form.zone_code} onChange={(event) => setForm({ ...form, zone_code: event.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tên Zone </label>
                    <Input value={form.zone_name} onChange={(event) => setForm({ ...form, zone_name: event.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Số hàng</label>
                    <Input
                      type="number"
                      min={1}
                      value={form.row_count}
                      onChange={(event) => setForm({ ...form, row_count: event.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Số ghế/ Hàng</label>
                    <Input
                      type="number"
                      min={1}
                      value={form.seats_per_row}
                      onChange={(event) => setForm({ ...form, seats_per_row: event.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Giá</label>
                    <Input
                      type="number"
                      min={1}
                      value={form.zone_price}
                      onChange={(event) => setForm({ ...form, zone_price: event.target.value })}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Màu Zone</label>
                  <Input value={form.zone_color} onChange={(event) => setForm({ ...form, zone_color: event.target.value })} />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={() => void handleSubmit()} isLoading={saving}>
              {editingEvent ? 'Cap nhat' : 'Tao moi'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
