import { Env, json, errorResponse, rowToRecipe } from '../../lib/shared'

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const row = await env.DB.prepare('SELECT * FROM recipes WHERE id = ?').bind(params.id).first()
  if (!row) return errorResponse('Recipe not found', 404)
  return json(rowToRecipe(row as Record<string, unknown>))
}

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const body = (await request.json()) as Record<string, unknown>

  if ('is_favourite' in body) {
    await env.DB.prepare('UPDATE recipes SET is_favourite = ? WHERE id = ?')
      .bind(body.is_favourite ? 1 : 0, params.id)
      .run()
  }
  if (typeof body.title === 'string' && body.title.trim()) {
    await env.DB.prepare('UPDATE recipes SET title = ? WHERE id = ?')
      .bind(body.title.trim(), params.id)
      .run()
  }

  const row = await env.DB.prepare('SELECT * FROM recipes WHERE id = ?').bind(params.id).first()
  if (!row) return errorResponse('Recipe not found', 404)
  return json(rowToRecipe(row as Record<string, unknown>))
}

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  await env.DB.prepare('DELETE FROM recipes WHERE id = ?').bind(params.id).run()
  return json({ ok: true })
}
