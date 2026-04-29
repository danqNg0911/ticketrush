import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/Button'
import type { GamePlayResponse, GameStatusResponse } from '@/types'

interface LuckyWheelProps {
  status: GameStatusResponse | null
  onPlay: () => Promise<GamePlayResponse | null>
  playsLeft: number
}

export function LuckyWheel({ status, onPlay, playsLeft }: LuckyWheelProps) {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<GamePlayResponse | null>(null)

  const segments = useMemo(() => status?.remaining_prizes ?? [], [status?.remaining_prizes])
  const segmentAngle = segments.length > 0 ? 360 / segments.length : 360

  const handleSpin = async () => {
    if (spinning || playsLeft <= 0 || segments.length === 0) return
    setSpinning(true)
    const response = await onPlay()
    if (!response) {
      setSpinning(false)
      return
    }
    const targetIndex = Math.max(0, Math.min(response.segment_index, segments.length - 1))
    const targetAngle = 360 - (targetIndex * segmentAngle + segmentAngle / 2)
    const nextRotation = rotation + 360 * 6 + targetAngle
    setRotation(nextRotation)
    setResult(response)
    window.setTimeout(() => setSpinning(false), 4200)
  }

  return (
    <div className="space-y-3">
      <div className="relative mx-auto h-64 w-64">
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 text-red-400">▼</div>
        <div
          className="h-64 w-64 rounded-full border-4 border-white/20 transition-transform duration-[4000ms] ease-out"
          style={{
            transform: `rotate(${rotation}deg)`,
            background: `conic-gradient(${segments
              .map((_, idx) => `${idx % 2 === 0 ? '#0ea5e9' : '#14b8a6'} ${(idx * segmentAngle).toFixed(2)}deg ${((idx + 1) * segmentAngle).toFixed(2)}deg`)
              .join(',')})`,
          }}
        />
      </div>
      <Button onClick={() => void handleSpin()} disabled={spinning || playsLeft <= 0} isLoading={spinning}>
        Quay Vòng Quay
      </Button>
      {result && <p className="text-xs text-emerald-300">Kết quả: {result.tier_name} {result.discount_code ? `(${result.discount_code})` : ''}</p>}
    </div>
  )
}

