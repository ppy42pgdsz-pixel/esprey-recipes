import { Env, json, errorResponse } from '../../lib/shared'

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    'SELECT * FROM shopping_items ORDER BY checked ASC, id ASC'
  ).all()
  return json(results)
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { text } = (await request.json()) as { text?: string }
  if (!text || !text.trim()) return errorResponse('text is required')
  await env.DB.prepare('INSERT INTO shopping_items (text) VALUES (?)')
    .bind(text.trim().slice(0, 300))
    .run()
  return json({ ok: true }, 201)
}

/** Clear all ticked items. */
export const onRequestDelete: PagesFunction<Env> = async ({ env }) => {
  await env.DB.prepare('DELETE FROM shopping_items WHERE checked = 1').run()
  return json({ ok: true })
}
