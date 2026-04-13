import { useEffect, useRef } from 'react'

interface UseWebSocketHeartbeatOptions {
  url: string | null
  onMessage?: (event: MessageEvent) => void
  onOpen?: () => void
  onClose?: () => void
}

export function useWebSocketHeartbeat({
  url,
  onMessage,
  onOpen,
  onClose,
}: UseWebSocketHeartbeatOptions) {
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!url) return

    const socket = new WebSocket(url)
    socketRef.current = socket

    socket.onopen = () => {
      onOpen?.()
    }

    socket.onmessage = (event) => {
      onMessage?.(event)
    }

    socket.onclose = () => {
      onClose?.()
    }

    const interval = window.setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send('ping')
      }
    }, 10000)

    return () => {
      window.clearInterval(interval)
      socket.close()
    }
  }, [onClose, onMessage, onOpen, url])

  return socketRef
}
