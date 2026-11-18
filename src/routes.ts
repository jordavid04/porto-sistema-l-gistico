import { Hono } from "hono"
import { db } from "./db"

export const routes = new Hono()

// ── Portos ────────────────────────────────────────────────────────

routes.get("/api/portos", (c) => {
  const portos = db.query("SELECT * FROM portos ORDER BY nome").all()
  return c.json(portos)
})

routes.post("/api/portos", async (c) => {
  const { nome, cidade, pais } = await c.req.json()
  if (!nome || !cidade) return c.json({ erro: "Nome e cidade são obrigatórios" }, 400)

  const result = db
    .prepare("INSERT INTO portos (nome, cidade, pais) VALUES (?, ?, ?)")
    .run(nome, cidade, pais ?? "Brasil")

  return c.json({ id: result.lastInsertRowid }, 201)
})

routes.delete("/api/portos/:id", (c) => {
  const id = Number(c.req.param("id"))
  db.run("DELETE FROM portos WHERE id = ?", [id])
  return c.json({ ok: true })
})

// ── Navios ────────────────────────────────────────────────────────

routes.get("/api/navios", (c) => {
  const navios = db.query("SELECT * FROM navios ORDER BY nome").all()
  return c.json(navios)
})

routes.post("/api/navios", async (c) => {
  const { nome, bandeira, tipo, capacidade_ton } = await c.req.json()
  if (!nome || !bandeira || !tipo) return c.json({ erro: "Nome, bandeira e tipo são obrigatórios" }, 400)

  const result = db
    .prepare("INSERT INTO navios (nome, bandeira, tipo, capacidade_ton) VALUES (?, ?, ?, ?)")
    .run(nome, bandeira, tipo, capacidade_ton ?? null)

  return c.json({ id: result.lastInsertRowid }, 201)
})

routes.delete("/api/navios/:id", (c) => {
  const id = Number(c.req.param("id"))
  db.run("DELETE FROM navios WHERE id = ?", [id])
  return c.json({ ok: true })
})

// ── Escalas ───────────────────────────────────────────────────────

routes.get("/api/escalas", (c) => {
  const escalas = db.query(`
    SELECT e.*, n.nome AS navio_nome, p.nome AS porto_nome
    FROM escalas e
    JOIN navios n ON n.id = e.navio_id
    JOIN portos p ON p.id = e.porto_id
    ORDER BY e.chegada DESC
  `).all()
  return c.json(escalas)
})

routes.post("/api/escalas", async (c) => {
  const { navio_id, porto_id, chegada } = await c.req.json()
  if (!navio_id || !porto_id || !chegada) {
    return c.json({ erro: "navio_id, porto_id e chegada são obrigatórios" }, 400)
  }

  const agora = new Date().toISOString()
  const status = chegada > agora ? "agendado" : "atracado"

  const result = db
    .prepare("INSERT INTO escalas (navio_id, porto_id, chegada, status) VALUES (?, ?, ?, ?)")
    .run(navio_id, porto_id, chegada, status)

  return c.json({ id: result.lastInsertRowid }, 201)
})

routes.delete("/api/escalas/:id", (c) => {
  const id = Number(c.req.param("id"))
  db.run("DELETE FROM escalas WHERE id = ?", [id])
  return c.json({ ok: true })
})

// ── Containers ────────────────────────────────────────────────────

routes.get("/api/containers", (c) => {
  return c.json(db.query("SELECT * FROM containers ORDER BY codigo").all())
})

routes.post("/api/containers", async (c) => {
  const { codigo, tipo, peso_kg, escala_id } = await c.req.json()
  if (!codigo) return c.json({ erro: "Código é obrigatório" }, 400)

  try {
    const result = db
      .prepare("INSERT INTO containers (codigo, tipo, peso_kg, escala_id) VALUES (?, ?, ?, ?)")
      .run(codigo, tipo ?? "20ft", peso_kg ?? null, escala_id ?? null)
    return c.json({ id: result.lastInsertRowid }, 201)
  } catch {
    return c.json({ erro: "Código de container já existe" }, 409)
  }
})

routes.delete("/api/containers/:id", (c) => {
  const id = Number(c.req.param("id"))
  db.run("DELETE FROM containers WHERE id = ?", [id])
  return c.json({ ok: true })
})
