import { Navigate, useSearchParams } from 'react-router-dom'

export default function QueueLegacy() {
  const [searchParams] = useSearchParams()
  const eventKey = searchParams.get('eventKey')
  return <Navigate to={eventKey ? `/queue?eventKey=${encodeURIComponent(eventKey)}` : '/search'} replace />
}
