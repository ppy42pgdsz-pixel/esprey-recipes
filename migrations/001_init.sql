-- Migration 001: initial tables for Esprey Recipes.
-- Paste each CREATE TABLE statement into the D1 console ONE AT A TIME.

-- Statement 1 of 4
CREATE TABLE recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  servings TEXT,
  prep_minutes INTEGER,
  cook_minutes INTEGER,
  ingredients TEXT NOT NULL DEFAULT '[]',
  steps TEXT NOT NULL DEFAULT '[]',
  source_type TEXT NOT NULL DEFAULT 'invented',
  source_url TEXT,
  is_favourite INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Statement 2 of 4
CREATE TABLE timers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  ends_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  recipe_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Statement 3 of 4
CREATE TABLE push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Statement 4 of 4
CREATE TABLE shopping_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  recipe_id INTEGER,
  recipe_title TEXT,
  checked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
