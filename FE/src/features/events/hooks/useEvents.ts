/**
 * Custom hook for events data fetching
 */

import { useState, useEffect, useCallback } from 'react'
import type { EventCard, EventDetail, SeatMatrixResponse } from '../../../types'
import { eventsApi } from '../api/eventsApi'

interface UseEventsState {
  events: EventCard[]
  isLoading: boolean
  error: string | null
}

export function useEvents(params?: { search?: string; category?: string }) {
  const [state, setState] = useState<UseEventsState>({
    events: [],
    isLoading: false,
    error: null,
  })

  const fetchEvents = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const events = await eventsApi.list(params)
      setState({ events, isLoading: false, error: null })
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch events',
      }))
    }
  }, [params?.search, params?.category])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return { ...state, refetch: fetchEvents }
}

interface UseEventDetailState {
  event: EventDetail | null
  isLoading: boolean
  error: string | null
}

export function useEventDetail(eventKey?: string) {
  const [state, setState] = useState<UseEventDetailState>({
    event: null,
    isLoading: false,
    error: null,
  })

  const fetchEvent = useCallback(async () => {
    if (!eventKey) return

    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const event = await eventsApi.detail(eventKey)
      setState({ event, isLoading: false, error: null })
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch event details',
      }))
    }
  }, [eventKey])

  useEffect(() => {
    fetchEvent()
  }, [fetchEvent])

  return { ...state, refetch: fetchEvent }
}

interface UseEventSeatsState {
  seats: SeatMatrixResponse | null
  isLoading: boolean
  error: string | null
}

export function useEventSeats(eventKey?: string) {
  const [state, setState] = useState<UseEventSeatsState>({
    seats: null,
    isLoading: false,
    error: null,
  })

  const fetchSeats = useCallback(async () => {
    if (!eventKey) return

    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const seats = await eventsApi.seats(eventKey)
      setState({ seats, isLoading: false, error: null })
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch seats',
      }))
    }
  }, [eventKey])

  useEffect(() => {
    fetchSeats()
  }, [fetchSeats])

  return { ...state, refetch: fetchSeats }
}