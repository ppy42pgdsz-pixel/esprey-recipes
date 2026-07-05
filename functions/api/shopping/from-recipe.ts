import { Env, json, errorResponse, rowToRecipe, type Ingredient } from '../../lib/shared'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { recipe_id } = (await request.json()) as { recipe_id?: number }
  if (!recipe_id) return errorResponse('recipe_id is required')

  const row = await env.DB.prepare('SELECT * FROM recipes WHERE id = ?').bind(recipe_id).first()
  if (!row) return errorResponse('Recipe not found', 404)
  const recipe = rowToRecipe(row as Record<string, unknown>) as unknown as {
    title: string
    ingredients: Ingredient[]
  }

  const statements = recipe.ingredients.map((ing) =>
    env.DB.prepare(
      'INSERT INTO shopping_items (text, recipe_id, recipe_title) VALUES (?, ?, ?)'
    ).bind(`${ing.quantity ? ing.quantity + ' ' : ''}${ing.item}`.slice(0, 300), recipe_id, recipe.title)
  )
  if (statements.length > 0) await env.DB.batch(statements)

  return json({ added: statements.length })
}
