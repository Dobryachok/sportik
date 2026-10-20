import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export function EventJoinPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    if (id) navigate(`/events/${id}`, { replace: true, state: { openJoin: true } })
    else navigate('/events', { replace: true })
  }, [id, navigate])

  return null
}
