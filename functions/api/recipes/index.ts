import { Env, json, errorResponse, rowToRecipe } from '../../lib/shared'

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    'SELECT * FROM recipes ORDER BY created_at DESC, id DESC'
  ).all()
  return json(results.map((r) => rowToRecipe(r as Record<string, unknown>)))
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json()) as Record<string, unknown>
  if (!body.title || typeof body.title !== 'string') return errorResponse('title is required')

  const result = await env.DB.prepare(
    `INSERT INTO recipes (title, description, servings, prep_minutes, cook_minutes, ingredients, steps, source_type, source_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      body.title,
      body.description ?? null,
      body.servings ?? null,
      body.prep_minutes ?? null,
      body.cook_minutes ?? null,
      JSON.stringify(body.ingredients ?? []),
      JSON.stringify(body.steps ?? []),
      body.source_type ?? 'invented',
      body.source_url ?? null
    )
    .run()

  const row = await env.DB.prepare('SELECT * FROM recipes WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first()
  return json(rowToRecipe(row as Record<string, unknown>), 201)
}
