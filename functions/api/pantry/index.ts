import { Env, json, errorResponse, PANTRY_CATEGORIES, cleanPantryName } from '../../lib/shared'

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    'SELECT * FROM pantry_items ORDER BY category ASC, name ASC'
  ).all()
  return json(results)
}

/** Manual single add. */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json()) as { name?: string; category?: string }
  const name = cleanPantryName(body.name ?? '')
  if (!name) return errorResponse('name is required')
  const category = PANTRY_CATEGORIES.includes(body.category ?? '') ? body.category! : 'other'
  await env.DB.prepare(
    `INSERT INTO pantry_items (name, category, source) VALUES (?, ?, 'manual')
     ON CONFLICT(name) DO UPDATE SET last_seen_at = datetime('now')`
  )
    .bind(name, category)
    .run()
  return json({ ok: true }, 201)
}
