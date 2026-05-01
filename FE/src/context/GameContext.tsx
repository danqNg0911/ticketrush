import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { gameApi } from '@/lib/api'
import type { GameStatusResponse } from '@/types'

interface GameContextType {
  status: GameStatusResponse | null
  isLoading: boolean
  error: string | null
  playsLeft: { wheel: number; scratch: number }
  refreshStatus: (eventId: number) => Promise<void>
}

const GameContext = createContext<GameContextType | undefined>(undefined)

const MAX_DAILY_PLAYS = 3

export function GameProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<GameStatusResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshStatus = useCallback(async (eventId: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const next = await gameApi.status(eventId)
      setStatus(next)
    } catch {
      setError('Hệ thống đang bận, vui lòng thử lại sau 30s')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const playsLeft = useMemo(() => {
    if (!status) return { wheel: MAX_DAILY_PLAYS, scratch: MAX_DAILY_PLAYS }
    return {
      wheel: Math.max(MAX_DAILY_PLAYS - status.user_plays_today.wheel_count, 0),
      scratch: Math.max(MAX_DAILY_PLAYS - status.user_plays_today.scratch_count, 0),
    }
  }, [status])

  const value = useMemo(
    () => ({ status, isLoading, error, playsLeft, refreshStatus }),
    [status, isLoading, error, playsLeft, refreshStatus],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const context = useContext(GameContext)
  if (!context) throw new Error('useGame must be used within GameProvider')
  return context
}

