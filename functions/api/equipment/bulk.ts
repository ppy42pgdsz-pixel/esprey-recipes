import { Env, json, errorResponse, cleanPantryName } from '../../lib/shared'

/** Save the user-confirmed equipment from a photo scan. */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json()) as { items?: Array<{ name?: string }> }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return errorResponse('No items to save')
  }
  const seen = new Set<string>()
  const statements = []
  for (const item of body.items.slice(0, 60)) {
    const name = cleanPantryName(String(item.name ?? ''))
    if (!name || seen.has(name)) continue
    seen.add(name)
    statements.push(
      env.DB.prepare(
        `INSERT INTO equipment_items (name, source) VALUES (?, 'photo')
         ON CONFLICT(name) DO NOTHING`
      ).bind(name)
    )
  }
  if (statements.length > 0) await env.DB.batch(statements)
  return json({ saved: statements.length })
}
