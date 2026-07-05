import { Env, json, errorResponse } from '../../lib/shared'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const status = new URL(request.url).searchParams.get('status') ?? 'running'
  const { results } = await env.DB.prepare(
    'SELECT * FROM timers WHERE status = ? ORDER BY ends_at ASC'
  )
    .bind(status)
    .all()
  return json(results)
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json()) as {
    label?: string
    minutes?: number
    recipe_id?: number
  }
  const minutes = Number(body.minutes)
  if (!minutes || minutes <= 0 || minutes > 24 * 60) {
    return errorResponse('minutes must be between 1 and 1440')
  }
  const label = (body.label ?? '').trim().slice(0, 120) || `${minutes} min timer`
  const endsAt = Math.floor(Date.now() / 1000) + Math.round(minutes * 60)

  const result = await env.DB.prepare(
    'INSERT INTO timers (label, ends_at, recipe_id) VALUES (?, ?, ?)'
  )
    .bind(label, endsAt, body.recipe_id ?? null)
    .run()

  const row = await env.DB.prepare('SELECT * FROM timers WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first()
  return json(row, 201)
}
