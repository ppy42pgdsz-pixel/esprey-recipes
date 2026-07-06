import {
  Env,
  json,
  errorResponse,
  askClaude,
  extractJson,
  MODELS,
  cleanPantryName,
} from '../../lib/shared'

/** Photo of a gadget cupboard / worktop → proposed equipment list.
    User confirms before anything is saved; photo is read and discarded. */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { data, media_type } = (await request.json()) as { data?: string; media_type?: string }
  if (!data || !media_type) return errorResponse('No photo received')

  const reply = await askClaude(env, {
    model: MODELS.extractor,
    system: `You identify kitchen equipment in photos of kitchens, cupboards, drawers and worktops.
Respond with ONLY this JSON:
{"items": [{"name": string}]}
Rules:
- "name": a simple, generic, lowercase name (e.g. "stand mixer", "air fryer", "cast iron skillet", "food processor").
- One entry per distinct item, no duplicates, no brand names.
- Skip everyday basics not worth tracking (cutlery, plates, ordinary saucepans) — focus on appliances and notable tools that affect what recipes are possible.
- Only include items you can clearly identify.
- Ignore food and non-kitchen objects.`,
    content: [
      { type: 'image', source: { type: 'base64', media_type, data } },
      { type: 'text', text: 'List the kitchen equipment visible in this photo.' },
    ],
  })

  const parsed = extractJson<{ items?: Array<{ name?: string }> }>(reply)
  const seen = new Set<string>()
  const items = (parsed.items ?? [])
    .map((i) => ({ name: cleanPantryName(String(i.name ?? '')) }))
    .filter((i) => {
      if (!i.name || seen.has(i.name)) return false
      seen.add(i.name)
      return true
    })
    .slice(0, 40)

  if (items.length === 0) {
    return errorResponse(
      'Could not recognise any equipment in that photo — try a closer, brighter shot.',
      422
    )
  }
  return json({ items })
}
