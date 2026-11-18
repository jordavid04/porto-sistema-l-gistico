import { Hono } from "hono"
import { type } from "arktype"
import { db } from "./db"

export const routes = new Hono()

// Schemas de validação com Arktype
const NavioSchema = type({
  nome: "string > 1",
  bandeira: "string > 1",
  tipo: "'cargueiro' | 'tanqueiro' | 'porta-container' | 'graneleiro'",
  "capacidade_ton?": "number | null",
})

const PortoSchema = type({
  nome: "string > 1",
  cidade: "string > 1",
  "pais?": "string",
})

const EscalaSchema = type({
  navio_id: "number",
  porto_id: "number",
  chegada: "string > 1",
  "partida?": "string | null",
  "status?": "'agendado' | 'atracado' | 'concluido'",
})

const ContainerSchema = type({
  codigo: "string > 3",
  "tipo?": "'20ft' | '40ft' | '40ft-HC'",
  "peso_kg?": "number | null",
  "escala_id?": "number | null",
})

// ── Portos ────────────────────────────────────────────────────────

routes.get("/api/portos", (c) => {
  const q = c.req.query("q")
  if (q) {
    return c.json(
      db.query("SELECT * FROM portos WHERE nome LIKE ? OR cidade LIKE ? ORDER BY nome")
        .all(`%${q}%`, `%${q}%`)
    )
  }
  return c.json(db.query("SELECT * FROM portos ORDER BY nome").all())
})

routes.get("/api/portos/:id", (c) => {
  const id = Number(c.req.param("id"))
  const porto = db.query("SELECT * FROM portos WHERE id = ?").get(id)
  if (!porto) return c.json({ erro: "Porto não encontrado" }, 404)

  // Traz as escalas do porto junto
  const escalas = db.query(`
    SELECT e.*, n.nome AS navio_nome FROM escalas e
    JOIN navios n ON n.id = e.navio_id
    WHERE e.porto_id = ?
    ORDER BY e.chegada DESC
  `).all(id)

  return c.json({ ...porto, escalas })
})

routes.post("/api/portos", async (c) => {
  const body = await c.req.json()
  const parsed = PortoSchema(body)
  if (parsed instanceof type.errors) return c.json({ erro: parsed.summary }, 400)

  const result = db
    .prepare("INSERT INTO portos (nome, cidade, pais) VALUES (?, ?, ?)")
    .run(parsed.nome, parsed.cidade, parsed.pais ?? "Brasil")

  return c.json({ id: result.lastInsertRowid }, 201)
})

routes.put("/api/portos/:id", async (c) => {
  const id = Number(c.req.param("id"))
  const body = await c.req.json()
  const parsed = PortoSchema(body)
  if (parsed instanceof type.errors) return c.json({ erro: parsed.summary }, 400)

  db.prepare("UPDATE portos SET nome = ?, cidade = ?, pais = ? WHERE id = ?")
    .run(parsed.nome, parsed.cidade, parsed.pais ?? "Brasil", id)

  return c.json({ ok: true })
})

routes.delete("/api/portos/:id", (c) => {
  const id = Number(c.req.param("id"))
  db.run("DELETE FROM portos WHERE id = ?", [id])
  return c.json({ ok: true })
})

// ── Navios ────────────────────────────────────────────────────────

routes.get("/api/navios", (c) => {
  const q = c.req.query("q")
  if (q) {
    return c.json(
      db.query("SELECT * FROM navios WHERE nome LIKE ? OR bandeira LIKE ? ORDER BY nome")
        .all(`%${q}%`, `%${q}%`)
    )
  }
  return c.json(db.query("SELECT * FROM navios ORDER BY nome").all())
})

routes.get("/api/navios/:id", (c) => {
  const id = Number(c.req.param("id"))
  const navio = db.query("SELECT * FROM navios WHERE id = ?").get(id)
  if (!navio) return c.json({ erro: "Navio não encontrado" }, 404)

  const escalas = db.query(`
    SELECT e.*, p.nome AS porto_nome FROM escalas e
    JOIN portos p ON p.id = e.porto_id
    WHERE e.navio_id = ?
    ORDER BY e.chegada DESC
  `).all(id)

  return c.json({ ...navio, escalas })
})

routes.post("/api/navios", async (c) => {
  const body = await c.req.json()
  const parsed = NavioSchema(body)
  if (parsed instanceof type.errors) return c.json({ erro: parsed.summary }, 400)

  const result = db
    .prepare("INSERT INTO navios (nome, bandeira, tipo, capacidade_ton) VALUES (?, ?, ?, ?)")
    .run(parsed.nome, parsed.bandeira, parsed.tipo, parsed.capacidade_ton ?? null)

  return c.json({ id: result.lastInsertRowid }, 201)
})

