/**
 * Queue API functions
 */

import { api, withRetry } from '../../../lib/api'
import type { QueueJoinResponse, QueueStatusResponse } from '../../../types'

export const queueApi = {
  /**
   * Join queue for an event
   */
  async join(eventKey: string) {
    const response = await api.post<QueueJoinResponse>(`/events/${eventKey}/queue/join`)
    return response.data
  },

  /**
   * Get queue status
   */
  async status(eventKey: string, token: string) {
    return withRetry(() => api.get<QueueStatusResponse>(`/events/${eventKey}/queue/status/${token}`))
  },

  /**
   * Send heartbeat to keep queue session alive
   */
  async heartbeat(eventKey: string, token: string) {
    await api.post(`/events/${eventKey}/queue/heartbeat/${token}`)
  },
}