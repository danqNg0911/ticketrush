import { Link, useParams } from 'react-router-dom'

import { Footer } from '@/components/layout/Footer'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/Button'
import { useEventDetail } from '@/features/events/hooks/useEvents'
import { Calendar, Clock, MapPin, Users } from 'lucide-react'

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80'

function formatDate(date: string) {
  return new Date(date).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function EventDetail() {
  const { eventKey } = useParams<{ eventKey: string }>()
  const { event, isLoading, error } = useEventDetail(eventKey)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-24 text-center text-slate-300">Loading event details...</main>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-24 text-center">
          <h1 className="text-3xl font-bold mb-3">Event Not Found</h1>
          <p className="text-slate-400 mb-6">{error ?? 'This event does not exist or is unavailable.'}</p>
          <Link to="/search">
            <Button>Back to Search</Button>
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <section className="relative h-[340px] md:h-[420px] overflow-hidden">
        <img src={event.cover_image_url || FALLBACK_IMAGE} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/40" />

        <div className="relative max-w-7xl mx-auto px-4 h-full flex items-end pb-10">
          <div className="max-w-4xl">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-secondary bg-black/40 px-3 py-1 rounded-full mb-3">
              {event.category}
            </p>
            <h1 className="text-4xl md:text-6xl font-black leading-tight">{event.title}</h1>
            <p className="text-slate-300 mt-4 max-w-2xl line-clamp-3">{event.description}</p>
            <div className="mt-6">
              <Link to={event.queue_enabled ? `/queue?eventKey=${event.slug || event.id}` : `/event/${event.slug || event.id}/seats`}>
                <Button size="lg">{event.queue_enabled ? 'Join Queue' : 'Find Tickets'}</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-white/10 bg-slate-900/70 p-6">
            <h2 className="text-xl font-bold mb-4">About This Event</h2>
            <p className="text-slate-300 leading-relaxed">{event.description}</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/70 p-6">
            <h2 className="text-xl font-bold mb-4">Seat Zones</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {event.zones.map((zone) => (
                <div key={zone.id} className="rounded-lg bg-slate-800/70 border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">{zone.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">{zone.code}</span>
                  </div>
                  <div className="text-sm text-slate-300 space-y-1">
                    <p>
                      {zone.row_count} rows x {zone.seats_per_row} seats
                    </p>
                    <p className="text-secondary font-semibold">${Number(zone.price).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-slate-900/70 p-6 space-y-4">
            <h3 className="text-lg font-bold">Event Info</h3>
            <div className="flex items-start gap-3 text-slate-300">
              <Calendar className="w-5 h-5 text-secondary mt-0.5" />
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">Starts</p>
                <p>{formatDate(event.start_at)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-slate-300">
              <Clock className="w-5 h-5 text-secondary mt-0.5" />
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">Ends</p>
                <p>{formatDate(event.end_at)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-slate-300">
              <MapPin className="w-5 h-5 text-secondary mt-0.5" />
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">Venue</p>
                <p>{event.venue}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-slate-300">
              <Users className="w-5 h-5 text-secondary mt-0.5" />
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">Queue</p>
                <p>{event.queue_enabled ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>
          </div>

          <Link to={event.queue_enabled ? `/queue?eventKey=${event.slug || event.id}` : `/event/${event.slug || event.id}/seats`}>
            <Button className="w-full" size="lg">
              {event.queue_enabled ? 'Continue To Queue' : 'Continue To Seats'}
            </Button>
          </Link>
        </aside>
      </main>

      <Footer />
    </div>
  )
}
