# basishacks_2026

The official website for basishacks_2026. This is an updated version for season 2.

## Local setup

First, copy `.env.example` as `.env` and fill out the fields. Then choose one of the methods below.

## Requirements
Node.js >= v24
@nuxt/ui >= v4.6

Using Bun (preferred):

```shell
bun i
bunx wrangler d1 execute DB --file sql/init.sql
bunx wrangler d1 execute DB --command 'INSERT INTO hackathon VALUES(1, "not_started", 0, 0, 0, 0, 0, NULL, NULL) ON CONFLICT DO NOTHING'
bun dev --https
```

Using npm:

```shell
npm i
npx wrangler d1 execute DB --file sql/init.sql
npx wrangler d1 execute DB --command 'INSERT INTO hackathon VALUES(1, "not_started", 0, 0, 0, 0, 0, NULL, NULL) ON CONFLICT DO NOTHING'
npm run dev -- --https
```
