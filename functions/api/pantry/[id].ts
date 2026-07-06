import { Env, json } from '../../lib/shared'

/** "Used it up" — remove an item from the pantry. */
export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  await env.DB.prepare('DELETE FROM pantry_items WHERE id = ?').bind(params.id).run()
  return json({ ok: true })
}
