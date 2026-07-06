import { Env, json } from '../../lib/shared'

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  await env.DB.prepare('DELETE FROM equipment_items WHERE id = ?').bind(params.id).run()
  return json({ ok: true })
}
