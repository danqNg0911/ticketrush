/**
 * Booking API functions
 */

import { api, withRetry } from '../../../lib/api'
import type { LockSeatResponse, CheckoutResponse, TicketItem, ApiMessage } from '../../../types'

export interface LockSeatsPayload {
  event_id: number
  seat_ids: number[]
  queue_token?: string
}

export interface ReleaseSeatsPayload {
  event_id: number
  seat_ids: number[]
}

export interface CheckoutPayload {
  event_id: number
  queue_token?: string
  discount_code?: string
}

export interface MyTicketsParams {
  search?: string
  start_from?: string
  end_to?: string
}

export const bookingApi = {
  /**
   * Lock seats for an event
   */
  async lock(payload: LockSeatsPayload): Promise<LockSeatResponse> {
    const response = await withRetry(
      () =>
        api.post<LockSeatResponse>('/bookings/lock', {
          event_id: payload.event_id,
          seat_ids: payload.seat_ids,
          queue_token: payload.queue_token,
        }),
      2,
    )
    return response
  },

  /**
   * Release locked seats
   */
  async release(payload: ReleaseSeatsPayload): Promise<ApiMessage> {
    const response = await api.post<ApiMessage>('/bookings/release', {
      event_id: payload.event_id,
      seat_ids: payload.seat_ids,
    })
    return response.data
  },

  /**
   * Checkout and purchase locked seats
   */
  async checkout(payload: CheckoutPayload): Promise<CheckoutResponse> {
    const response = await api.post<CheckoutResponse>('/bookings/checkout', {
      event_id: payload.event_id,
      queue_token: payload.queue_token,
      discount_code: payload.discount_code,
    })
    return response.data
  },

  /**
   * Get current user's tickets
   */
  async myTickets(params?: MyTicketsParams): Promise<TicketItem[]> {
    const response = await withRetry(() => api.get<TicketItem[]>('/bookings/my-tickets', { params }))
    return response 
  },

  /**
   * Cancel a ticket
   */
  async cancelTicket(ticketId: number): Promise<ApiMessage> {
    const response = await api.delete<ApiMessage>(`/bookings/my-tickets/${ticketId}`)
    return response.data
  },
}
