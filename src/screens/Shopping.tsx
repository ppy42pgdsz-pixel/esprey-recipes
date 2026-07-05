import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { ShoppingItem } from '../lib/types'

export default function Shopping() {
  const [items, setItems] = useState<ShoppingItem[] | null>(null)
  const [newItem, setNewItem] = useState('')

  async function refresh() {
    setItems(await api<ShoppingItem[]>('/api/shopping'))
  }

  useEffect(() => {
    refresh().catch(() => setItems([]))
  }, [])

  async function toggle(item: ShoppingItem) {
    const next = item.checked ? 0 : 1
    setItems((prev) =>
      prev ? prev.map((i) => (i.id === item.id ? { ...i, checked: next as 0 | 1 } : i)) : prev
    )
    await api(`/api/shopping/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ checked: next }),
    }).catch(() => {})
  }

  async function add() {
    const text = newItem.trim()
    if (!text) return
    setNewItem('')
    await api('/api/shopping', { method: 'POST', body: JSON.stringify({ text }) })
    await refresh()
  }

  async function clearChecked() {
    await api('/api/shopping', { method: 'DELETE' })
    await refresh()
  }

  const anyChecked = (items ?? []).some((i) => i.checked === 1)

  return (
    <div>
      <h1>Shopping list</h1>

      <div className="row" style={{ marginBottom: 14 }}>
        <input
          type="text"
          placeholder="Add an item…"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="small" onClick={add}>
          Add
        </button>
      </div>

      {items === null && <p className="loading">Loading…</p>}
      {items !== null && items.length === 0 && (
        <p className="empty">
          Nothing on the list. Open a recipe and tap “Add ingredients to shopping list”, or add
          items above.
        </p>
      )}

      {items?.map((item) => (
        <div key={item.id} className={`shopping-item${item.checked ? ' checked' : ''}`}>
          <input type="checkbox" checked={item.checked === 1} onChange={() => toggle(item)} />
          <span className="label">
            {item.text}
            {item.recipe_title && <span className="from">for {item.recipe_title}</span>}
          </span>
        </div>
      ))}

      {anyChecked && (
        <div style={{ marginTop: 16 }}>
          <button className="secondary" onClick={clearChecked}>
            Clear ticked items
          </button>
        </div>
      )}
    </div>
  )
}
