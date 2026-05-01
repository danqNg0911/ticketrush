import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CustomerSidebar } from '@/components/layout/CustomerSidebar'
import { Navbar } from '@/components/layout/Navbar'
import { useAuth } from '@/context/AuthContext'
import { Heart, Calendar, MapPin, Ticket } from 'lucide-react'

interface FavouriteEvent {
  id: number
  title: string
  date: string
  venue: string
  location: string
  imageUrl: string
  category: string
}

const MOCK_FAVOURITES: FavouriteEvent[] = [
  {
    id: 1,
    title: 'Interstellar Music Festival',
    date: 'APR 25, 2025',
    venue: 'Galaxy Arena',
    location: 'Los Angeles, CA',
    imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&h=400&fit=crop',
    category: 'Music',
  },
  {
    id: 2,
    title: 'Cosmic Comedy Night',
    date: 'MAY 10, 2025',
    venue: 'Starlight Theater',
    location: 'New York, NY',
    imageUrl: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=600&h=400&fit=crop',
    category: 'Comedy',
  },
  {
    id: 3,
    title: 'Nebula Dance Championship',
    date: 'JUN 05, 2025',
    venue: 'Orbit Convention Center',
    location: 'Miami, FL',
    imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop',
    category: 'Dance',
  },
]

export default function Favourites() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [favourites, setFavourites] = useState<FavouriteEvent[]>(MOCK_FAVOURITES)

  const onSidebarNavigate = (tab: string) => {
    if (tab === 'tickets') return navigate('/tickets')
    if (tab === 'profile') return navigate('/profile')
    if (tab === 'favourites') return navigate('/favourites') 
    if (tab === 'payments') return navigate('/payments')  
    if (tab === "settings") return navigate('/settings') 
    if (tab === 'help') return navigate('/help')  
    if (tab === 'logout') {
      logout()
      return navigate('/')
    }
  }

  const handleRemoveFavourite = (id: number) => {
    setFavourites(favourites.filter((fav) => fav.id !== id))
  }

  const handleViewEvent = (id: number) => {
    // Navigate to event detail - using mock slug for now
    navigate(`/event/${id}`)
  }

  return (
    <>
      <Navbar />
      <div className="pt-[80px] min-h-screen bg-background flex">
        <CustomerSidebar
          activeTab="favorites"
          userName={user?.full_name ?? 'Customer'}
          membershipLevel="Stellar Member"
          onNavigate={onSidebarNavigate}
        />

        <main className="flex-1 p-8 lg:p-12">
          <header className="mb-10">
            <h1 className="text-5xl font-black text-on-background font-headline tracking-tighter">
              My Watchlist
            </h1>
            <p className="text-on-surface-variant mt-2 max-w-lg">
              Your curated collection of upcoming cosmic experiences.
            </p>
          </header>

          {favourites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
              <Heart className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-bold">No favourites yet.</p>
              <p className="text-sm mt-2">Start exploring events and add them to your watchlist!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favourites.map((event) => (
                <div
                  key={event.id}
                  className="glass-panel rounded-xl overflow-hidden group hover:border-primary/30 transition-all duration-300"
                >
                  {/* Event Cover Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    <button
                      onClick={() => handleRemoveFavourite(event.id)}
                      className="absolute top-3 right-3 p-2 rounded-full bg-background/50 backdrop-blur-sm hover:bg-primary/20 transition-colors"
                    >
                      <Heart className="w-5 h-5 text-primary fill-primary" />
                    </button>
                    <span className="absolute bottom-3 left-3 px-3 py-1 bg-primary/80 text-on-primary text-xs font-bold uppercase tracking-widest rounded-full">
                      {event.category}
                    </span>
                  </div>

                  {/* Event Info */}
                  <div className="p-5 space-y-3">
                    <h3 className="text-lg font-black text-on-background font-headline leading-tight line-clamp-2">
                      {event.title}
                    </h3>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>{event.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span>{event.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                        <Ticket className="w-4 h-4 text-primary" />
                        <span>{event.venue}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleViewEvent(event.id)}
                      className="w-full mt-4 bg-primary-container text-on-primary-container py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:shadow-[0_0_15px_rgba(252,83,109,0.4)] transition-all active:scale-95"
                    >
                      View Event
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  )
}