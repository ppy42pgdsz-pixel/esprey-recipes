import { Env, json } from '../../lib/shared'

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  return json({ key: env.VAPID_PUBLIC_KEY ?? '' })
}
