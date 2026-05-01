import { useEffect, useState } from 'react'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { adminApi, extractApiErrorMessage } from '@/lib/api'
import type { AdminGameConfig, AdminGameMonitor, AdminPrizePool } from '@/types'
import { FerrisWheel, Ticket } from "lucide-react"

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
      />
      <div
        className={`w-11 h-6 rounded-full peer-checked:bg-red-400 bg-gray-400 relative transition-colors`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform
            ${checked ? "translate-x-5" : ""}`}
        />
      </div>
    </label>
  )
}
export default function AdminGames() {
  const [eventKey, setEventKey] = useState('')
  const [configs, setConfigs] = useState<AdminGameConfig[]>([])
  const [pools, setPools] = useState<AdminPrizePool[]>([])
  const [monitor, setMonitor] = useState<AdminGameMonitor | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    label: string
    expectedCode: string
    action: () => Promise<void>
  } | null>(null)
  const [confirmCode, setConfirmCode] = useState('')

  const [newPool, setNewPool] = useState({
    tier_name: '',
    discount_percent: 10,
    initial_qty: 50,
    weight: 10,
  })
  const gameTypes: Array<'wheel' | 'scratch'> = ['wheel', 'scratch']
  const normalizedEventKey = eventKey.trim()

  async function loadMonitor() {
    try {
      const response = await adminApi.gameMonitor()
      setMonitor(response)
    } catch (e) {
      setError(extractApiErrorMessage(e, 'Khong the tai monitor game'))
    }
  }

  async function loadEventGame() {
    if (!normalizedEventKey) return
    setLoading(true)
    setError(null)
    try {
      const [cfg, pp] = await Promise.all([adminApi.gameConfigs(normalizedEventKey), adminApi.gamePools(normalizedEventKey)])
      setConfigs(cfg)
      setPools(pp)
    } catch (e) {
      setError(extractApiErrorMessage(e, 'Khong the tai game config/pools'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadMonitor()
  }, [])

  const totalWeight = pools.reduce((acc, pool) => acc + Math.max(0, pool.weight), 0)
  const totalRemaining = pools.reduce((acc, pool) => acc + Math.max(0, pool.remaining_qty), 0)
  const pieStops: string[] = []
  let cursor = 0
  const colors = ['#0ea5e9', '#22c55e', '#f59e0b', '#f97316', '#ec4899', '#6366f1', '#14b8a6', '#ef4444']
  pools.forEach((pool, idx) => {
    const ratio = totalWeight > 0 ? pool.weight / totalWeight : 0
    const next = cursor + ratio * 360
    pieStops.push(`${colors[idx % colors.length]} ${cursor.toFixed(2)}deg ${next.toFixed(2)}deg`)
    cursor = next
  })

  function openTwoStepConfirm(label: string, action: () => Promise<void>) {
    const expectedCode = `${Math.floor(100000 + Math.random() * 900000)}`
    setConfirmCode('')
    setConfirmAction({ label, expectedCode, action })
  }

  async function submitConfirm() {
    if (!confirmAction || confirmCode.trim() !== confirmAction.expectedCode) return
    setActionLoading(true)
    setError(null)
    try {
      await confirmAction.action()
      await Promise.all([loadMonitor(), loadEventGame()])
      setConfirmAction(null)
      setConfirmCode('')
    } catch (e) {
      setError(extractApiErrorMessage(e, 'Thao tác thất bại'))
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-white">Game Admin</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadMonitor()}>
            Làm mới
          </Button>
          <Button onClick={() => window.open('/api/admin/games/export.csv', '_blank')}>Xuất CSV</Button>
        </div>
      </div>

      {error && <div className="text-sm text-red-300">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Giám sát</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg bg-slate-800/70 p-3">Lượt đã chơi hôm nay: {monitor?.total_plays_today ?? 0}</div>
          <div className="rounded-lg bg-slate-800/70 p-3">Số voucher còn lại: {monitor?.total_vouchers_remaining ?? 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cài đặt game</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1">
              <p className="text-xs text-slate-300">Nhập sự kiện</p>
              <Input value={eventKey} onChange={(e) => setEventKey(e.target.value)} placeholder="Event ID" />
            </div>
            <Button className="rounded-xl bg-gradient-to-r from-primary to-primary-container" variant="primary" onClick={() => void loadEventGame()} isLoading={loading}>
              Load
            </Button>
          </div>

          {!normalizedEventKey && (
            <p className="text-xs text-amber-300">Nhập Event ID trước khi thao tác</p>
          )}

          <div className="flex space-x-4">
            {gameTypes.map((gameType) => {
              const cfg = configs.find((item) => item.game_type === gameType)
              const isActive = cfg?.is_active ?? false
              const cron = cfg?.daily_reset_cron ?? "0 0 * * *"
              const maxPerDay = cfg?.max_plays_per_user_per_day ?? 3

              const icon =
                gameType === "wheel" ? (
                  <FerrisWheel className="mr-2 h-5 w-5" />
                ) : (
                  <Ticket className="mr-2 h-5 w-5" />
                )

              const gameName =
                gameType === "wheel" ? "Vòng quay may mắn" : "Cào vé trúng thưởng"

              return (
                <div
                  key={gameType}
                  className="flex flex-col rounded-lg bg-slate-800/60 p-3 w-1/2"
                >
                  <div className="flex items-center mb-2">
                    {icon}
                    <span className="font-semibold">{gameName}</span>
                  </div>
                  <div className="text-sm mb-2">Số lượt/ngày: {maxPerDay}</div>
                  <ToggleSwitch
                    checked={isActive}
                    onChange={() =>
                      void adminApi
                        .upsertGameConfig(normalizedEventKey, {
                          game_type: gameType,
                          is_active: !isActive,
                          daily_reset_cron: cron,
                          max_plays_per_user_per_day: maxPerDay,
                        })
                        .then(loadEventGame)
                    }
                  />
                </div>
              )
            })}
          </div>


          <div className="border-t border-white/10 pt-4 space-y-3">
            <p className="text-sm text-gray-300">Pools phần thưởng</p>
            {pools.map((pool) => (
              <div key={pool.id} className="grid grid-cols-6 gap-2 items-center rounded bg-slate-800/50 p-2">
                <span>{pool.tier_name}</span>
                <span>{pool.discount_percent}%</span>
                <span>{pool.remaining_qty}/{pool.initial_qty}</span>
                <span>w={pool.weight}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    openTwoStepConfirm(`Refill tier ${pool.tier_name}`, async () => {
                      await adminApi.updateGamePool(pool.id, { ...pool, remaining_qty: pool.initial_qty })
                    })
                  }
                >
                  Đặt mặc định
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void adminApi.deleteGamePool(pool.id).then(loadEventGame)}>
                  Xóa
                </Button>
              </div>
            ))}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
              <div className="space-y-1">
                <p className="text-xs text-slate-300">Giải</p>
                <Input value={newPool.tier_name} onChange={(e) => setNewPool((p) => ({ ...p, tier_name: e.target.value }))} placeholder="VD: Gold" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-300">Giảm giá (%)</p>
                <Input type="number" value={newPool.discount_percent} onChange={(e) => setNewPool((p) => ({ ...p, discount_percent: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-300">Số lượng giải</p>
                <Input type="number" value={newPool.initial_qty} onChange={(e) => setNewPool((p) => ({ ...p, initial_qty: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-300">Trọng số</p>
                <Input type="number" value={newPool.weight} onChange={(e) => setNewPool((p) => ({ ...p, weight: Number(e.target.value) }))} />
              </div>
              <Button disabled={!normalizedEventKey} onClick={() => void adminApi.createGamePool(normalizedEventKey, newPool).then(loadEventGame)}>Thêm Pool</Button>
            </div>

            {pools.length > 0 && (
              <div className="border-t border-white/10 pt-4 space-y-4">
                <p className="text-sm text-gray-300">Trực quan thông số</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg bg-slate-800/50 p-4">
                    <p className="text-xs font-bold text-slate-300 mb-3">Phân phối trọng số </p>
                    <svg viewBox="0 0 32 32" className="mx-auto w-40 h-40">
                      <defs>
                        <clipPath id="circleClip">
                          <circle cx="16" cy="16" r="16" />
                        </clipPath>
                      </defs>

                      <g clipPath="url(#circleClip)">
                        {(() => {
                          let cumulative = 0
                          return pools.map((pool, idx) => {
                            const value = totalWeight > 0 ? pool.weight / totalWeight : 0
                            const dash = value * 100
                            const gap = 100 - dash
                            const color = colors[idx % colors.length]

                            const circle = (
                              <circle
                                key={pool.id}
                                r="16"
                                cx="16"
                                cy="16"
                                fill="transparent"
                                stroke={color}
                                strokeWidth="32"
                                strokeDasharray={`${dash} ${gap}`}
                                strokeDashoffset={-cumulative}
                              />
                            )

                            cumulative += dash
                            return circle
                          })
                        })()}
                      </g>
                    </svg>
                    <p className="text-xs text-slate-400 mt-3 text-center">Tổng trọng số: {totalWeight}</p>
                    <div className="mt-3 space-y-1">
                      {pools.map((pool, idx) => (
                        <div key={`legend-${pool.id}`} className="flex items-center text-xs text-slate-300">
                          <span
                            className="inline-block w-3 h-3 rounded-sm mr-2"
                            style={{ backgroundColor: colors[idx % colors.length] }}
                          />
                          <span>{pool.tier_name} ({pool.weight})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-800/50 p-4 space-y-2">
                    <p className="text-xs font-bold text-slate-300 mb-1">Số giải còn lại</p>
                    {pools.map((pool) => {
                      const width = totalRemaining > 0 ? (pool.remaining_qty / totalRemaining) * 100 : 0
                      return (
                        <div key={`bar-${pool.id}`} className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-slate-300">
                            <span>{pool.tier_name}</span>
                            <span>{pool.remaining_qty}</span>
                          </div>
                          <div className="h-2 rounded bg-slate-700/70 overflow-hidden">
                            <div className="h-full rounded bg-emerald-400/80" style={{ width: `${width.toFixed(2)}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={Boolean(confirmAction)} onClose={() => !actionLoading && setConfirmAction(null)} title="Confirm Sensitive Action">
        <div className="space-y-3">
          <p className="text-sm text-slate-300">{confirmAction?.label}</p>
          <p className="text-xs text-amber-300">
            Step 1: Nhap ma xac nhan de tiep tuc. Ma: <span className="font-mono font-semibold">{confirmAction?.expectedCode}</span>
          </p>
          <div className="space-y-1">
            <p className="text-xs text-slate-300">Ma xac nhan</p>
            <Input value={confirmCode} onChange={(e) => setConfirmCode(e.target.value)} placeholder="Nhap ma xac nhan" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmAction(null)} disabled={actionLoading}>
              Huy
            </Button>
            <Button onClick={() => void submitConfirm()} disabled={confirmCode.trim() !== confirmAction?.expectedCode} isLoading={actionLoading}>
              Step 2: Xac nhan va thuc thi
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
