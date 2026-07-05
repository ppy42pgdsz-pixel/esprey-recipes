import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { Suggestion } from '../lib/types'

export default function Suggest() {
  const [onHand, setOnHand] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function suggest() {
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
      <p>
        Tell Claude roughly what's in the kitchen — it'll pick the best matches from your recipes.
      </p>
      <textarea
        placeholder="e.g. chicken thighs, half a cabbage, rice, eggs, parmesan, tinned tomatoes…"
        value={onHand}
        onChange={(e) => setOnHand(e.target.value)}
      />
      <div style={{ marginTop: 10 }}>
        <button onClick={suggest} disabled={!onHand.trim() || loading}>
          {loading ? 'Thinking…' : 'Suggest recipes'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {suggestions !== null && suggestions.length === 0 && (
        <p className="empty">
          No good matches in your collection yet. Try adding more recipes — or use ✨ Invent on the
          Add screen with these ingredients.
        </p>
      )}

      {suggestions?.map((s) => (
        <div key={s.recipe_id} className="card suggestion">
          <Link to={`/recipe/${s.recipe_id}`}>
            <strong>{s.title}</strong>
          </Link>
          <p className="reason">{s.reason}</p>
          {s.missing.length > 0 && (
            <p className="missing">You'd need to buy: {s.missing.join(', ')}</p>
          )}
        </div>
      ))}
    </div>
  )
}
