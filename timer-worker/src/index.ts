/**
 * Runs every minute (cron): finds timers that have finished, pushes a
 * notification to every subscribed device, marks the timer as fired,
 * and tidies up old rows.
 */
import { sendPush, type PushEnv } from './webpush'

interface Env extends PushEnv {
  DB: D1Database
}

interface TimerRow {
  id: number
  label: string
  ends_at: number
}

interface SubscriptionRow {
  id: number
  endpoint: string
  p256dh: string
  auth: string
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext) {
    const now = Math.floor(Date.now() / 1000)

    const due = (
      await env.DB.prepare("SELECT * FROM timers WHERE status = 'running' AND ends_at <= ?")
        .bind(now)
        .all()
    ).results as unknown as TimerRow[]

    if (due.length > 0) {
      const subs = (await env.DB.prepare('SELECT * FROM push_subscriptions').all())
        .results as unknown as SubscriptionRow[]

      for (const timer of due) {
        // Mark fired first so a crash can't cause repeat notifications.
        await env.DB.prepare("UPDATE timers SET status = 'fired' WHERE id = ?")
          .bind(timer.id)
          .run()

        const payload = JSON.stringify({
          title: `⏰ ${timer.label}`,
          body: 'Your kitchen timer has finished.',
          tag: `timer-${timer.id}`,
        })

        for (const sub of subs) {
          try {
            const status = await sendPush(sub.endpoint, sub.p256dh, sub.auth, payload, env)
            if (status === 404 || status === 410) {
              // Device unsubscribed — clean it up.
              await env.DB.prepare('DELETE FROM push_subscriptions WHERE id = ?')
                .bind(sub.id)
                .run()
            }
          } catch (err) {
            console.log('push failed:', err instanceof Error ? err.message : String(err))
          }
        }
      }
    }

    // Housekeeping: drop finished/cancelled timers after a day.
    await env.DB.prepare(
      "DELETE FROM timers WHERE status != 'running' AND created_at < datetime('now', '-1 day')"
    ).run()
  },

  async fetch(): Promise<Response> {
    return new Response('esprey-recipes-timers: ok')
  },
} satisfies ExportedHandler<Env>
