import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { CustomerSidebar } from '@/components/layout/CustomerSidebar'
import { Navbar } from '@/components/layout/Navbar'
//import { GlobalLoader } from '@/components/ui/GlobalLoader'
import { TicketCard } from '@/components/ui/TicketCard'
import { useAuth } from '@/context/AuthContext'
import { useCancelTicket, useMyTickets } from '@/features/booking/hooks/useBooking'
import type { TicketItem } from '@/types'
import { Globe, Mail, Menu, MonitorPlay, Ticket, X } from 'lucide-react'

type TicketTab = 'upcoming' | 'past' | 'cancelled'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

function toCardStatus(ticket: TicketItem): 'confirmed' | 'pending' | 'cancelled' {
  if (ticket.seat_status === 'sold') return 'confirmed'
  if (ticket.seat_status === 'locked') return 'pending'
  return 'cancelled'
}

const CustomerTicket: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<TicketTab>('upcoming')
  const [pendingCancelTicketId, setPendingCancelTicketId] = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { tickets, isLoading, error, refetch } = useMyTickets()
  const { cancelTicket, error: cancelError } = useCancelTicket()

  useEffect(() => {
    void refetch()
  }, [refetch])

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  // if (isLoading) {
  //   return <GlobalLoader />
  // }

  const filteredTickets = useMemo(() => {
    const now = Date.now()

    return tickets.filter((ticket) => {
      const eventTime = new Date(ticket.event_date).getTime()
      const isPast = eventTime < now

      if (activeTab === 'upcoming') return !isPast && ticket.seat_status === 'sold'
      if (activeTab === 'past') return isPast && ticket.seat_status === 'sold'
      return ticket.seat_status !== 'sold'
    })
  }, [tickets, activeTab])

  const onSidebarNavigate = (tab: string) => {
    setDrawerOpen(false)
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

  const onViewDetails = (ticket: TicketItem) => {
    navigate(`/event/${ticket.event_slug}`)
  }

  const onDownload = (ticket: TicketItem) => {
    navigator.clipboard.writeText(ticket.qr_payload).catch(() => undefined)
    window.alert(`Copied QR payload for ${ticket.ticket_code}`)
  }

  const onCancelTicket = async (ticket: TicketItem) => {
    const confirmed = window.confirm(`Cancel ticket ${ticket.ticket_code}?`)
    if (!confirmed) return

    try {
      setPendingCancelTicketId(ticket.ticket_id)
      await cancelTicket(ticket.ticket_id)
      await refetch()
    } finally {
      setPendingCancelTicketId(null)
    }
  }

  return (
    <>
      <Navbar />
      <div className="pt-[80px] min-h-screen bg-[#0B0F19] flex">
        <div className="hidden lg:block">
          <CustomerSidebar
            activeTab="tickets"
            userName={user?.full_name ?? 'Customer'}
            membershipLevel="Stellar Member"
            onNavigate={onSidebarNavigate}
          />
        </div>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
            <CustomerSidebar
              activeTab="tickets"
              userName={user?.full_name ?? 'Customer'}
              membershipLevel="Stellar Member"
              onNavigate={onSidebarNavigate}
              className="relative"
            />
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-12">
          <button className="lg:hidden mb-4 p-2 rounded bg-surface-container" onClick={() => setDrawerOpen((v) => !v)}>
            {drawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <h1 className="text-3xl sm:text-5xl font-black text-white font-headline tracking-tighter">Vé của tôi</h1>
              <p className="text-slate-400 mt-2 max-w-lg">Chúc bạn có trải nghiệm tuyệt vời vơi TicketRush</p>
            </div>

            <div className="flex flex-wrap p-1 bg-slate-900 border border-white/5 rounded-2xl sm:rounded-full backdrop-blur-sm">
              {(['upcoming', 'past', 'cancelled'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 sm:px-6 py-2 rounded-full font-bold text-sm transition-all capitalize ${
                    activeTab === tab ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/20' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </header>

          {isLoading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500">
              <p className="text-lg font-bold">Loading tickets...</p>
            </div>
          ) : error ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-amber-300">
              <p className="text-lg font-bold mb-3">{error}</p>
              <button className="text-sm underline" onClick={() => void refetch()}>
                Retry
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {filteredTickets.map((ticket) => (
                <div key={ticket.ticket_id} className="space-y-3">
                  <TicketCard
                    eventTitle={ticket.event_title}
                    ticketNumber={ticket.ticket_code}
                    date={formatDate(ticket.event_date)}
                    location={`${ticket.venue} | ${ticket.seat_label}`}
                    imageUrl={ticket.event_cover_image_url}
                    status={toCardStatus(ticket)}
                    onViewDetails={() => onViewDetails(ticket)}
                    onDownload={() => onDownload(ticket)}
                  />
                  {activeTab === 'upcoming' && ticket.seat_status === 'sold' && (
                    <div className="flex justify-end">
                      <button
                        className="text-xs px-3 py-2 rounded-lg border border-red-400/30 text-red-300 hover:bg-red-500/10 disabled:opacity-60"
                        disabled={pendingCancelTicketId === ticket.ticket_id}
                        onClick={() => void onCancelTicket(ticket)}
                      >
                        {pendingCancelTicketId === ticket.ticket_id ? 'Cancelling...' : 'Cancel Ticket'}
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {filteredTickets.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500">
                  <Ticket className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg font-bold">No {activeTab} tickets found.</p>
                </div>
              )}
            </div>
          )}
          {cancelError && <p className="text-amber-300 text-sm mt-4">{cancelError}</p>}
        </main>
      </div>

    </>
  )
}

export default CustomerTicket
