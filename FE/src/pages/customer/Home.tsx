import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { EventCard } from '@/components/ui/EventCard'
import { useEvents } from '@/features/events/hooks/useEvents'
import { CalendarDays, MapPin, Sparkles } from 'lucide-react'

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80'

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

export default function Home() {
  const { events, isLoading, error } = useEvents()

  const heroEvent = events[0]

  const featuredEvents = useMemo(() => events.slice(0, 6), [events])

  const categoryList = useMemo(() => {
    return Array.from(new Set(events.map((event) => event.category).filter(Boolean))).slice(0, 8)
  }, [events])

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative min-h-[420px] overflow-hidden border-b border-white/10">
        {heroEvent ? (
          <>
            <img
              src={heroEvent.cover_image_url || FALLBACK_IMAGE}
              alt={heroEvent.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800" />
        )}

        <div className="relative max-w-7xl mx-auto px-6 py-20">
          {isLoading ? (
            <p className="text-slate-300">Loading events...</p>
          ) : error ? (
            <p className="text-amber-300">{error}</p>
          ) : heroEvent ? (
            <div className="max-w-3xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-4 py-2 text-xs uppercase tracking-[0.2em]">
                <Sparkles className="h-4 w-4" />
                Featured Event
              </div>
              <h1 className="text-4xl md:text-6xl font-black leading-tight">{heroEvent.title}</h1>
              <p className="text-slate-300 max-w-2xl line-clamp-3">{heroEvent.description}</p>
              <div className="flex flex-wrap gap-4 text-sm text-slate-200">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {formatDate(heroEvent.start_at)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {heroEvent.venue}
                </span>
              </div>
              <div className="flex gap-3">
                <Link to={`/event/${heroEvent.slug || heroEvent.id}`}>
                  <Button size="lg">View Event</Button>
                </Link>
                <Link to="/search">
                  <Button size="lg" variant="outline">
                    Explore All
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl space-y-4">
              <h1 className="text-4xl md:text-5xl font-black">No live events right now</h1>
              <p className="text-slate-400">Please check back later or search upcoming listings.</p>
              <Link to="/search">
                <Button>Go To Search</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-12 space-y-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">Featured Events</h2>
          <Link to="/search" className="text-sm text-slate-400 hover:text-white">
            View all
          </Link>
        </div>

        {isLoading ? (
          <p className="text-slate-400">Loading featured events...</p>
        ) : featuredEvents.length === 0 ? (
          <p className="text-slate-400">No events available.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredEvents.map((event) => (
              <EventCard
                key={event.id}
                image={event.cover_image_url || FALLBACK_IMAGE}
                title={event.title}
                date={formatDate(event.start_at)}
                venue={event.venue}
                price="See Seats"
                badge={event.category}
                href={`/event/${event.slug || event.id}`}
              />
            ))}
          </div>
        )}

        <div>
          <h3 className="text-xl font-bold mb-4">Browse Categories</h3>
          <div className="flex flex-wrap gap-3">
            {categoryList.map((category) => (
              <Link
                key={category}
                to={`/search?category=${encodeURIComponent(category)}`}
                className="rounded-full border border-white/20 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
              >
                {category}
              </Link>
            ))}
            {categoryList.length === 0 && <p className="text-sm text-slate-400">No categories yet.</p>}
          </div>
        </div>
      </section>
    </main>
  )
}
