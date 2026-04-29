import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import type { GamePlayResponse } from '@/types'

interface ScratchCardProps {
  onPlay: () => Promise<GamePlayResponse | null>
  playsLeft: number
}

export function ScratchCard({ onPlay, playsLeft }: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [result, setResult] = useState<GamePlayResponse | null>(null)
  const [readyToScratch, setReadyToScratch] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#334155'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#e2e8f0'
    ctx.font = 'bold 18px sans-serif'
    ctx.fillText('Cào để xem kết quả', 45, 75)
  }, [result])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !readyToScratch) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let pressed = false
    const scratch = (x: number, y: number) => {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(x, y, 14, 0, Math.PI * 2)
      ctx.fill()
    }

    const onDown = () => { pressed = true }
    const onUp = () => { pressed = false }
    const onMove = (e: MouseEvent) => {
      if (!pressed) return
      const rect = canvas.getBoundingClientRect()
      scratch(e.clientX - rect.left, e.clientY - rect.top)
    }
    canvas.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    canvas.addEventListener('mousemove', onMove)
    return () => {
      canvas.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      canvas.removeEventListener('mousemove', onMove)
    }
  }, [readyToScratch])

  const play = async () => {
    if (playsLeft <= 0) return
    setLoading(true)
    const response = await onPlay()
    setLoading(false)
    if (response) {
      setResult(response)
      setReadyToScratch(true)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
        <p className="text-xs text-slate-400 mb-2">Kết quả sẽ hiện dưới lớp cào (server-authoritative)</p>
        <div className="relative w-[320px] max-w-full">
          <div className="absolute inset-0 flex items-center justify-center text-center px-4">
            <p className="text-sm text-white font-semibold">
              {result ? `${result.tier_name}${result.discount_code ? ` - ${result.discount_code}` : ''}` : 'Bấm chơi để nhận kết quả'}
            </p>
          </div>
          <canvas ref={canvasRef} width={320} height={150} className="relative rounded-lg border border-white/20" />
        </div>
      </div>
      <Button onClick={() => void play()} isLoading={loading} disabled={loading || playsLeft <= 0}>
        Chơi Scratch Card
      </Button>
    </div>
  )
}

