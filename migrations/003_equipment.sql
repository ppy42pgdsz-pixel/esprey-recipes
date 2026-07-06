-- Migration 003: kitchen equipment inventory.
-- Paste this single statement into the D1 console.

CREATE TABLE equipment_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
