import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { queueApi } from '../lib/api'
import { queueStorage } from '../lib/storage'
import type { QueueStatusResponse } from '../types'

export function QueuePage() {
  const { eventKey = '' } = useParams()
  const navigate = useNavigate()

  const [status, setStatus] = useState<QueueStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const queueToken = useMemo(() => queueStorage.getToken(eventKey), [eventKey])

  useEffect(() => {
    const joinOrPollQueue = async () => {
      try {
        setError(null)

        const token = queueStorage.getToken(eventKey)
        if (!token) {
          const join = await queueApi.join(eventKey)
          queueStorage.setToken(eventKey, join.token)
          setStatus({
            token: join.token,
            status: join.status,
            position: join.position,
            admitted_until: join.admitted_until,
            message: join.message,
          })
        } else {
          const state = await queueApi.status(eventKey, token)
          setStatus(state)
        }
      } catch {
        setError('Unable to enter waiting room. Please retry.')
      } finally {
        setLoading(false)
      }
    }

    const poll = async () => {
      const token = queueStorage.getToken(eventKey)
      if (!token) return

      try {
        const state = await queueApi.status(eventKey, token)
        setStatus(state)

        if (state.status === 'admitted') {
          void queueApi.heartbeat(eventKey, token)
          navigate(`/events/${eventKey}/seats?queue_token=${token}`, { replace: true })
          return
        }

        if (state.status === 'expired') {
          queueStorage.clearToken(eventKey)
        }
      } catch {
        setError('Queue polling failed. Retrying...')
      }
    }

    void joinOrPollQueue()

    const pollTimer = window.setInterval(() => {
      void poll()
    }, 2000)

    return () => {
      window.clearInterval(pollTimer)
    }
  }, [eventKey, navigate])

  return (
    <main className="queue-page">
      <section className="queue-card">
        <span className="chip chip-primary">Virtual Queue</span>
        <h1>TicketRush Waiting Room</h1>

        {loading && <p className="state-text">Connecting to waiting room...</p>}
        {error && <p className="state-text state-text--error">{error}</p>}

        {!loading && status && (
          <>
            <p className="queue-position">{status.position ? `#${status.position}` : 'Admitting'}</p>
            <p className="queue-message">{status.message}</p>
            <p className="queue-hint">Bạn đang ở vị trí thứ {status.position ?? '...'} trong hàng đợi. Vui lòng không tải lại trang.</p>
          </>
        )}

        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            if (queueToken) {
              queueStorage.clearToken(eventKey)
            }
            window.location.reload()
          }}
        >
          Refresh Queue Session
        </button>
      </section>
    </main>
  )
}
