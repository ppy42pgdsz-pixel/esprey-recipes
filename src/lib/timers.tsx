import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { api } from './api'
import type { Timer } from './types'

interface TimersValue {
  timers: Timer[]
  now: number
  start: (label: string, minutes: number, recipeId?: number) => Promise<void>
  cancel: (id: number) => Promise<void>
}

const TimersContext = createContext<TimersValue | null>(null)

/** Three short beeps + vibration, used when a timer finishes while the app is open.
    (The push notification from the server covers the locked-phone case.) */
function chime() {
  try {
    const Ctor =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctor()
    const t0 = ctx.currentTime
    for (const off of [0, 0.4, 0.8]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.001, t0 + off)
      gain.gain.exponentialRampToValueAtTime(0.4, t0 + off + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + off + 0.35)
      osc.start(t0 + off)
      osc.stop(t0 + off + 0.4)
    }
  } catch {
    /* audio not available */
  }
  if (navigator.vibrate) navigator.vibrate([250, 100, 250])
}

export function TimersProvider({ children }: { children: ReactNode }) {
  const [timers, setTimers] = useState<Timer[]>([])
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  const alerted = useRef(new Set<number>())

  const refresh = useCallback(async () => {
    try {
      setTimers(await api<Timer[]>('/api/timers?status=running'))
    } catch {
      /* offline etc — keep showing what we have */
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 20000)
    return () => clearInterval(interval)
  }, [refresh])

  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    for (const t of timers) {
      if (t.ends_at <= now && !alerted.current.has(t.id)) {
        alerted.current.add(t.id)
        chime()
      }
    }
  }, [now, timers])

  const start = useCallback(
    async (label: string, minutes: number, recipeId?: number) => {
      await api('/api/timers', {
        method: 'POST',
        body: JSON.stringify({ label, minutes, recipe_id: recipeId }),
      })
      await refresh()
    },
    [refresh]
  )

  const cancel = useCallback(
    async (id: number) => {
      await api(`/api/timers/${id}`, { method: 'DELETE' })
      setTimers((prev) => prev.filter((t) => t.id !== id))
    },
    []
  )

  return (
    <TimersContext.Provider value={{ timers, now, start, cancel }}>
      {children}
    </TimersContext.Provider>
  )
}

export function useTimers(): TimersValue {
  const value = useContext(TimersContext)
  if (!value) throw new Error('useTimers must be used inside TimersProvider')
  return value
}
