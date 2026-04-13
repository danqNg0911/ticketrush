import axios from 'axios'

import { authStorage } from './storage'
import type {
  ApiMessage,
  AudienceDistribution,
  AuthResponse,
  CheckoutResponse,
  DashboardSummary,
  EventCard,
  EventDetail,
  LockSeatResponse,
  OccupancyItem,
  QueueJoinResponse,
  QueueStatusResponse,
  RevenuePoint,
  SeatMatrixResponse,
  TicketItem,
} from '../types'

const apiBaseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

export const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 20000,
})

api.interceptors.request.use((config) => {
  const token = authStorage.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const authApi = {
  async login(email: string, password: string) {
    const response = await api.post<AuthResponse>('/auth/login', { email, password })
    return response.data
  },
  async register(payload: {
    full_name: string
    email: string
    password: string
    gender: 'male' | 'female' | 'other'
    age: number
  }) {
    const response = await api.post<AuthResponse>('/auth/register', payload)
    return response.data
  },
  async me() {
    const response = await api.get<AuthResponse['user']>('/auth/me')
    return response.data
  },
}

export const eventApi = {
  async list(search?: string) {
    const response = await api.get<EventCard[]>('/events', { params: { search } })
    return response.data
  },
  async detail(eventKey: string) {
    const response = await api.get<EventDetail>(`/events/${eventKey}`)
    return response.data
  },
  async seats(eventKey: string) {
    const response = await api.get<SeatMatrixResponse>(`/events/${eventKey}/seats`)
    return response.data
  },
}

export const queueApi = {
  async join(eventKey: string) {
    const response = await api.post<QueueJoinResponse>(`/events/${eventKey}/queue/join`)
    return response.data
  },
  async status(eventKey: string, token: string) {
    const response = await api.get<QueueStatusResponse>(`/events/${eventKey}/queue/status/${token}`)
    return response.data
  },
  async heartbeat(eventKey: string, token: string) {
    await api.post(`/events/${eventKey}/queue/heartbeat/${token}`)
  },
}

export const bookingApi = {
  async lock(eventId: number, seatIds: number[], queueToken?: string) {
    const response = await api.post<LockSeatResponse>('/bookings/lock', {
      event_id: eventId,
      seat_ids: seatIds,
      queue_token: queueToken,
    })
    return response.data
  },
  async release(eventId: number, seatIds: number[]) {
    const response = await api.post<ApiMessage>('/bookings/release', {
      event_id: eventId,
      seat_ids: seatIds,
    })
    return response.data
  },
  async checkout(eventId: number, queueToken?: string) {
    const response = await api.post<CheckoutResponse>('/bookings/checkout', {
      event_id: eventId,
      queue_token: queueToken,
    })
    return response.data
  },
  async myTickets() {
    const response = await api.get<TicketItem[]>('/bookings/my-tickets')
    return response.data
  },
}

export const adminApi = {
  async listEvents() {
    const response = await api.get<EventCard[]>('/admin/events')
    return response.data
  },
  async createEvent(payload: unknown) {
    const response = await api.post<EventDetail>('/admin/events', payload)
    return response.data
  },
  async summary() {
    const response = await api.get<DashboardSummary>('/admin/dashboard/summary')
    return response.data
  },
  async revenue(days = 14) {
    const response = await api.get<RevenuePoint[]>('/admin/dashboard/revenue', { params: { days } })
    return response.data
  },
  async audience() {
    const response = await api.get<AudienceDistribution>('/admin/dashboard/audience')
    return response.data
  },
  async occupancy() {
    const response = await api.get<OccupancyItem[]>('/admin/dashboard/occupancy')
    return response.data
  },
}
