import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { fileToResizedBase64 } from '../lib/image'
import type { EquipmentItem, PantryItem } from '../lib/types'

type ScanMode = 'food' | 'equipment'

interface ProposedItem {
  name: string
  category?: string
  selected: boolean
}

export default function Pantry() {
  const [items, setItems] = useState<PantryItem[] | null>(null)
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [proposed, setProposed] = useState<{ mode: ScanMode; items: ProposedItem[] } | null>(null)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [newItem, setNewItem] = useState('')
  const [newEquipment, setNewEquipment] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const scanMode = useRef<ScanMode>('food')

  async function refresh() {
    const [pantryItems, equipmentItems] = await Promise.all([
      api<PantryItem[]>('/api/pantry'),
      api<EquipmentItem[]>('/api/equipment'),
    ])
    setItems(pantryItems)
    setEquipment(equipmentItems)
  }

  useEffect(() => {
    refresh().catch(() => setItems([]))
  }, [])

  function openCamera(mode: ScanMode) {
    scanMode.current = mode
    fileInput.current?.click()
  }

  async function scanPhoto(file: File) {
    const mode = scanMode.current
    setScanning(true)
    setError('')
    setNotice('')
    try {
      const image = await fileToResizedBase64(file)
      const endpoint = mode === 'food' ? '/api/pantry/photo' : '/api/equipment/photo'
      const res = await api<{ items: Array<{ name: string; category?: string }> }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(image),
      })
      setProposed({ mode, items: res.items.map((i) => ({ ...i, selected: true })) })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setScanning(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function saveProposed() {
    if (!proposed) return
    const chosen = proposed.items.filter((p) => p.selected)
    setSaving(true)
    try {
      const endpoint = proposed.mode === 'food' ? '/api/pantry/bulk' : '/api/equipment/bulk'
      const res = await api<{ saved: number }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ items: chosen }),
      })
      setProposed(null)
      setNotice(
        `${res.saved} ${proposed.mode === 'food' ? 'items saved to your pantry' : 'pieces of equipment saved'}.`
      )
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function addManual(mode: ScanMode) {
    const value = (mode === 'food' ? newItem : newEquipment).trim()
    if (!value) return
    if (mode === 'food') setNewItem('')
    else setNewEquipment('')
    await api(mode === 'food' ? '/api/pantry' : '/api/equipment', {
      method: 'POST',
      body: JSON.stringify({ name: value }),
    })
    await refresh()
  }

  async function removePantry(item: PantryItem) {
    setItems((prev) => (prev ? prev.filter((i) => i.id !== item.id) : prev))
    await api(`/api/pantry/${item.id}`, { method: 'DELETE' }).catch(() => {})
  }

  async function removeEquipment(item: EquipmentItem) {
    setEquipment((prev) => prev.filter((i) => i.id !== item.id))
    await api(`/api/equipment/${item.id}`, { method: 'DELETE' }).catch(() => {})
  }

  /* --- confirmation view after a scan: Claude proposes, you decide --- */
  if (proposed) {
    return (
      <div>
        <h1>What Claude spotted</h1>
        <p className="notice">Untick anything it got wrong, then save.</p>
        {error && <p className="error">{error}</p>}
        <div className="card">
          {proposed.items.map((p, i) => (
            <label key={i} className="proposed-item">
              <input
                type="checkbox"
                checked={p.selected}
                onChange={() =>
                  setProposed((prev) =>
                    prev
                      ? {
                          ...prev,
                          items: prev.items.map((x, j) =>
                            j === i ? { ...x, selected: !x.selected } : x
                          ),
                        }
                      : prev
                  )
                }
              />
              <span>
                {p.name}
                {p.category && <span className="cat-tag">{p.category}</span>}
              </span>
            </label>
          ))}
        </div>
        <div className="row">
          <button
            onClick={saveProposed}
            disabled={saving || proposed.items.every((p) => !p.selected)}
          >
            {saving ? 'Saving…' : `Save ${proposed.items.filter((p) => p.selected).length} items`}
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
      <button onClick={() => openCamera('food')} disabled={scanning}>
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
          onKeyDown={(e) => e.key === 'Enter' && addManual('food')}
        />
        <button className="small" onClick={() => addManual('food')}>
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
                <button className="chip-x" onClick={() => removePantry(item)} aria-label="Used up">
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      ))}

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '26px 0 16px' }} />

      <h2>🔌 Equipment</h2>
      <p>
        Gadgets and notable tools — Cook suggestions and ✨ Invent will stick to what you actually
        own.
      </p>
      <button className="secondary" onClick={() => openCamera('equipment')} disabled={scanning}>
        📷 Scan a gadget cupboard
      </button>

      <div className="row" style={{ margin: '14px 0' }}>
        <input
          type="text"
          placeholder="Add equipment by hand… (e.g. air fryer)"
          value={newEquipment}
          onChange={(e) => setNewEquipment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addManual('equipment')}
        />
        <button className="small" onClick={() => addManual('equipment')}>
          Add
        </button>
      </div>

      <div className="pantry-grid">
        {equipment.map((item) => (
          <span key={item.id} className="pantry-chip">
            {item.name}
            <button className="chip-x" onClick={() => removeEquipment(item)} aria-label="Remove">
              ✕
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
