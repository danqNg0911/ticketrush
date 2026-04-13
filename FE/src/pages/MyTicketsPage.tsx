import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

import { bookingApi } from '../lib/api'
import type { TicketItem } from '../types'

export function MyTicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([])
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTickets = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await bookingApi.myTickets()
      setTickets(data)
      setSelectedTicket(data[0] ?? null)
    } catch {
      setError('Failed to load your tickets.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchTickets()
  }, [])

  return (
    <main className="page app-container my-tickets-page">
      <header className="section-head">
        <h1>My Tickets</h1>
        <p>Manage your digital passes and show QR at entrance.</p>
      </header>

      {loading && <p className="state-text">Loading tickets...</p>}
      {error && <p className="state-text state-text--error">{error}</p>}

      {!loading && !error && (
        <section className="my-tickets-grid">
          <div className="ticket-list">
            {tickets.map((ticket) => (
              <button
                key={ticket.ticket_id}
                type="button"
                className={`ticket-item ${selectedTicket?.ticket_id === ticket.ticket_id ? 'ticket-item--active' : ''}`}
                onClick={() => setSelectedTicket(ticket)}
              >
                <strong>{ticket.event_title}</strong>
                <span>{dayjs(ticket.event_date).format('DD MMM YYYY HH:mm')}</span>
                <span>
                  {ticket.zone_name} • {ticket.seat_label}
                </span>
              </button>
            ))}

            {tickets.length === 0 && <p className="state-text">No purchased tickets yet.</p>}
          </div>

          <div className="ticket-detail">
            {selectedTicket ? (
              <>
                <h2>{selectedTicket.event_title}</h2>
                <p>{selectedTicket.venue}</p>
                <p>{dayjs(selectedTicket.event_date).format('dddd, DD MMM YYYY • HH:mm')}</p>

                <div className="ticket-detail__meta">
                  <div>
                    <small>Ticket Code</small>
                    <strong>{selectedTicket.ticket_code}</strong>
                  </div>
                  <div>
                    <small>Seat</small>
                    <strong>
                      {selectedTicket.zone_name} • {selectedTicket.seat_label}
                    </strong>
                  </div>
                </div>

                <div className="ticket-qr">
                  <QRCodeSVG value={selectedTicket.qr_payload} size={220} includeMargin bgColor="#ffffff" fgColor="#001e40" />
                </div>
              </>
            ) : (
              <p className="state-text">Select one ticket from left panel.</p>
            )}
          </div>
        </section>
      )}
    </main>
  )
}
