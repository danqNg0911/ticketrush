import { useEffect, useState } from 'react'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { adminApi, extractApiErrorMessage } from '@/lib/api'
import type { AdminGameConfig, AdminGameMonitor, AdminPrizePool } from '@/types'

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

  async function loadMonitor() {
    try {
      const response = await adminApi.gameMonitor()
      setMonitor(response)
    } catch (e) {
      setError(extractApiErrorMessage(e, 'Khong the tai monitor game'))
    }
  }

  async function loadEventGame() {
    if (!eventKey) return
    setLoading(true)
    setError(null)
    try {
      const [cfg, pp] = await Promise.all([adminApi.gameConfigs(eventKey), adminApi.gamePools(eventKey)])
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
      setError(extractApiErrorMessage(e, 'Thao tac that bai'))
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
            Refresh Monitor
          </Button>
          <Button onClick={() => window.open('/api/admin/games/export.csv', '_blank')}>Export CSV</Button>
        </div>
      </div>

      {error && <div className="text-sm text-red-300">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Monitoring</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg bg-slate-800/70 p-3">Plays today: {monitor?.total_plays_today ?? 0}</div>
          <div className="rounded-lg bg-slate-800/70 p-3">Vouchers left: {monitor?.total_vouchers_remaining ?? 0}</div>
          <div className="rounded-lg bg-slate-800/70 p-3">Fraud flags: {(monitor?.top_users ?? []).filter((u) => u.flag_fraud).length}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Event Game Config</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input value={eventKey} onChange={(e) => setEventKey(e.target.value)} placeholder="event slug/id" />
            <Button onClick={() => void loadEventGame()} isLoading={loading}>
              Load
            </Button>
            <Button
              variant="outline"
              onClick={() => openTwoStepConfirm('Force refill event pools', async () => { await adminApi.gameRefill(eventKey) })}
            >
              Force Refill
            </Button>
            <Button
              variant="outline"
              onClick={() => openTwoStepConfirm('Manual reset all event pools', async () => { await adminApi.gameReset() })}
            >
              Manual Reset
            </Button>
          </div>

          <div className="space-y-2">
            {configs.map((cfg) => (
              <div key={cfg.id} className="flex items-center justify-between rounded-lg bg-slate-800/60 p-3">
                <span>
                  {cfg.game_type} | active: {String(cfg.is_active)} | max/day: {cfg.max_plays_per_user_per_day}
                </span>
                <Button
                  size="sm"
                  onClick={() =>
                    void adminApi.upsertGameConfig(eventKey, {
                      game_type: cfg.game_type,
                      is_active: !cfg.is_active,
                      daily_reset_cron: cfg.daily_reset_cron,
                      max_plays_per_user_per_day: cfg.max_plays_per_user_per_day,
                    }).then(loadEventGame)
                  }
                >
                  Toggle
                </Button>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-4 space-y-3">
            <p className="text-sm text-gray-300">Prize Pools</p>
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
                  Refill Tier
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void adminApi.deleteGamePool(pool.id).then(loadEventGame)}>
                  Delete
                </Button>
              </div>
            ))}
            <div className="grid grid-cols-5 gap-2">
              <Input value={newPool.tier_name} onChange={(e) => setNewPool((p) => ({ ...p, tier_name: e.target.value }))} placeholder="tier" />
              <Input type="number" value={newPool.discount_percent} onChange={(e) => setNewPool((p) => ({ ...p, discount_percent: Number(e.target.value) }))} />
              <Input type="number" value={newPool.initial_qty} onChange={(e) => setNewPool((p) => ({ ...p, initial_qty: Number(e.target.value) }))} />
              <Input type="number" value={newPool.weight} onChange={(e) => setNewPool((p) => ({ ...p, weight: Number(e.target.value) }))} />
              <Button onClick={() => void adminApi.createGamePool(eventKey, newPool).then(loadEventGame)}>Add Pool</Button>
            </div>

            {pools.length > 0 && (
              <div className="border-t border-white/10 pt-4 space-y-4">
                <p className="text-sm text-gray-300">Odds Visualization</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg bg-slate-800/50 p-4">
                    <p className="text-xs text-slate-300 mb-3">Weight Distribution (Pie)</p>
                    <div className="mx-auto h-40 w-40 rounded-full border border-white/20" style={{ background: `conic-gradient(${pieStops.join(',')})` }} />
                    <p className="text-xs text-slate-400 mt-3 text-center">Total weight: {totalWeight}</p>
                  </div>
                  <div className="rounded-lg bg-slate-800/50 p-4 space-y-2">
                    <p className="text-xs text-slate-300 mb-1">Remaining by Tier (Bar)</p>
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
          <Input value={confirmCode} onChange={(e) => setConfirmCode(e.target.value)} placeholder="Nhap ma xac nhan" />
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
