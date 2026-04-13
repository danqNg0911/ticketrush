import { useEffect, useMemo, useState } from 'react'

import { EventCard } from '../components/EventCard'
import { eventApi } from '../lib/api'
import type { EventCard as EventCardType } from '../types'

export function HomePage() {
  const [events, setEvents] = useState<EventCardType[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = async (keyword?: string) => {
    try {
      setLoading(true)
      setError(null)
      const data = await eventApi.list(keyword)
      setEvents(data)
    } catch (err) {
      console.error(err)
      setError('Failed to load events. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchEvents()
  }, [])

  const heroEvent = useMemo(() => events[0], [events])

  return (
    <main className="page page-home">
      <section className="hero app-container">
        <div className="hero__overlay" />
        <div className="hero__content">
          <span className="hero__eyebrow">Digital Concierge Ticketing</span>
          <h1>
            Experience the <br />
            Electric Moment.
          </h1>
          <p>
            TicketRush powers high-concurrency flash sales with real-time seat maps, virtual queue admission, and secure
            digital tickets.
          </p>

          <form
            className="hero__search"
            onSubmit={(event) => {
              event.preventDefault()
              void fetchEvents(search)
            }}
          >
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search concert, festival, sports..."
            />
            <button type="submit" className="btn btn-primary">
              Find Events
            </button>
          </form>
        </div>
      </section>

      {heroEvent && (
        <section className="feature-event app-container">
          <div className="feature-event__left">
            <span className="chip chip-ghost">Trending Now</span>
            <h2>{heroEvent.title}</h2>
            <p>{heroEvent.description}</p>
          </div>
          <img
            src={heroEvent.cover_image_url || 'https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2?auto=format&fit=crop&w=1200&q=80'}
            alt={heroEvent.title}
          />
        </section>
      )}

      <section className="app-container section-stack">
        <div className="section-head">
          <h2>Upcoming Events</h2>
          <p>Live inventory, dynamic seat map, and queue admission built-in.</p>
        </div>

        {loading && <p className="state-text">Loading events...</p>}
        {error && <p className="state-text state-text--error">{error}</p>}

        {!loading && !error && (
          <div className="event-grid">
            {events.map((event) => (
              <EventCard event={event} key={event.id} />
            ))}

            {events.length === 0 && <p className="state-text">No events found for your search.</p>}
          </div>
        )}
      </section>
    </main>
  )
}
