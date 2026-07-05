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
  const { data, media_type } = (await request.json()) as { data?: string; media_type?: string }
  if (!data || !media_type) return errorResponse('No photo received')

  const reply = await askClaude(env, {
    model: MODELS.extractor,
    system:
      'You extract recipes from photos of cookbook pages, recipe cards and screenshots.\n' +
      RECIPE_SPEC,
    content: [
      { type: 'image', source: { type: 'base64', media_type, data } },
      { type: 'text', text: 'Extract the recipe shown in this photo.' },
    ],
  })

  const draft = normalizeRecipe(extractJson(reply), 'photo')
  if (draft.steps.length === 0) {
    return errorResponse('Could not read a recipe from that photo — try a clearer shot.', 422)
  }
  return json(draft)
}
