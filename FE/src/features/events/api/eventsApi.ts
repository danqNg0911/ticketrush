/**
 * Events API functions
 */

import { api, withRetry } from '../../../lib/api'
import type { EventCard, EventDetail, SeatMatrixResponse } from '../../../types'

export interface EventListParams {
  search?: string
  category?: string
  start_from?: string
  end_to?: string
  limit?: number
  offset?: number
}

export const eventsApi = {
  /**
   * List all events with optional filters
   */
  async list(params?: EventListParams): Promise<EventCard[]> {
    const response = await withRetry(() => api.get<EventCard[]>('/events', { params }))
    return response as EventCard[]
  },

  /**
   * Get event detail by slug or ID
   */
  async detail(eventKey: string): Promise<EventDetail> {
    const response = await withRetry(() => api.get<EventDetail>(`/events/${eventKey}`))
    return response as EventDetail
  },

  /**
   * Get seat matrix for an event
   */
  async seats(eventKey: string): Promise<SeatMatrixResponse> {
    const response = await withRetry(() => api.get<SeatMatrixResponse>(`/events/${eventKey}/seats`))
    return response as SeatMatrixResponse
  },
}