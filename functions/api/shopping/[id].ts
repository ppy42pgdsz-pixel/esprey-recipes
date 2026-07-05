import { Env, json } from '../../lib/shared'

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const { checked } = (await request.json()) as { checked?: number }
  await env.DB.prepare('UPDATE shopping_items SET checked = ? WHERE id = ?')
    .bind(checked ? 1 : 0, params.id)
    .run()
  return json({ ok: true })
}

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  await env.DB.prepare('DELETE FROM shopping_items WHERE id = ?').bind(params.id).run()
  return json({ ok: true })
}
