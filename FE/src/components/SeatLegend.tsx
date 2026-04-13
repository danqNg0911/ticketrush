import type { SeatZone } from '../types'

interface SeatLegendProps {
  zones?: SeatZone[]
}

export function SeatLegend({ zones = [] }: SeatLegendProps) {
  return (
    <div className="seat-legend">
      {zones.map((zone) => (
        <div key={zone.id}>
          <span className="seat-dot" style={{ background: zone.color }} />
          {zone.name}
        </div>
      ))}
      <div>
        <span className="seat-dot seat-dot--available" /> Available
      </div>
      <div>
        <span className="seat-dot seat-dot--locked" /> Locked
      </div>
      <div>
        <span className="seat-dot seat-dot--mine" /> My Lock
      </div>
      <div>
        <span className="seat-dot seat-dot--sold" /> Sold
      </div>
    </div>
  )
}
