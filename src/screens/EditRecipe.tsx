import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import type { Recipe, Step } from '../lib/types'

export default function EditRecipe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [servings, setServings] = useState('')
  const [prep, setPrep] = useState('')
  const [cook, setCook] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [steps, setSteps] = useState<Step[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api<Recipe>(`/api/recipes/${id}`)
      .then((r) => {
        setRecipe(r)
        setTitle(r.title)
        setDescription(r.description ?? '')
        setServings(r.servings ?? '')
        setPrep(r.prep_minutes != null ? String(r.prep_minutes) : '')
        setCook(r.cook_minutes != null ? String(r.cook_minutes) : '')
        setIngredients(
          r.ingredients.map((i) => `${i.quantity ? i.quantity + ' ' : ''}${i.item}`).join('\n')
        )
        setSteps(r.steps.map((s) => ({ ...s })))
      })
      .catch((e) => setError(e.message))
  }, [id])

  if (error && !recipe) return <p className="error">{error}</p>
  if (!recipe) return <p className="loading">Loading…</p>

  function updateStep(index: number, patch: Partial<Step>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  async function save() {
    if (!title.trim()) {
      setError('The recipe needs a title')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api(`/api/recipes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          servings: servings.trim() || null,
          prep_minutes: prep.trim() ? Number(prep) : null,
          cook_minutes: cook.trim() ? Number(cook) : null,
          ingredients: ingredients
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => ({ item: line })),
          steps: steps
            .filter((s) => s.text.trim())
            .map((s) => ({
              text: s.text.trim(),
              tip: s.tip?.trim() || undefined,
              minutes: s.minutes || undefined,
            })),
        }),
      })
      navigate(`/recipe/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <div>
      <h1>Edit recipe</h1>
      {error && <p className="error">{error}</p>}

      <h2>Title</h2>
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />

      <h2>Description</h2>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} />

      <div className="row" style={{ marginTop: 10 }}>
        <input
          type="text"
          placeholder="Serves"
          value={servings}
          onChange={(e) => setServings(e.target.value)}
        />
        <input
          type="number"
          placeholder="Prep min"
          value={prep}
          onChange={(e) => setPrep(e.target.value)}
        />
        <input
          type="number"
          placeholder="Cook min"
          value={cook}
          onChange={(e) => setCook(e.target.value)}
        />
      </div>

      <h2>Ingredients</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)' }}>One per line, e.g. "2 tbsp olive oil"</p>
      <textarea
        style={{ minHeight: 160 }}
        value={ingredients}
        onChange={(e) => setIngredients(e.target.value)}
      />

      <h2>Steps</h2>
      {steps.map((s, i) => (
        <div key={i} className="card">
          <strong>Step {i + 1}</strong>
          <textarea
            style={{ marginTop: 6 }}
            value={s.text}
            onChange={(e) => updateStep(i, { text: e.target.value })}
          />
          <input
            type="text"
            style={{ marginTop: 6 }}
            placeholder="💡 Tip (optional)"
            value={s.tip ?? ''}
            onChange={(e) => updateStep(i, { tip: e.target.value })}
          />
          <div className="row" style={{ marginTop: 6 }}>
            <input
              type="number"
              style={{ maxWidth: 130 }}
              placeholder="Timer min"
              value={s.minutes ?? ''}
              onChange={(e) =>
                updateStep(i, { minutes: e.target.value ? Number(e.target.value) : undefined })
              }
            />
            <button
              className="ghost"
              onClick={() => setSteps((prev) => prev.filter((_, j) => j !== i))}
            >
              Remove step
            </button>
          </div>
        </div>
      ))}
      <button className="secondary" onClick={() => setSteps((prev) => [...prev, { text: '' }])}>
        + Add step
      </button>

      <div className="row" style={{ marginTop: 20 }}>
        <button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button className="secondary" onClick={() => navigate(`/recipe/${id}`)}>
          Cancel
        </button>
      </div>
    </div>
  )
}
