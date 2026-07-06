import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { PantryItem, Suggestion } from '../lib/types'

export default function Suggest() {
  const [pantry, setPantry] = useState<PantryItem[]>([])
  const [usePantry, setUsePantry] = useState(true)
  const [extras, setExtras] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set())

  async function addMissing(s: Suggestion) {
    await api('/api/shopping/bulk', {
      method: 'POST',
      body: JSON.stringify({ items: s.missing, recipe_title: s.title }),
    })
    setAddedIds((prev) => new Set(prev).add(s.recipe_id))
  }

  useEffect(() => {
    api<PantryItem[]>('/api/pantry').then(setPantry).catch(() => setPantry([]))
  }, [])

  const havePantry = pantry.length > 0

  async function suggest() {
    const parts = []
    if (havePantry && usePantry) parts.push(pantry.map((p) => p.name).join(', '))
    if (extras.trim()) parts.push(extras.trim())
    const onHand = parts.join(', ')
    if (!onHand) return

    setLoading(true)
    setError('')
    setSuggestions(null)
    try {
      const res = await api<{ suggestions: Suggestion[] }>('/api/suggest', {
        method: 'POST',
        body: JSON.stringify({ on_hand: onHand }),
      })
      setSuggestions(res.suggestions)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>What can we cook?</h1>

      {havePantry ? (
        <label className="pantry-toggle">
          <input
            type="checkbox"
            checked={usePantry}
            onChange={() => setUsePantry(!usePantry)}
          />
          <span>
            Use my pantry list ({pantry.length} items) — <Link to="/pantry">view</Link>
          </span>
        </label>
      ) : (
        <p>
          Tell Claude roughly what's in the kitchen — or save time by scanning the fridge on the{' '}
          <Link to="/pantry">Pantry</Link> tab first.
        </p>
      )}

      <textarea
        placeholder={
          havePantry
            ? 'Anything extra not in the pantry list? (optional)'
            : 'e.g. chicken thighs, half a cabbage, rice, eggs, parmesan…'
        }
        value={extras}
        onChange={(e) => setExtras(e.target.value)}
      />
      <div style={{ marginTop: 10 }}>
        <button
          onClick={suggest}
          disabled={loading || (!(havePantry && usePantry) && !extras.trim())}
        >
          {loading ? 'Thinking…' : 'Suggest recipes'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {suggestions !== null && suggestions.length === 0 && (
        <p className="empty">
          No good matches in your collection yet. Try adding more recipes — or use ✨ Invent on
          the Add screen with these ingredients.
        </p>
      )}

      {suggestions?.map((s) => (
        <div key={s.recipe_id} className="card suggestion">
          <Link to={`/recipe/${s.recipe_id}`}>
            <strong>{s.title}</strong>
          </Link>
          <p className="reason">{s.reason}</p>
          {s.missing.length > 0 && (
            <>
              <p className="missing">You'd need to buy: {s.missing.join(', ')}</p>
              {addedIds.has(s.recipe_id) ? (
                <p className="notice" style={{ margin: '6px 0 0' }}>
                  Added to your shopping list ✓
                </p>
              ) : (
                <button className="small secondary" onClick={() => addMissing(s)}>
                  🛒 Add missing to list
                </button>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  )
}
