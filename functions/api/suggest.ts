import { Env, json, errorResponse, askClaude, extractJson, MODELS } from '../lib/shared'

interface RawSuggestion {
  recipe_id?: number
  reason?: string
  missing?: unknown[]
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { on_hand } = (await request.json()) as { on_hand?: string }
  if (!on_hand || !on_hand.trim()) return errorResponse('Tell us what you have on hand first')

  const { results } = await env.DB.prepare('SELECT id, title, ingredients FROM recipes').all()
  if (results.length === 0) return json({ suggestions: [] })

  const catalogue = results.map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: row.id as number,
      title: row.title as string,
      ingredients: (JSON.parse((row.ingredients as string) || '[]') as Array<{ item: string }>).map(
        (i) => i.item
      ),
    }
  })

  const reply = await askClaude(env, {
    model: MODELS.planner,
    system: `You help a family decide what to cook tonight. Given their recipe collection and what they say they have on hand, pick up to 5 recipes, ranked best-first. Assume staples like salt, pepper, oil, butter, flour, sugar and water are always available. Only suggest recipes that are realistic with what they have — an empty list is a fine answer.
Respond with ONLY this JSON:
{"suggestions": [{"recipe_id": number, "reason": string (one friendly sentence on why it fits), "missing": [string] (significant ingredients they would need to buy, empty if none)}]}`,
    content: JSON.stringify({ recipes: catalogue, on_hand: on_hand.slice(0, 3000) }),
  })

  const parsed = extractJson<{ suggestions?: RawSuggestion[] }>(reply)
  const byId = new Map(catalogue.map((c) => [c.id, c]))
  const suggestions = (parsed.suggestions ?? [])
    .filter((s) => s.recipe_id != null && byId.has(s.recipe_id))
    .slice(0, 5)
    .map((s) => ({
      recipe_id: s.recipe_id as number,
      title: byId.get(s.recipe_id as number)!.title,
      reason: String(s.reason ?? '').slice(0, 300),
      missing: Array.isArray(s.missing) ? s.missing.map(String).slice(0, 12) : [],
    }))

  return json({ suggestions })
}