routes.put("/api/navios/:id", async (c) => {
  const id = Number(c.req.param("id"))
  const body = await c.req.json()
  const parsed = NavioSchema(body)
  if (parsed instanceof type.errors) return c.json({ erro: parsed.summary }, 400)

  db.prepare("UPDATE navios SET nome = ?, bandeira = ?, tipo = ?, capacidade_ton = ? WHERE id = ?")
    .run(parsed.nome, parsed.bandeira, parsed.tipo, parsed.capacidade_ton ?? null, id)

  return c.json({ ok: true })
})

routes.delete("/api/navios/:id", (c) => {
  const id = Number(c.req.param("id"))
  db.run("DELETE FROM navios WHERE id = ?", [id])
  return c.json({ ok: true })
})

// ── Escalas ───────────────────────────────────────────────────────

routes.get("/api/escalas", (c) => {
  const status = c.req.query("status")

  // Atualiza status automaticamente baseado no horário atual
  const agora = new Date().toISOString()
  db.run(`
    UPDATE escalas SET status = 'atracado'
    WHERE status = 'agendado' AND chegada <= ?
  `, [agora])

  const base = `
    SELECT e.*, n.nome AS navio_nome, p.nome AS porto_nome
    FROM escalas e
    JOIN navios n ON n.id = e.navio_id
    JOIN portos p ON p.id = e.porto_id
  `
  const escalas = status
    ? db.query(base + "WHERE e.status = ? ORDER BY e.chegada DESC").all(status)
    : db.query(base + "ORDER BY e.chegada DESC").all()

  return c.json(escalas)
})

routes.get("/api/escalas/:id", (c) => {
  const id = Number(c.req.param("id"))

  const escala = db.query(`
    SELECT e.*, n.nome AS navio_nome, p.nome AS porto_nome
    FROM escalas e
    JOIN navios n ON n.id = e.navio_id
    JOIN portos p ON p.id = e.porto_id
    WHERE e.id = ?
  `).get(id)

  if (!escala) return c.json({ erro: "Escala não encontrada" }, 404)

  const containers = db.query("SELECT * FROM containers WHERE escala_id = ?").all(id)
  return c.json({ ...escala, containers })
})

routes.post("/api/escalas", async (c) => {
  const body = await c.req.json()
  const parsed = EscalaSchema(body)
  if (parsed instanceof type.errors) return c.json({ erro: parsed.summary }, 400)

  // Status inicial depende se a chegada já passou ou é futura
  const agora = new Date().toISOString()
  const statusInicial = parsed.chegada > agora ? "agendado" : "atracado"

  const result = db
    .prepare("INSERT INTO escalas (navio_id, porto_id, chegada, partida, status) VALUES (?, ?, ?, ?, ?)")
    .run(parsed.navio_id, parsed.porto_id, parsed.chegada, parsed.partida ?? null, statusInicial)

  return c.json({ id: result.lastInsertRowid }, 201)
})

routes.put("/api/escalas/:id", async (c) => {
  const id = Number(c.req.param("id"))
  const { partida, status } = await c.req.json()

  db.prepare("UPDATE escalas SET partida = ?, status = ? WHERE id = ?")
    .run(partida ?? null, status ?? "atracado", id)

  return c.json({ ok: true })
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

routes.get("/api/escalas/:id/containers", (c) => {
  const id = Number(c.req.param("id"))
  return c.json(
    db.query("SELECT * FROM containers WHERE escala_id = ?").all(id)
  )
})

routes.post("/api/containers", async (c) => {
  const body = await c.req.json()
  const parsed = ContainerSchema(body)
  if (parsed instanceof type.errors) return c.json({ erro: parsed.summary }, 400)

  try {
    const result = db
      .prepare("INSERT INTO containers (codigo, tipo, peso_kg, escala_id) VALUES (?, ?, ?, ?)")
      .run(parsed.codigo, parsed.tipo ?? "20ft", parsed.peso_kg ?? null, parsed.escala_id ?? null)
    return c.json({ id: result.lastInsertRowid }, 201)
  } catch {
    return c.json({ erro: "Código de container já existe" }, 409)
  }
})

routes.put("/api/containers/:id", async (c) => {
  const id = Number(c.req.param("id"))
  const body = await c.req.json()
  const parsed = ContainerSchema(body)
  if (parsed instanceof type.errors) return c.json({ erro: parsed.summary }, 400)

  db.prepare("UPDATE containers SET codigo = ?, tipo = ?, peso_kg = ?, escala_id = ? WHERE id = ?")
    .run(parsed.codigo, parsed.tipo ?? "20ft", parsed.peso_kg ?? null, parsed.escala_id ?? null, id)

  return c.json({ ok: true })
})

routes.delete("/api/containers/:id", (c) => {
  const id = Number(c.req.param("id"))
  db.run("DELETE FROM containers WHERE id = ?", [id])
  return c.json({ ok: true })
})
