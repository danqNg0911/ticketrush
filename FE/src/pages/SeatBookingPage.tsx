import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { SeatLegend } from '../components/SeatLegend'
import { useAuth } from '../hooks/useAuth'
import { useWebSocketHeartbeat } from '../hooks/useWebSocketHeartbeat'
import { bookingApi, eventApi, queueApi } from '../lib/api'
import { queueStorage } from '../lib/storage'
import type { CheckoutResponse, EventDetail, Seat } from '../types'

interface SeatUpdatePayload {
  id: number
  status: 'available' | 'locked' | 'sold'
  lock_expires_at: string | null
  locked_by_user_id: number | null
}

export function SeatBookingPage() {
  const { eventKey = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, token } = useAuth()

  const [event, setEvent] = useState<EventDetail | null>(null)
  const [seats, setSeats] = useState<Seat[]>([])
  const [loading, setLoading] = useState(true)
  const [busySeatId, setBusySeatId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [checkoutData, setCheckoutData] = useState<CheckoutResponse | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())

  const queueToken = useMemo(() => {
    const fromQuery = new URLSearchParams(location.search).get('queue_token')
    const persisted = queueStorage.getToken(eventKey)
    return fromQuery ?? persisted ?? undefined
  }, [eventKey, location.search])

  useEffect(() => {
    if (!queueToken) return
    queueStorage.setToken(eventKey, queueToken)
  }, [eventKey, queueToken])

  const wsBase = import.meta.env.VITE_WS_BASE_URL ?? 'ws://localhost:8000/ws'

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [eventResponse, seatMatrixResponse] = await Promise.all([
        eventApi.detail(eventKey),
        eventApi.seats(eventKey),
      ])

      setEvent(eventResponse)
      setSeats(seatMatrixResponse.seats)

      if (eventResponse.queue_enabled && !queueToken) {
        navigate(`/events/${eventKey}/queue`, { replace: true })
        return
      }
    } catch {
      setError('Unable to load seat map. You may need queue access token.')
    } finally {
      setLoading(false)
    }
  }, [eventKey, navigate, queueToken])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  useEffect(() => {
    if (!event?.queue_enabled || !queueToken) return

    const interval = window.setInterval(() => {
      void queueApi.heartbeat(eventKey, queueToken)
    }, 20000)

    return () => {
      window.clearInterval(interval)
    }
  }, [event?.queue_enabled, eventKey, queueToken])

  useEffect(() => {
    const interval = window.setInterval(() => setNowTick(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useWebSocketHeartbeat({
    url: token ? `${wsBase}/events/${eventKey}/seats?token=${token}` : null,
    onMessage: (eventMessage) => {
      try {
        const data = JSON.parse(eventMessage.data) as { type: string; payload: SeatUpdatePayload[] }
        if (data.type !== 'seat_changes') return

        setSeats((prevSeats) =>
          prevSeats.map((seat) => {
            const update = data.payload.find((item) => item.id === seat.id)
            if (!update) return seat

            return {
              ...seat,
              status: update.status,
              lock_expires_at: update.lock_expires_at,
              is_locked_by_me: update.locked_by_user_id === user?.id,
            }
          }),
        )
      } catch {
        // Ignore non-json ping or malformed payload.
      }
    },
  })

  const selectedSeats = useMemo(() => seats.filter((seat) => seat.is_locked_by_me && seat.status === 'locked'), [seats])
  const totalPrice = useMemo(
    () => selectedSeats.reduce((sum, seat) => sum + Number(seat.price), 0),
    [selectedSeats],
  )

  const holdDeadline = useMemo(() => {
    if (selectedSeats.length === 0) return null
    return selectedSeats
      .map((seat) => seat.lock_expires_at)
      .filter(Boolean)
      .sort()[0]
  }, [selectedSeats])

  const holdCountdown = useMemo(() => {
    if (!holdDeadline) return '--:--'
    const seconds = dayjs(holdDeadline).diff(dayjs(nowTick), 'second')
    if (seconds <= 0) return '00:00'

    const minutePart = String(Math.floor(seconds / 60)).padStart(2, '0')
    const secondPart = String(seconds % 60).padStart(2, '0')
    return `${minutePart}:${secondPart}`
  }, [holdDeadline, nowTick])

  const handleSeatClick = async (seat: Seat) => {
    if (!event || busySeatId) return

    if (seat.status === 'sold') return

    setBusySeatId(seat.id)
    setError(null)

    try {
      if (seat.status === 'locked' && seat.is_locked_by_me) {
        await bookingApi.release(event.id, [seat.id])
        setSeats((prevSeats) =>
          prevSeats.map((item) =>
            item.id === seat.id
              ? { ...item, status: 'available', is_locked_by_me: false, lock_expires_at: null }
              : item,
          ),
        )
        return
      }

      if (seat.status === 'locked' && !seat.is_locked_by_me) {
        setError(`Seat ${seat.seat_label} is already locked by another user.`)
        return
      }

      const lockResult = await bookingApi.lock(event.id, [seat.id], queueToken)
      if (lockResult.failed_seat_ids.length > 0) {
        setError(`Seat ${seat.seat_label} was taken by another user.`)
      }

      if (lockResult.locked_seat_ids.length > 0) {
        setSeats((prevSeats) =>
          prevSeats.map((item) =>
            item.id === seat.id
              ? {
                  ...item,
                  status: 'locked',
                  is_locked_by_me: true,
                  lock_expires_at: dayjs().add(event.hold_minutes, 'minute').toISOString(),
                }
              : item,
          ),
        )
      }
    } catch {
      setError('Failed to lock seat. Please retry.')
    } finally {
      setBusySeatId(null)
    }
  }

  const handleCheckout = async () => {
    if (!event) return

    try {
      const checkout = await bookingApi.checkout(event.id, queueToken)
      setCheckoutData(checkout)
      queueStorage.clearToken(eventKey)
      void fetchAll()
    } catch {
      setError('Checkout failed. Lock may have expired.')
    }
  }

  const zoneMap = useMemo(() => {
    const map = new Map<number, string>()
    event?.zones.forEach((zone) => {
      map.set(zone.id, zone.name)
    })
    return map
  }, [event])

  return (
    <main className="page page-seat-booking app-container">
      {loading && <p className="state-text">Loading seat map...</p>}

      {error && <p className="state-text state-text--error">{error}</p>}

      {!loading && event && (
        <>
          <section className="seat-header">
            <div>
              <span className="chip chip-primary">{event.category}</span>
              <h1>{event.title}</h1>
              <p>
                {dayjs(event.start_at).format('DD MMM YYYY HH:mm')} • {event.venue}
              </p>
            </div>

            <div className="seat-header__timer">
              <p>Hold Timer</p>
              <strong>{holdCountdown}</strong>
              <small>Seats auto-release in {event.hold_minutes} minutes</small>
            </div>
          </section>

          <section className="seat-layout-grid">
            <article className="seat-map-card">
              <div className="stage-pill">MAIN STAGE</div>
              <SeatLegend />

              <div className="seat-grid">
                {seats.map((seat) => {
                  const className = [
                    'seat-cell',
                    seat.status === 'sold' ? 'seat-cell--sold' : '',
                    seat.status === 'locked' && seat.is_locked_by_me ? 'seat-cell--mine' : '',
                    seat.status === 'locked' && !seat.is_locked_by_me ? 'seat-cell--locked' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')

                  return (
                    <button
                      key={seat.id}
                      type="button"
                      className={className}
                      title={`${seat.seat_label} • ${zoneMap.get(seat.zone_id)} • $${seat.price}`}
                      onClick={() => void handleSeatClick(seat)}
                      disabled={seat.status === 'sold' || busySeatId === seat.id}
                    >
                      {seat.row_label}
                      {seat.seat_number}
                    </button>
                  )
                })}
              </div>
            </article>

            <aside className="seat-summary-card">
              <h2>Selected Seats</h2>
              <p>{selectedSeats.length} seats locked</p>

              <ul>
                {selectedSeats.map((seat) => (
                  <li key={seat.id}>
                    <span>{seat.seat_label}</span>
                    <span>${Number(seat.price).toFixed(2)}</span>
                  </li>
                ))}
                {selectedSeats.length === 0 && <li>No seats selected yet.</li>}
              </ul>

              <div className="seat-summary__total">
                <span>Total</span>
                <strong>${totalPrice.toFixed(2)}</strong>
              </div>

              <button type="button" className="btn btn-primary" disabled={selectedSeats.length === 0} onClick={handleCheckout}>
                Confirm Checkout
              </button>
            </aside>
          </section>
        </>
      )}

      {checkoutData && (
        <section className="checkout-modal-backdrop" role="dialog" aria-modal="true">
          <div className="checkout-modal">
            <h3>Order Confirmed</h3>
            <p>
              Order #{checkoutData.order_id} • {checkoutData.items.length} tickets • ${Number(checkoutData.total_amount).toFixed(2)}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setCheckoutData(null)
                navigate('/my-tickets')
              }}
            >
              Go to My Tickets
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
