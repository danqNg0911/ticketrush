import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

import { bookingApi } from '../lib/api'
import type { TicketItem } from '../types'

export function MyTicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([])
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null)
  const [search, setSearch] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [cancellingTicketId, setCancellingTicketId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTickets = async (params?: { search?: string; start_from?: string; end_to?: string }) => {
    try {
      setLoading(true)
      setError(null)
      const data = await bookingApi.myTickets(params)
      setTickets(data)
      setSelectedTicket((previousTicket) => {
        if (!previousTicket) return data[0] ?? null
        return data.find((ticket) => ticket.ticket_id === previousTicket.ticket_id) ?? data[0] ?? null
      })
    } catch {
      setError('Failed to load your tickets.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchTickets()
  }, [])

  const applySearch = () =>
    fetchTickets({
      search: search.trim() || undefined,
      start_from: startAt ? dayjs(startAt).toISOString() : undefined,
      end_to: endAt ? dayjs(endAt).toISOString() : undefined,
    })

  const handleCancelTicket = async (ticket: TicketItem) => {
    const shouldDelete = window.confirm(`Delete ticket ${ticket.ticket_code} and release this seat?`)
    if (!shouldDelete) return

    try {
      setCancellingTicketId(ticket.ticket_id)
      setError(null)
      await bookingApi.cancelTicket(ticket.ticket_id)
      await applySearch()
    } catch {
      setError('Unable to delete ticket right now. Please try again.')
    } finally {
      setCancellingTicketId(null)
    }
  }

  return (
    <main className="page app-container my-tickets-page">
      <header className="section-head section-head--hero ticket-hero-head">
        <h1>My Tickets</h1>
        <p>Manage your digital passes and show QR at entrance.</p>
      </header>

      <section className="panel ticket-filter-bar">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by ticket code or event name"
        />
        <input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} />
        <input type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} />
        <button type="button" className="btn btn-primary" onClick={() => void applySearch()}>
          Search
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setSearch('')
            setStartAt('')
            setEndAt('')
            void fetchTickets()
          }}
        >
          Reset
        </button>
      </section>

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
                <span className="ticket-item__code">{ticket.ticket_code}</span>
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

                <button
                  type="button"
                  className="btn btn-soft-danger"
                  onClick={() => void handleCancelTicket(selectedTicket)}
                  disabled={cancellingTicketId === selectedTicket.ticket_id}
                >
                  {cancellingTicketId === selectedTicket.ticket_id ? 'Deleting ticket...' : 'Delete Ticket & Release Seat'}
                </button>
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
