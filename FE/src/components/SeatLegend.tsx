export function SeatLegend() {
  return (
    <div className="seat-legend">
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
