import {
  Env,
  json,
  errorResponse,
  askClaude,
  extractJson,
  normalizeRecipe,
  MODELS,
  RECIPE_SPEC,
} from '../lib/shared'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { prompt } = (await request.json()) as { prompt?: string }
  if (!prompt || !prompt.trim()) return errorResponse('Tell Claude what you fancy first')

  const equipment = (
    (await env.DB.prepare('SELECT name FROM equipment_items').all()).results as Array<{
      name: string
    }>
  ).map((r) => r.name)
  const equipmentNote =
    equipment.length > 0
      ? `\nThe family's kitchen has these notable extras beyond the basics: ${equipment.join(', ')}. Feel free to use them where helpful, but do not require equipment outside this list and the basics (oven, hob, saucepans, knives).`
      : ''

  const reply = await askClaude(env, {
    model: MODELS.planner,
    system:
      'You are a skilled, practical home-cooking chef. Invent ONE excellent, reliable recipe matching the request. Prefer accessible supermarket ingredients and sensible techniques a family can follow.' +
      equipmentNote +
      '\n' +
      RECIPE_SPEC,
    content: prompt.slice(0, 2000),
  })

  const draft = normalizeRecipe(extractJson(reply), 'invented')
  if (draft.steps.length === 0) return errorResponse('Recipe generation failed — try again.', 502)
  return json(draft)
}
