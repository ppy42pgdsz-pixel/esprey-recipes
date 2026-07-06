import { Env, json, errorResponse, cleanPantryName } from '../../lib/shared'

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare('SELECT * FROM equipment_items ORDER BY name ASC').all()
  return json(results)
}

/** Manual single add. */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json()) as { name?: string }
  const name = cleanPantryName(body.name ?? '')
  if (!name) return errorResponse('name is required')
  await env.DB.prepare(
    `INSERT INTO equipment_items (name, source) VALUES (?, 'manual')
     ON CONFLICT(name) DO NOTHING`
  )
    .bind(name)
    .run()
  return json({ ok: true }, 201)
}
