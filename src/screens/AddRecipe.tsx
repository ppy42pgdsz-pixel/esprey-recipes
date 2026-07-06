import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { fileToResizedBase64 } from '../lib/image'
import type { Recipe, RecipeDraft } from '../lib/types'

type Mode = 'url' | 'photo' | 'invent'

export default function AddRecipe() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('url')
  const [url, setUrl] = useState('')
  const [prompt, setPrompt] = useState('')
  const [draft, setDraft] = useState<RecipeDraft | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function run(action: () => Promise<RecipeDraft>) {
    setLoading(true)
    setError('')
    try {
      setDraft(await action())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function importUrl() {
    await run(() => api<RecipeDraft>('/api/import', { method: 'POST', body: JSON.stringify({ url }) }))
  }

  async function importPhoto(file: File) {
    await run(async () => {
      const image = await fileToResizedBase64(file)
      return api<RecipeDraft>('/api/photo', { method: 'POST', body: JSON.stringify(image) })
    })
  }

  async function invent() {
    await run(() => api<RecipeDraft>('/api/invent', { method: 'POST', body: JSON.stringify({ prompt }) }))
  }

  async function save() {
    if (!draft) return
    const saved = await api<Recipe>('/api/recipes', { method: 'POST', body: JSON.stringify(draft) })
    navigate(`/recipe/${saved.id}`)
  }

  if (draft) {
    return (
      <div>
        <h1>Check the recipe</h1>
        <p className="notice">Have a quick read — if it looks right, save it.</p>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{draft.title}</h2>
          {draft.description && <p>{draft.description}</p>}
          <h2>Ingredients</h2>
          <ul>
            {draft.ingredients.map((ing, i) => (
              <li key={i}>
                {ing.quantity ? `${ing.quantity} ` : ''}
                {ing.item}
              </li>
            ))}
          </ul>
          <h2>Steps</h2>
          <ol className="steps">
            {draft.steps.map((s, i) => (
              <li key={i}>
                {s.text}
                {s.tip && (
                  <details>
                    <summary>💡 Tip</summary>
                    <p>{s.tip}</p>
                  </details>
                )}
              </li>
            ))}
          </ol>
        </div>
        <div className="row">
          <button onClick={save}>Save recipe</button>
          <button className="secondary" onClick={() => setDraft(null)}>
            Discard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1>Add a recipe</h1>
      <div className="mode-tabs">
        <button className={mode === 'url' ? 'active' : ''} onClick={() => setMode('url')}>
          🔗 Link
        </button>
        <button className={mode === 'photo' ? 'active' : ''} onClick={() => setMode('photo')}>
          📷 Photo
        </button>
        <button className={mode === 'invent' ? 'active' : ''} onClick={() => setMode('invent')}>
          ✨ Invent
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="loading">Claude is reading the recipe…</p>}

      {!loading && mode === 'url' && (
        <div>
          <p>Paste a link to a recipe page and Claude will pull out the recipe.</p>
          <input
            type="url"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <div style={{ marginTop: 10 }}>
            <button onClick={importUrl} disabled={!url}>
              Import
            </button>
          </div>
        </div>
      )}

      {!loading && mode === 'photo' && (
        <div>
          <p>Snap a cookbook page, recipe card, or a screenshot of a recipe.</p>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) importPhoto(file)
            }}
          />
        </div>
      )}

      {!loading && mode === 'invent' && (
        <div>
          <p>Describe what you fancy and Claude will invent a recipe.</p>
          <textarea
            placeholder="e.g. a midweek chicken traybake for 4, not too spicy"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div style={{ marginTop: 10 }}>
            <button onClick={invent} disabled={!prompt.trim()}>
              Invent recipe
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
