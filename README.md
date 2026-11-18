# Sistema de Controle Portuário

Aplicação web para gerenciamento de navios, portos, escalas e containers.

## Tecnologias

- [Bun](https://bun.sh) — runtime e gerenciador de pacotes
- [Hono](https://hono.dev) — framework web
- [Arktype](https://arktype.io) — validação de dados
- SQLite nativo via `bun:sqlite`

## Como rodar

```bash
bun install
bun run index.ts
```

Acesse: http://localhost:3000

## Estrutura

```
porto-system/
├── index.ts          # Ponto de entrada
├── src/
│   ├── server.ts     # Configuração do servidor
│   ├── routes.ts     # Rotas da API
│   └── db.ts         # Banco de dados e tabelas
└── public/
    └── index.html    # Interface web
```

## Tabelas

- `navios` — embarcações cadastradas
- `portos` — portos de origem e destino
- `escalas` — registro de chegada/partida de navios em portos
- `containers` — unidades de carga vinculadas a escalas
