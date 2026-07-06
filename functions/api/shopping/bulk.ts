import { Env, json, errorResponse } from '../../lib/shared'

/** Add several items at once — used by "add what's missing" on Cook suggestions. */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json()) as { items?: string[]; recipe_title?: string }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return errorResponse('No items to add')
  }
  const recipeTitle = body.recipe_title ? String(body.recipe_title).slice(0, 200) : null
  const statements = body.items
    .map((i) => String(i).trim().slice(0, 300))
    .filter((i) => i.length > 0)
    .slice(0, 50)
    .map((text) =>
      env.DB.prepare(
        'INSERT INTO shopping_items (text, recipe_title) VALUES (?, ?)'
      ).bind(text, recipeTitle)
    )
  if (statements.length > 0) await env.DB.batch(statements)
  return json({ added: statements.length }, 201)
}
