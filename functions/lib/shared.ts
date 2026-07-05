/** Shared helpers for all Pages Functions. No onRequest export = not a route. */

export interface Env {
  DB: D1Database
  ANTHROPIC_API_KEY: string
  VAPID_PUBLIC_KEY: string
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export function errorResponse(message: string, status = 400): Response {
  return json({ error: message }, status)
}

/* ---------- Claude ---------- */

export const MODELS = {
  planner: 'claude-sonnet-4-6', // inventing recipes, suggesting what to cook
  extractor: 'claude-haiku-4-5-20251001', // pulling recipes out of pages and photos
}

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

export async function askClaude(
  env: Env,
  opts: { model?: string; system: string; content: string | ContentBlock[]; maxTokens?: number }
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model ?? MODELS.extractor,
      max_tokens: opts.maxTokens ?? 4000,
      system: opts.system,
      messages: [{ role: 'user', content: opts.content }],
    }),
  })
  if (!res.ok) {
    throw new Error(`Claude API error ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
  const data = (await res.json()) as { content: Array<{ type: string; text?: string }> }
  return data.content.map((b) => b.text ?? '').join('')
}

/** Tolerant JSON extraction: strip code fences, isolate the outermost {...}. */
export function extractJson<T>(text: string): T {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new Error('Claude did not return JSON')
  return JSON.parse(text.slice(start, end + 1)) as T
}

/* ---------- recipe shape ---------- */

export interface Ingredient {
  item: string
  quantity?: string
}
export interface Step {
  text: string
  tip?: string
  minutes?: number
}
export interface RecipeDraft {
  title: string
  description?: string
  servings?: string
  prep_minutes?: number
  cook_minutes?: number
  ingredients: Ingredient[]
  steps: Step[]
  source_type: 'url' | 'photo' | 'invented'
  source_url?: string
}

export const RECIPE_SPEC = `Respond with ONLY a JSON object, no other text, in exactly this shape:
{
  "title": string,
  "description": string (one or two sentences),
  "servings": string (e.g. "4"),
  "prep_minutes": number,
  "cook_minutes": number,
  "ingredients": [{"item": string, "quantity": string}],
  "steps": [{"text": string, "tip": string (optional), "minutes": number (optional)}]
}
Rules:
- Keep step text faithful to the source (or clear and beginner-friendly if inventing).
- Add "tip" to a step only where genuinely useful: a common mistake to avoid, how to tell the step is done, or a pro trick. One sentence each. Aim for tips on roughly half the steps.
- Add "minutes" ONLY when the step involves waiting or timed cooking (resting, proving, baking, simmering) so the app can offer a timer. Omit it otherwise.
- Omit optional fields rather than guessing values you do not know.`

function toNumber(v: unknown): number | undefined {
  return typeof v === 'number' && isFinite(v) && v >= 0 ? Math.round(v) : undefined
}

/** Defensive normalisation of whatever Claude returned. AI proposes; code decides. */
export function normalizeRecipe(
  raw: Record<string, unknown>,
  sourceType: RecipeDraft['source_type'],
  sourceUrl?: string
): RecipeDraft {
  const ingredients: Ingredient[] = Array.isArray(raw.ingredients)
    ? raw.ingredients
        .map((i: unknown): Ingredient => {
          if (typeof i === 'string') return { item: i }
          const o = i as Record<string, unknown>
          return {
            item: String(o.item ?? '').slice(0, 200),
            quantity: o.quantity != null ? String(o.quantity).slice(0, 60) : undefined,
          }
        })
        .filter((i) => i.item.length > 0)
    : []

  const steps: Step[] = Array.isArray(raw.steps)
    ? raw.steps
        .map((s: unknown): Step => {
          if (typeof s === 'string') return { text: s }
          const o = s as Record<string, unknown>
          return {
            text: String(o.text ?? '').slice(0, 1500),
            tip: o.tip != null && String(o.tip).trim() ? String(o.tip).slice(0, 400) : undefined,
            minutes: toNumber(o.minutes),
          }
        })
        .filter((s) => s.text.length > 0)
    : []

  return {
    title: String(raw.title ?? 'Untitled recipe').slice(0, 200),
    description: raw.description != null ? String(raw.description).slice(0, 600) : undefined,
    servings: raw.servings != null ? String(raw.servings).slice(0, 40) : undefined,
    prep_minutes: toNumber(raw.prep_minutes),
    cook_minutes: toNumber(raw.cook_minutes),
    ingredients,
    steps,
    source_type: sourceType,
    source_url: sourceUrl,
  }
}

/* ---------- database rows ---------- */

export function rowToRecipe(row: Record<string, unknown>) {
  return {
    ...row,
    ingredients: JSON.parse((row.ingredients as string) || '[]'),
    steps: JSON.parse((row.steps as string) || '[]'),
  }
}
