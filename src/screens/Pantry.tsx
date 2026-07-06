import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { fileToResizedBase64 } from '../lib/image'
import type { PantryItem } from '../lib/types'

interface ProposedItem {
  name: string
  category: string
  selected: boolean
}

export default function Pantry() {
  const [items, setItems] = useState<PantryItem[] | null>(null)
  const [proposed, setProposed] = useState<ProposedItem[] | null>(null)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [newItem, setNewItem] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  async function refresh() {
    setItems(await api<PantryItem[]>('/api/pantry'))
  }

  useEffect(() => {
    refresh().catch(() => setItems([]))
  }, [])

  async function scanPhoto(file: File) {
    setScanning(true)
    setError('')
    setNotice('')
    try {
      const image = await fileToResizedBase64(file)
      const res = await api<{ items: Array<{ name: string; category: string }> }>(
        '/api/pantry/photo',
        { method: 'POST', body: JSON.stringify(image) }
      )
      setProposed(res.items.map((i) => ({ ...i, selected: true })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setScanning(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function saveProposed() {
    if (!proposed) return
    const chosen = proposed.filter((p) => p.selected)
    setSaving(true)
    try {
      const res = await api<{ saved: number }>('/api/pantry/bulk', {
        method: 'POST',
        body: JSON.stringify({ items: chosen }),
      })
      setProposed(null)
      setNotice(`${res.saved} items saved to your pantry.`)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function addManual() {
    const name = newItem.trim()
    if (!name) return
    setNewItem('')
    await api('/api/pantry', { method: 'POST', body: JSON.stringify({ name }) })
    await refresh()
  }

  async function remove(item: PantryItem) {
    setItems((prev) => (prev ? prev.filter((i) => i.id !== item.id) : prev))
    await api(`/api/pantry/${item.id}`, { method: 'DELETE' }).catch(() => {})
  }

  /* --- confirmation view after a scan: Claude proposes, you decide --- */
  if (proposed) {
    return (
      <div>
        <h1>What Claude spotted</h1>
        <p className="notice">Untick anything it got wrong, then save.</p>
        {error && <p className="error">{error}</p>}
        <div className="card">
          {proposed.map((p, i) => (
            <label key={i} className="proposed-item">
              <input
                type="checkbox"
                checked={p.selected}
                onChange={() =>
                  setProposed((prev) =>
                    prev
                      ? prev.map((x, j) => (j === i ? { ...x, selected: !x.selected } : x))
                      : prev
                  )
                }
              />
              <span>
                {p.name}
                <span className="cat-tag">{p.category}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="row">
          <button onClick={saveProposed} disabled={saving || proposed.every((p) => !p.selected)}>
            {saving ? 'Saving…' : `Save ${proposed.filter((p) => p.selected).length} items`}
          </button>
          <button className="secondary" onClick={() => setProposed(null)}>
            Discard
          </button>
        </div>
      </div>
    )
  }

  const grouped = new Map<string, PantryItem[]>()
  for (const item of items ?? []) {
    const list = grouped.get(item.category) ?? []
    list.push(item)
    grouped.set(item.category, list)
  }

  return (
    <div>
      <h1>Pantry</h1>
      <p>
        Photograph the fridge, a cupboard or the spice drawer — Claude works out what's there.
        Tap ✕ when something's used up.
      </p>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) scanPhoto(file)
        }}
      />
      <button onClick={() => fileInput.current?.click()} disabled={scanning}>
        {scanning ? 'Claude is looking…' : '📷 Scan a shelf'}
      </button>

      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      <div className="row" style={{ margin: '14px 0' }}>
        <input
          type="text"
          placeholder="Add an item by hand…"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addManual()}
        />
        <button className="small" onClick={addManual}>
          Add
        </button>
      </div>

      {items === null && <p className="loading">Loading…</p>}
      {items !== null && items.length === 0 && (
        <p className="empty">Nothing in the pantry yet — take your first photo of the fridge.</p>
      )}

      {[...grouped.entries()].map(([category, list]) => (
        <div key={category}>
          <h2>{category}</h2>
          <div className="pantry-grid">
            {list.map((item) => (
              <span key={item.id} className="pantry-chip">
                {item.name}
                <button className="chip-x" onClick={() => remove(item)} aria-label="Used up">
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
