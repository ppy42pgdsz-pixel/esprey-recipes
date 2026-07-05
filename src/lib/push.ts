import { api } from './api'

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(b64)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** Subscribe (or re-confirm the subscription) and register it with the server. */
export async function ensurePushSubscription(): Promise<void> {
  if (!pushSupported() || Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    const { key } = await api<{ key: string }>('/api/push/key')
    if (!key) return
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    })
  }
  await api('/api/push/subscribe', { method: 'POST', body: JSON.stringify(sub.toJSON()) })
}

export async function requestPushPermission(): Promise<boolean> {
  if (!pushSupported()) return false
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return false
  await ensurePushSubscription()
  return true
}
