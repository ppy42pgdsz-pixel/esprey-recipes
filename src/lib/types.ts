export interface Ingredient {
  item: string
  quantity?: string
}

export interface Step {
  text: string
  tip?: string
  minutes?: number
}

export interface RecipeDraft {
  title: string
  description?: string
  servings?: string
  prep_minutes?: number
  cook_minutes?: number
  ingredients: Ingredient[]
  steps: Step[]
  source_type: 'url' | 'photo' | 'invented'
  source_url?: string
}

export interface Recipe extends RecipeDraft {
  id: number
  is_favourite: 0 | 1
  created_at: string
}

export interface Timer {
  id: number
  label: string
  ends_at: number
  status: 'running' | 'fired' | 'cancelled'
  recipe_id?: number | null
}

export interface ShoppingItem {
  id: number
  text: string
  recipe_title?: string | null
  checked: 0 | 1
}

export interface PantryItem {
  id: number
  name: string
  category: string
  source: 'photo' | 'manual'
  last_seen_at: string
}

export interface Suggestion {
  recipe_id: number
  title: string
  reason: string
  missing: string[]
}
