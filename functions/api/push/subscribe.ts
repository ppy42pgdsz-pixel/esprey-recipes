import { Env, json, errorResponse } from '../../lib/shared'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const sub = (await request.json()) as {
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
  }
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return errorResponse('Invalid push subscription')
  }
  await env.DB.prepare(
    'INSERT OR REPLACE INTO push_subscriptions (endpoint, p256dh, auth) VALUES (?, ?, ?)'
  )
    .bind(sub.endpoint, sub.keys.p256dh, sub.keys.auth)
    .run()
  return json({ ok: true }, 201)
}
