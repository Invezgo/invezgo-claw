# Invezgo for OpenClaw

Give your OpenClaw agent the [Invezgo API](https://invezgo.com): Indonesia Stock Exchange (IDX/BEI) data — stock and index lists, intraday, order book, running trade, charts and indicators, broker summaries and broker stalker, foreign and top accumulation, shareholders (KSEI, insider, >5%), financial statements and key stats, calendar, news, disclosures, the screener — plus your own watchlists, portfolio, journal, trades and alerts.

## Install

```bash
openclaw plugins install @invezgo/openclaw-plugin-invezgo
```

## Configure

Generate an API key at <https://invezgo.com/id/setting/api>, then either set it in the Gateway config:

```json
{ "plugins": { "entries": { "invezgo": { "config": { "apiKey": "<your key>" } } } } }
```

or export `INVEZGO_API_KEY` in the Gateway environment.

## Tools

| Tool | What it does |
| --- | --- |
| `invezgo_endpoints` | Search the catalog of all 109 Invezgo endpoints; pass `path` for full parameter and body details. |
| `invezgo_get` | Call any read-only endpoint, e.g. `path: "/analysis/summary/stock/BBCA"`, `query: { from, to, investor: "all", market: "RG" }`. |
| `invezgo_write` | *Optional — allowlist it to enable.* POST/PUT/PATCH/DELETE: run the screener, manage watchlists, journals, trades, alerts and screener presets. |

Only paths documented in the Invezgo OpenAPI spec are called, always on `https://api.invezgo.com`.

Example prompts: *"Siapa broker yang paling banyak akumulasi BBCA minggu ini?"*, *"Show TLKM's last 4 quarterly income statements"*, *"Screen syariah stocks where close > prev and volume > 1M"*.

## Development

```bash
npm install
npm run gen            # refresh src/endpoints.ts from https://api.invezgo.com/openapi.json
npm run plugin:build   # compile + regenerate openclaw.plugin.json
npm test
```

## License

MIT
