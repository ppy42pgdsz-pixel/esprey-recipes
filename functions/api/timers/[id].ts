import { Env, json } from '../../lib/shared'

/** Dismiss/cancel a timer. Also used to clear a finished timer chip. */
export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  await env.DB.prepare(
    "UPDATE timers SET status = 'cancelled' WHERE id = ? AND status = 'running'"
  )
    .bind(params.id)
    .run()
  return json({ ok: true })
}
