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

  const reply = await askClaude(env, {
    model: MODELS.planner,
    system:
      'You are a skilled, practical home-cooking chef. Invent ONE excellent, reliable recipe matching the request. Prefer accessible supermarket ingredients and sensible techniques a family can follow.\n' +
      RECIPE_SPEC,
    content: prompt.slice(0, 2000),
  })

  const draft = normalizeRecipe(extractJson(reply), 'invented')
  if (draft.steps.length === 0) return errorResponse('Recipe generation failed — try again.', 502)
  return json(draft)
}
