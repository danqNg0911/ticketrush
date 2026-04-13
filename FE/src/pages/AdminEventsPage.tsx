import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import { AdminSidebar } from '../components/AdminSidebar'
import { adminApi } from '../lib/api'
import type { EventCard } from '../types'

interface ZoneForm {
  code: string
  name: string
  row_count: number
  seats_per_row: number
  price: number
  color: string
}

export function AdminEventsPage() {
  const [events, setEvents] = useState<EventCard[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const [zones, setZones] = useState<ZoneForm[]>([
    { code: 'VIP', name: 'VIP Zone', row_count: 8, seats_per_row: 12, price: 149, color: '#024ddf' },
    { code: 'A', name: 'Premium A', row_count: 10, seats_per_row: 15, price: 99, color: '#3569f9' },
  ])

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Concert',
    venue: '',
    start_at: dayjs().add(7, 'day').format('YYYY-MM-DDTHH:mm'),
    end_at: dayjs().add(7, 'day').add(3, 'hour').format('YYYY-MM-DDTHH:mm'),
    cover_image_url:
      'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=80',
    hold_minutes: 10,
    queue_enabled: true,
    queue_release_batch: 50,
    max_active_queue_tokens: 200,
  })

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const data = await adminApi.listEvents()
      setEvents(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchEvents()
  }, [])

  const handleZoneChange = <K extends keyof ZoneForm>(index: number, key: K, value: ZoneForm[K]) => {
    setZones((previousZones) => previousZones.map((zone, zoneIndex) => (zoneIndex === index ? { ...zone, [key]: value } : zone)))
  }

  const handleCreateEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      await adminApi.createEvent({
        ...form,
        status: 'live',
        start_at: dayjs(form.start_at).toISOString(),
        end_at: dayjs(form.end_at).toISOString(),
        zones,
      })

      setMessage('Event created successfully and seat matrix generated.')
      setForm((previousForm) => ({ ...previousForm, title: '', description: '', venue: '' }))
      await fetchEvents()
    } catch {
      setMessage('Failed to create event. Please review input values.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="admin-shell">
      <AdminSidebar />

      <section className="admin-content">
        <header className="section-head">
          <h1>Event Management</h1>
          <p>Create events, configure seat matrices, and launch flash-sale inventory.</p>
        </header>

        <section className="panel">
          <h2>Create New Event</h2>
          <form className="admin-form" onSubmit={handleCreateEvent}>
            <label>
              Event Name
              <input
                required
                minLength={3}
                maxLength={255}
                value={form.title}
                onChange={(event) => setForm((previousForm) => ({ ...previousForm, title: event.target.value }))}
              />
            </label>

            <label>
              Description
              <textarea
                required
                minLength={10}
                value={form.description}
                onChange={(event) => setForm((previousForm) => ({ ...previousForm, description: event.target.value }))}
              />
            </label>

            <div className="admin-form__grid">
              <label>
                Category
                <input
                  required
                  value={form.category}
                  onChange={(event) => setForm((previousForm) => ({ ...previousForm, category: event.target.value }))}
                />
              </label>
              <label>
                Venue
                <input
                  required
                  value={form.venue}
                  onChange={(event) => setForm((previousForm) => ({ ...previousForm, venue: event.target.value }))}
                />
              </label>
            </div>

            <div className="admin-form__grid">
              <label>
                Start Time
                <input
                  type="datetime-local"
                  required
                  value={form.start_at}
                  onChange={(event) => setForm((previousForm) => ({ ...previousForm, start_at: event.target.value }))}
                />
              </label>
              <label>
                End Time
                <input
                  type="datetime-local"
                  required
                  value={form.end_at}
                  onChange={(event) => setForm((previousForm) => ({ ...previousForm, end_at: event.target.value }))}
                />
              </label>
            </div>

            <label>
              Cover Image URL
              <input
                value={form.cover_image_url}
                onChange={(event) => setForm((previousForm) => ({ ...previousForm, cover_image_url: event.target.value }))}
              />
            </label>

            <div className="admin-form__grid">
              <label>
                Hold Minutes
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={form.hold_minutes}
                  onChange={(event) => setForm((previousForm) => ({ ...previousForm, hold_minutes: Number(event.target.value) }))}
                />
              </label>
              <label>
                Queue Batch Size
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={form.queue_release_batch}
                  onChange={(event) =>
                    setForm((previousForm) => ({ ...previousForm, queue_release_batch: Number(event.target.value) }))
                  }
                />
              </label>
              <label>
                Max Active Queue Tokens
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={form.max_active_queue_tokens}
                  onChange={(event) =>
                    setForm((previousForm) => ({ ...previousForm, max_active_queue_tokens: Number(event.target.value) }))
                  }
                />
              </label>
            </div>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.queue_enabled}
                onChange={(event) => setForm((previousForm) => ({ ...previousForm, queue_enabled: event.target.checked }))}
              />
              Enable Virtual Queue
            </label>

            <section className="zone-builder">
              <div className="zone-builder__head">
                <h3>Seat Matrix Zones</h3>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    setZones((previousZones) => [
                      ...previousZones,
                      { code: `Z${previousZones.length + 1}`, name: 'New Zone', row_count: 6, seats_per_row: 10, price: 79, color: '#799dd6' },
                    ])
                  }
                >
                  Add Zone
                </button>
              </div>

              <div className="zone-builder__list">
                {zones.map((zone, index) => (
                  <article key={`${zone.code}-${index}`} className="zone-builder__item">
                    <div className="admin-form__grid">
                      <label>
                        Code
                        <input value={zone.code} onChange={(event) => handleZoneChange(index, 'code', event.target.value)} />
                      </label>
                      <label>
                        Name
                        <input value={zone.name} onChange={(event) => handleZoneChange(index, 'name', event.target.value)} />
                      </label>
                    </div>

                    <div className="admin-form__grid">
                      <label>
                        Rows
                        <input
                          type="number"
                          min={1}
                          max={40}
                          value={zone.row_count}
                          onChange={(event) => handleZoneChange(index, 'row_count', Number(event.target.value))}
                        />
                      </label>
                      <label>
                        Seats / Row
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={zone.seats_per_row}
                          onChange={(event) => handleZoneChange(index, 'seats_per_row', Number(event.target.value))}
                        />
                      </label>
                      <label>
                        Price
                        <input
                          type="number"
                          min={1}
                          value={zone.price}
                          onChange={(event) => handleZoneChange(index, 'price', Number(event.target.value))}
                        />
                      </label>
                      <label>
                        Color
                        <input type="color" value={zone.color} onChange={(event) => handleZoneChange(index, 'color', event.target.value)} />
                      </label>
                    </div>

                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setZones((previousZones) => previousZones.filter((_, zoneIndex) => zoneIndex !== index))}
                      disabled={zones.length === 1}
                    >
                      Remove Zone
                    </button>
                  </article>
                ))}
              </div>
            </section>

            {message && <p className="state-text">{message}</p>}

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save & Launch Event'}
            </button>
          </form>
        </section>

        <section className="panel">
          <h2>Current Events</h2>
          {loading && <p className="state-text">Loading events...</p>}
          <div className="admin-event-list">
            {events.map((event) => (
              <article key={event.id} className="admin-event-item">
                <img src={event.cover_image_url || 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=800&q=80'} alt={event.title} />
                <div>
                  <strong>{event.title}</strong>
                  <p>
                    {dayjs(event.start_at).format('DD MMM YYYY HH:mm')} • {event.venue}
                  </p>
                  <span className="chip chip-ghost">{event.category}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}
