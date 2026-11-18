import { Database } from "bun:sqlite"

export const db = new Database("porto.db", { create: true })

db.run("PRAGMA foreign_keys = ON")

db.run(`
  CREATE TABLE IF NOT EXISTS portos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cidade TEXT NOT NULL,
    pais TEXT NOT NULL DEFAULT 'Brasil',
    criado_em TEXT DEFAULT (datetime('now'))
  )
`)

db.run(`
  CREATE TABLE IF NOT EXISTS navios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    bandeira TEXT NOT NULL,
    tipo TEXT NOT NULL,
    capacidade_ton INTEGER,
    criado_em TEXT DEFAULT (datetime('now'))
  )
`)

db.run(`
  CREATE TABLE IF NOT EXISTS escalas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    navio_id INTEGER NOT NULL,
    porto_id INTEGER NOT NULL,
    chegada TEXT NOT NULL,
    partida TEXT,
    status TEXT DEFAULT 'agendado',
    FOREIGN KEY (navio_id) REFERENCES navios(id) ON DELETE CASCADE,
    FOREIGN KEY (porto_id) REFERENCES portos(id) ON DELETE CASCADE
  )
`)

db.run(`
  CREATE TABLE IF NOT EXISTS containers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL UNIQUE,
    tipo TEXT NOT NULL DEFAULT '20ft',
    peso_kg INTEGER,
    escala_id INTEGER,
    FOREIGN KEY (escala_id) REFERENCES escalas(id) ON DELETE SET NULL
  )
`)
