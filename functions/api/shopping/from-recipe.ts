import { Env, json, errorResponse, rowToRecipe, type Ingredient } from '../../lib/shared'

/** Does this ingredient look like something already in the pantry?
    Simple containment match both ways, e.g. pantry "cheddar cheese"
    matches ingredient "mature cheddar cheese, grated". */
function inPantry(ingredient: string, pantryNames: string[]): boolean {
  const ing = ingredient.toLowerCase()
  return pantryNames.some((p) => ing.includes(p) || (p.includes(ing) && ing.length >= 4))
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { recipe_id } = (await request.json()) as { recipe_id?: number }
  if (!recipe_id) return errorResponse('recipe_id is required')

  const row = await env.DB.prepare('SELECT * FROM recipes WHERE id = ?').bind(recipe_id).first()
  if (!row) return errorResponse('Recipe not found', 404)
  const recipe = rowToRecipe(row as Record<string, unknown>) as unknown as {
    title: string
    ingredients: Ingredient[]
  }

  const pantryNames = (
    (await env.DB.prepare('SELECT name FROM pantry_items').all()).results as Array<{
      name: string
    }>
  ).map((r) => r.name.toLowerCase())

  let skipped = 0
  const statements = []
  for (const ing of recipe.ingredients) {
    if (pantryNames.length > 0 && inPantry(ing.item, pantryNames)) {
      skipped++
      continue
    }
    statements.push(
      env.DB.prepare(
        'INSERT INTO shopping_items (text, recipe_id, recipe_title) VALUES (?, ?, ?)'
      ).bind(
        `${ing.quantity ? ing.quantity + ' ' : ''}${ing.item}`.slice(0, 300),
        recipe_id,
        recipe.title
      )
    )
  }
  if (statements.length > 0) await env.DB.batch(statements)

  return json({ added: statements.length, skipped })
}
