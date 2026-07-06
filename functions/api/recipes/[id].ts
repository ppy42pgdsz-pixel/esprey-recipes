import { Env, json, errorResponse, rowToRecipe } from '../../lib/shared'

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const row = await env.DB.prepare('SELECT * FROM recipes WHERE id = ?').bind(params.id).first()
  if (!row) return errorResponse('Recipe not found', 404)
  return json(rowToRecipe(row as Record<string, unknown>))
}

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const body = (await request.json()) as Record<string, unknown>

  const sets: string[] = []
  const values: unknown[] = []
  if ('is_favourite' in body) {
    sets.push('is_favourite = ?')
    values.push(body.is_favourite ? 1 : 0)
  }
  if (typeof body.title === 'string' && body.title.trim()) {
    sets.push('title = ?')
    values.push(body.title.trim().slice(0, 200))
  }
  if ('description' in body) {
    sets.push('description = ?')
    values.push(body.description ? String(body.description).slice(0, 600) : null)
  }
  if ('servings' in body) {
    sets.push('servings = ?')
    values.push(body.servings ? String(body.servings).slice(0, 40) : null)
  }
  if ('prep_minutes' in body) {
    sets.push('prep_minutes = ?')
    values.push(typeof body.prep_minutes === 'number' ? Math.round(body.prep_minutes) : null)
  }
  if ('cook_minutes' in body) {
    sets.push('cook_minutes = ?')
    values.push(typeof body.cook_minutes === 'number' ? Math.round(body.cook_minutes) : null)
  }
  if (Array.isArray(body.ingredients)) {
    sets.push('ingredients = ?')
    values.push(JSON.stringify(body.ingredients))
  }
  if (Array.isArray(body.steps)) {
    sets.push('steps = ?')
    values.push(JSON.stringify(body.steps))
  }

  if (sets.length > 0) {
    await env.DB.prepare(`UPDATE recipes SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...values, params.id)
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
