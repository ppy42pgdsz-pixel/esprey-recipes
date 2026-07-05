import { useState } from 'react'
import { useTimers } from '../lib/timers'

function format(seconds: number): string {
  if (seconds <= 0) return 'Done!'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`
}

export default function TimerBar() {
  const { timers, now, start, cancel } = useTimers()
  const [formOpen, setFormOpen] = useState(false)
  const [minutes, setMinutes] = useState('')
  const [label, setLabel] = useState('')

  async function submit() {
    const mins = Number(minutes)
    if (!mins || mins <= 0) return
    await start(label.trim() || `${mins} min timer`, mins)
    setFormOpen(false)
    setMinutes('')
    setLabel('')
  }

  return (
    <div className="timer-bar">
      {timers.map((t) => {
        const remaining = t.ends_at - now
        return (
          <span key={t.id} className={`timer-chip${remaining <= 0 ? ' done' : ''}`}>
            {t.label} · {format(remaining)}
            <button className="cancel" onClick={() => cancel(t.id)} aria-label="Dismiss timer">
              ✕
            </button>
          </span>
        )
      })}
      {formOpen ? (
        <div className="timer-form">
          <input
            className="mins"
            type="number"
            inputMode="numeric"
            placeholder="min"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            autoFocus
          />
          <input
            type="text"
            placeholder="What's it for? (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <button className="small" onClick={submit}>
            Start
          </button>
          <button className="small secondary" onClick={() => setFormOpen(false)}>
            ✕
          </button>
        </div>
      ) : (
        <button className="timer-add secondary" onClick={() => setFormOpen(true)}>
          ⏱ + Timer
        </button>
      )}
    </div>
  )
}
