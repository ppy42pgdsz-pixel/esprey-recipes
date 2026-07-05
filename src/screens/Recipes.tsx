import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { Recipe } from '../lib/types'

export default function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null)
  const [search, setSearch] = useState('')
  const [favesOnly, setFavesOnly] = useState(false)

  useEffect(() => {
    api<Recipe[]>('/api/recipes').then(setRecipes).catch(() => setRecipes([]))
  }, [])

  async function toggleFave(recipe: Recipe) {
    const next = recipe.is_favourite ? 0 : 1
    setRecipes((prev) =>
      prev ? prev.map((r) => (r.id === recipe.id ? { ...r, is_favourite: next as 0 | 1 } : r)) : prev
    )
    await api(`/api/recipes/${recipe.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_favourite: next }),
    }).catch(() => {})
  }

  const visible = (recipes ?? []).filter(
    (r) =>
      (!favesOnly || r.is_favourite === 1) &&
      r.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <h1>Recipes</h1>
      <div className="fab-row">
        <Link to="/add" className="btn">
          + Add recipe
        </Link>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Search recipes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className={favesOnly ? 'small' : 'small secondary'}
          onClick={() => setFavesOnly(!favesOnly)}
        >
          ★
        </button>
      </div>

      {recipes === null && <p className="loading">Loading…</p>}
      {recipes !== null && visible.length === 0 && (
        <p className="empty">
          {recipes.length === 0
            ? 'No recipes yet. Tap “Add recipe” to import your first one — paste a link, snap a cookbook page, or ask Claude to invent something.'
            : 'Nothing matches.'}
        </p>
      )}

      {visible.map((r) => (
        <div key={r.id} className="card recipe-card">
          <Link to={`/recipe/${r.id}`} style={{ flex: 1 }}>
            <div className="title">{r.title}</div>
            <div className="meta">
              {[
                r.cook_minutes ? `${(r.prep_minutes ?? 0) + r.cook_minutes} min` : null,
                r.servings ? `serves ${r.servings}` : null,
                r.source_type === 'invented' ? 'invented by Claude' : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
          </Link>
          <button className="star" onClick={() => toggleFave(r)} aria-label="Favourite">
            {r.is_favourite ? '★' : '☆'}
          </button>
        </div>
      ))}
    </div>
  )
}
