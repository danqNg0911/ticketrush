import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { adminApi, extractApiErrorMessage } from '@/lib/api'
import type { AudienceDistribution, OccupancyItem } from '@/types'
import { BarChart3, PieChart, RefreshCcw, Users } from 'lucide-react'

function normalizeLabel(value: string) {
  return value.replaceAll('_', ' ')
}

export default function AdminAnalytics() {
  const [audience, setAudience] = useState<AudienceDistribution | null>(null)
  const [occupancy, setOccupancy] = useState<OccupancyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalAudience = useMemo(
    () => Object.values(audience?.age_groups ?? {}).reduce((sum, value) => sum + value, 0),
    [audience],
  )

  async function loadAnalyticsData(isRefresh = false) {
    setError(null)
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const [audienceRes, occupancyRes] = await Promise.all([adminApi.audience(), adminApi.occupancy()])
      setAudience(audienceRes)
      setOccupancy(occupancyRes)
    } catch (errorValue) {
      setError(extractApiErrorMessage(errorValue, 'Khong the tai du lieu analytics.'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadAnalyticsData()
  }, [])

  if (loading) {
    return <div className="text-sm text-gray-300">Dang tai du lieu analytics...</div>
  }

  const ageEntries = Object.entries(audience?.age_groups ?? {})
  const genderEntries = Object.entries(audience?.gender_groups ?? {})

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">Thong ke khan gia</h2>
          <p className="text-gray-400 mt-1">Du lieu lay truc tiep tu API admin</p>
        </div>
        <Button variant="outline" onClick={() => void loadAnalyticsData(true)} isLoading={refreshing}>
          <RefreshCcw className="h-4 w-4" />
          Lam moi
        </Button>
      </div>

      {error && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="pt-6 text-sm text-red-200">{error}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-400">Tong khan gia</p>
            <p className="text-2xl font-bold text-white mt-2">{totalAudience.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-400">Nhom tuoi</p>
            <p className="text-2xl font-bold text-brand-yellow mt-2">{ageEntries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-400">Nhom gioi tinh</p>
            <p className="text-2xl font-bold text-cyan-400 mt-2">{genderEntries.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PieChart className="h-5 w-5 text-brand-red" />
              Phan bo do tuoi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ageEntries.length === 0 ? (
              <p className="text-sm text-gray-400">Chua co du lieu do tuoi.</p>
            ) : (
              ageEntries.map(([ageRange, count]) => {
                const percentage = totalAudience > 0 ? (count / totalAudience) * 100 : 0
                return (
                  <div key={ageRange} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white">{normalizeLabel(ageRange)}</span>
                      <span className="text-gray-300">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 rounded bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-red to-brand-yellow"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-cyan-400" />
              Phan bo gioi tinh
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {genderEntries.length === 0 ? (
              <p className="text-sm text-gray-400">Chua co du lieu gioi tinh.</p>
            ) : (
              genderEntries.map(([gender, count]) => {
                const percentage = totalAudience > 0 ? (count / totalAudience) * 100 : 0
                return (
                  <div key={gender} className="rounded-lg border border-white/10 bg-space-700/40 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white">{normalizeLabel(gender)}</span>
                      <Badge variant="info" size="sm">
                        {percentage.toFixed(1)}%
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{count} nguoi</p>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-brand-yellow" />
            Occupancy theo su kien
          </CardTitle>
        </CardHeader>
        <CardContent>
          {occupancy.length === 0 ? (
            <p className="text-sm text-gray-400">Chua co du lieu su kien.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-gray-400">
                    <th className="pb-3 font-medium">Su kien</th>
                    <th className="pb-3 font-medium">Sold</th>
                    <th className="pb-3 font-medium">Locked</th>
                    <th className="pb-3 font-medium">Tong ghe</th>
                    <th className="pb-3 font-medium text-right">Occupancy</th>
                  </tr>
                </thead>
                <tbody>
                  {occupancy.map((item) => (
                    <tr key={item.event_id} className="border-b border-white/5">
                      <td className="py-3 text-white">{item.event_title}</td>
                      <td className="py-3 text-gray-300">{item.sold_seats}</td>
                      <td className="py-3 text-gray-300">{item.locked_seats}</td>
                      <td className="py-3 text-gray-300">{item.total_seats}</td>
                      <td className="py-3 text-right text-brand-yellow">{item.occupancy_rate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
