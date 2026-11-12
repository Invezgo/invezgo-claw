import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";
import { ENDPOINTS, SPEC_VERSION } from "./endpoints.js";
const BASE_URL = "https://api.invezgo.com";
const MAX_CHARS = 200_000; // shortcut: hard cap on returned JSON text; raise or paginate if models need more.
const templateRegex = (template) => new RegExp("^" + template.replace(/\{[^}]+\}/g, "[A-Za-z0-9._~%:-]+") + "$");
const ROUTES = ENDPOINTS.map((e) => ({ endpoint: e, regex: templateRegex(e.path) }));
/** Finds the documented endpoint a concrete path belongs to; rejects anything not in the spec. */
export function matchEndpoint(method, path) {
    if (!path.startsWith("/") || path.includes("..") || /[?#]/.test(path)) {
        throw new Error(`Invalid path "${path}". Pass a path like /analysis/information/BBCA and put query parameters in "query".`);
    }
    // Prefer a literal template over a parameterised one (e.g. /watchlists/group vs /watchlists/{id}).
    const hits = ROUTES.filter((r) => r.endpoint.method === method && r.regex.test(path));
    const hit = hits.find((r) => !r.endpoint.path.includes("{")) ?? hits[0];
    if (!hit) {
        throw new Error(`${method} ${path} is not an Invezgo API endpoint. Use invezgo_endpoints to find the right one.`);
    }
    return hit.endpoint;
}
async function call(config, method, path, query, body, signal) {
    matchEndpoint(method, path);
    const apiKey = config.apiKey || process.env.INVEZGO_API_KEY;
    if (!apiKey) {
        throw new Error("Invezgo API key is not configured. Generate one at https://invezgo.com/id/setting/api and set plugins.entries.invezgo.config.apiKey or the INVEZGO_API_KEY environment variable.");
    }
    const url = new URL(path, BASE_URL);
    for (const [k, v] of Object.entries(query ?? {})) {
        if (v === undefined || v === null)
            continue;
        for (const item of Array.isArray(v) ? v : [v])
            url.searchParams.append(k, String(item));
    }
    const res = await fetch(url, {
        method,
        signal,
        headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
            ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
        throw new Error(`Invezgo API ${method} ${url.pathname} failed with HTTP ${res.status}: ${text.slice(0, 1000)}`);
    }
    if (text.length > MAX_CHARS) {
        return `${text.slice(0, MAX_CHARS)}\n…[truncated ${text.length - MAX_CHARS} chars; narrow the request with limit/date/page parameters]`;
    }
    try {
        return { data: JSON.parse(text) };
    }
    catch {
        return text;
    }
}
const queryParam = Type.Optional(Type.Record(Type.String(), Type.Unknown(), { description: "Query string parameters as key/value pairs, e.g. {\"date\": \"2026-11-11\", \"limit\": 50}." }));
export default defineToolPlugin({
    id: "invezgo",
    name: "Invezgo",
    description: "Indonesia Stock Exchange (IDX/BEI) market data from the Invezgo API: stock lists, prices, charts, broker summaries, foreign flow, shareholders, financials, screener, news, plus your watchlists, portfolio and journal.",
    configSchema: Type.Object({
        apiKey: Type.Optional(Type.String({
            description: "Invezgo API key from https://invezgo.com/id/setting/api. Falls back to the INVEZGO_API_KEY environment variable.",
        })),
    }),
    tools: (tool) => [
        tool({
            name: "invezgo_endpoints",
            label: "Invezgo: find endpoint",
            description: `Search the Invezgo API catalog (spec v${SPEC_VERSION}, ${ENDPOINTS.length} endpoints) for Indonesian stock market data. ` +
                "Call this first to find the endpoint and its parameters, then call invezgo_get (reads) or invezgo_write (changes). " +
                "Pass `path` to get the full description, parameters and body schema of one endpoint.",
            parameters: Type.Object({
                query: Type.Optional(Type.String({ description: "Keywords matched against path, tag and summary, e.g. 'broker summary', 'foreign', 'financial'." })),
                path: Type.Optional(Type.String({ description: "Exact endpoint template from a previous search, e.g. /analysis/summary/stock/{code}." })),
            }),
            workspaceAccess: false,
            execute: ({ query, path }) => {
                if (path) {
                    const found = ENDPOINTS.filter((e) => e.path === path);
                    if (!found.length)
                        throw new Error(`Unknown endpoint ${path}. Search with "query" first.`);
                    return { endpoints: found };
                }
                const words = (query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
                const endpoints = ENDPOINTS.filter((e) => {
                    const hay = `${e.method} ${e.path} ${e.tag} ${e.summary}`.toLowerCase();
                    return words.every((w) => hay.includes(w));
                }).map((e) => ({
                    method: e.method,
                    path: e.path,
                    tag: e.tag,
                    summary: e.summary,
                    params: e.params.map((p) => `${p.in === "path" ? "{" + p.name + "}" : p.name}${p.required ? "*" : ""}`).join(", "),
                }));
                return { count: endpoints.length, endpoints };
            },
        }),
        tool({
            name: "invezgo_get",
            label: "Invezgo: read data",
            description: "Call a read-only (GET) Invezgo API endpoint. Fill path parameters directly into `path` (e.g. /analysis/summary/stock/BBCA) " +
                "and pass query parameters in `query`. Stock codes are IDX tickers like BBCA, TLKM; dates are YYYY-MM-DD.",
            parameters: Type.Object({
                path: Type.String({ description: "Concrete API path, e.g. /analysis/information/BBCA." }),
                query: queryParam,
            }),
            workspaceAccess: false,
            execute: ({ path, query }, config, context) => call(config, "GET", path, query, undefined, context.signal),
        }),
        tool({
            name: "invezgo_write",
            label: "Invezgo: change data",
            description: "Call a POST/PUT/PATCH/DELETE Invezgo endpoint: run the stock screener (POST /screener/screen) or change the user's " +
                "watchlists, journals, trades, alerts and screener presets. Confirm with the user before changing or deleting their data.",
            parameters: Type.Object({
                method: Type.Union([Type.Literal("POST"), Type.Literal("PUT"), Type.Literal("PATCH"), Type.Literal("DELETE")]),
                path: Type.String({ description: "Concrete API path, e.g. /screener/screen or /watchlists/123." }),
                query: queryParam,
                body: Type.Optional(Type.Record(Type.String(), Type.Unknown(), { description: "JSON request body as described by invezgo_endpoints." })),
            }),
            optional: true,
            workspaceAccess: false,
            execute: ({ method, path, query, body }, config, context) => call(config, method, path, query, body, context.signal),
        }),
    ],
});
