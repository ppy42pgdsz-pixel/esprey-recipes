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

/** Look for schema.org Recipe JSON-LD — most recipe sites embed it. */
function extractJsonLdRecipe(html: string): string | null {
  const scripts = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )
  const findRecipe = (node: unknown): unknown => {
    if (!node || typeof node !== 'object') return null
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = findRecipe(item)
        if (found) return found
      }
      return null
    }
    const obj = node as Record<string, unknown>
    const type = obj['@type']
    if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) return obj
    if (obj['@graph']) return findRecipe(obj['@graph'])
    return null
  }
  for (const match of scripts) {
    try {
      const found = findRecipe(JSON.parse(match[1]))
      if (found) return JSON.stringify(found).slice(0, 18000)
    } catch {
      /* malformed JSON-LD — try the next block */
    }
  }
  return null
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { url } = (await request.json()) as { url?: string }
  if (!url || !/^https?:\/\//i.test(url)) {
    return errorResponse('Please paste a full link starting with http')
  }

  let html: string
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        Accept: 'text/html,application/xhtml+xml',
      },
    })
    if (!res.ok) throw new Error(`status ${res.status}`)
    html = await res.text()
  } catch {
    return errorResponse(
      'That site would not let us fetch the page. Try the Photo option with a screenshot of the recipe instead.',
      502
    )
  }

  const sourceText = extractJsonLdRecipe(html) ?? stripHtml(html).slice(0, 18000)

  const reply = await askClaude(env, {
    model: MODELS.extractor,
    system: 'You extract recipes from web page content.\n' + RECIPE_SPEC,
    content: sourceText,
  })

  const draft = normalizeRecipe(extractJson(reply), 'url', url)
  if (draft.steps.length === 0) {
    return errorResponse('Could not find a recipe on that page.', 422)
  }
  return json(draft)
}
