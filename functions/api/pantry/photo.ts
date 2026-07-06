import {
  Env,
  json,
  errorResponse,
  askClaude,
  extractJson,
  MODELS,
  PANTRY_CATEGORIES,
  cleanPantryName,
} from '../../lib/shared'

/**
 * Photo of fridge / cupboard / spice drawer → proposed list of items.
 * Nothing is saved here: the user confirms first, then /api/pantry/bulk stores it.
 * The photo itself is read and discarded. AI proposes; code decides.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { data, media_type } = (await request.json()) as { data?: string; media_type?: string }
  if (!data || !media_type) return errorResponse('No photo received')

  const reply = await askClaude(env, {
    model: MODELS.extractor,
    system: `You identify food items in photos of fridges, pantries, cupboards, spice drawers and condiment shelves.
Respond with ONLY this JSON:
{"items": [{"name": string, "category": string}]}
Rules:
- "name": a simple, generic, lowercase ingredient name (e.g. "cheddar cheese", "smoked paprika", "tinned tomatoes"). One entry per distinct item, no duplicates, no brand names.
- "category": exactly one of ${JSON.stringify(PANTRY_CATEGORIES)}.
- Only include items you can actually identify — skip anything too blurry, hidden or ambiguous rather than guessing.
- Ignore non-food objects.`,
    content: [
      { type: 'image', source: { type: 'base64', media_type, data } },
      { type: 'text', text: 'List the food items visible in this photo.' },
    ],
  })

  const parsed = extractJson<{ items?: Array<{ name?: string; category?: string }> }>(reply)
  const seen = new Set<string>()
  const items = (parsed.items ?? [])
    .map((i) => ({
      name: cleanPantryName(String(i.name ?? '')),
      category: PANTRY_CATEGORIES.includes(String(i.category)) ? String(i.category) : 'other',
    }))
    .filter((i) => {
      if (!i.name || seen.has(i.name)) return false
      seen.add(i.name)
      return true
    })
    .slice(0, 80)

  if (items.length === 0) {
    return errorResponse('Could not recognise any food in that photo — try a closer, brighter shot.', 422)
  }
  return json({ items })
}
