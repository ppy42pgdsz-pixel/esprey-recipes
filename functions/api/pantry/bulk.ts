import { Env, json, errorResponse, PANTRY_CATEGORIES, cleanPantryName } from '../../lib/shared'

/** Save the user-confirmed items from a photo scan. Merges into the pantry:
    new items are added, existing ones get their last-seen date refreshed. */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json()) as { items?: Array<{ name?: string; category?: string }> }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return errorResponse('No items to save')
  }

  const seen = new Set<string>()
  const statements = []
  for (const item of body.items.slice(0, 100)) {
    const name = cleanPantryName(String(item.name ?? ''))
    if (!name || seen.has(name)) continue
    seen.add(name)
    const category = PANTRY_CATEGORIES.includes(String(item.category)) ? String(item.category) : 'other'
    statements.push(
      env.DB.prepare(
        `INSERT INTO pantry_items (name, category, source) VALUES (?, ?, 'photo')
         ON CONFLICT(name) DO UPDATE SET last_seen_at = datetime('now'), category = excluded.category`
      ).bind(name, category)
    )
  }
  if (statements.length > 0) await env.DB.batch(statements)
  return json({ saved: statements.length })
}
