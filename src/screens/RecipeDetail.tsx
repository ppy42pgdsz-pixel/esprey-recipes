import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useTimers } from '../lib/timers'
import type { Recipe } from '../lib/types'

export default function RecipeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { start } = useTimers()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [ticked, setTicked] = useState<Set<number>>(new Set())

  useEffect(() => {
    api<Recipe>(`/api/recipes/${id}`)
      .then(setRecipe)
      .catch((e) => setError(e.message))
  }, [id])

  if (error) return <p className="error">{error}</p>
  if (!recipe) return <p className="loading">Loading…</p>

  async function toggleFave() {
    if (!recipe) return
    const next = recipe.is_favourite ? 0 : 1
    setRecipe({ ...recipe, is_favourite: next as 0 | 1 })
    await api(`/api/recipes/${recipe.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_favourite: next }),
    }).catch(() => {})
  }

  async function addToShopping() {
    if (!recipe) return
    const res = await api<{ added: number; skipped: number }>('/api/shopping/from-recipe', {
      method: 'POST',
      body: JSON.stringify({ recipe_id: recipe.id }),
    })
    setNotice(
      res.skipped > 0
        ? `${res.added} ingredients added — skipped ${res.skipped} already in your pantry.`
        : `${res.added} ingredients added to the shopping list.`
    )
  }

  async function remove() {
    if (!recipe) return
    if (!window.confirm(`Delete “${recipe.title}”?`)) return
    await api(`/api/recipes/${recipe.id}`, { method: 'DELETE' })
    navigate('/')
  }

  function tickIngredient(index: number) {
    setTicked((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ flex: 1 }}>{recipe.title}</h1>
        <button className="star" onClick={toggleFave} aria-label="Favourite">
          {recipe.is_favourite ? '★' : '☆'}
        </button>
      </div>

      {recipe.description && <p>{recipe.description}</p>}

      <div className="meta-chips">
        {recipe.servings && <span className="chip">Serves {recipe.servings}</span>}
        {recipe.prep_minutes != null && <span className="chip">Prep {recipe.prep_minutes} min</span>}
        {recipe.cook_minutes != null && <span className="chip">Cook {recipe.cook_minutes} min</span>}
        {recipe.source_url && (
          <a className="chip" href={recipe.source_url} target="_blank" rel="noreferrer">
            Source ↗
          </a>
        )}
      </div>

      {notice && <p className="notice">{notice}</p>}

      <h2>Ingredients</h2>
      <ul className="ingredients" style={{ listStyle: 'none', padding: 0 }}>
        {recipe.ingredients.map((ing, i) => (
          <li key={i}>
            <label className={ticked.has(i) ? 'done' : ''}>
              <input type="checkbox" checked={ticked.has(i)} onChange={() => tickIngredient(i)} />
              <span>
                {ing.quantity ? `${ing.quantity} ` : ''}
                {ing.item}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <button className="secondary" onClick={addToShopping}>
        🛒 Add ingredients to shopping list
      </button>

      <h2>Steps</h2>
      <ol className="steps">
        {recipe.steps.map((step, i) => (
          <li key={i}>
            {step.text}
            {step.minutes != null && step.minutes > 0 && (
              <button
                className="small secondary step-timer"
                onClick={() => start(`${step.minutes} min — ${recipe.title}`, step.minutes!)}
              >
                ⏱ Start {step.minutes} min timer
              </button>
            )}
            {step.tip && (
              <details>
                <summary>💡 Tip</summary>
                <p>{step.tip}</p>
              </details>
            )}
          </li>
        ))}
      </ol>

      <button className="ghost" onClick={remove}>
        Delete this recipe
      </button>
    </div>
  )
}
