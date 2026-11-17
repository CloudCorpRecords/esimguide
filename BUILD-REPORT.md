# BUILD REPORT — esimguide

Clean-room rebuild of MCP Registry `e-esim/esim-catalog`
v1.2.0 (remote-only MCP server at
`https://e-esim.com/wp-json/e-esim/mcp`), built 2026-10-28
as a forwarding client. Package: `@reneturcios/esimguide`
0.1.0, registry name `io.github.CloudCorpRecords/esimguide`.

## Surface built

Full surface: **5 of 5 captured tools built**, none omitted.

| Tool | Required fields as served |
|------|---------------------------|
| `search_esim_plans` | Explicit empty `required: []` in the capture — served verbatim as an empty array |
| `get_plan_details` | `product_id` |
| `start_checkout` | `product_id` |
| `recommend_plan` | `countries`, `days` |
| `get_shop_facts` | NO `required` key in the capture — served verbatim, none invented |

Each served tool carries exactly the keys `name`, `title`,
`description`, `inputSchema`, exactly as captured: the capture
carries `title` keys, so they are served verbatim. The tool
literals were generated programmatically from
`harness/fixtures/eesim-tools.json` by the script at
`/tmp/b49-esimguide-scratch/gen.py` (parse + re-serialise; the
emitted `TOOL_DEFS` block was verified to byte-match the block
in `src/forward.ts`, and the generator's round-trip assertion
confirmed the literals parse back to the fixture's tool
objects) — never retyped — and the registration-integrity test
suite plus the parity harness confirmed the served literals
deep-equal the fixture's 5 tool objects, in order. Tools are
registered via the MCP SDK low-level Server API
(`ListToolsRequestSchema` / `CallToolRequestSchema` handlers),
not McpServer+zod.

`start_checkout` is built like every other tool: per its
captured description it returns a `buy_url` — the shop's own
product page where the customer taps Buy now and pays on the
merchant's site. It collects no personal details, creates no
cart or checkout session, and commits no purchase (navigation
handoff; the spec records it flagged for re-triage before its
publish wave on the strength of the tool's name alone).

## Fixture conflicts

**None.** The spec and the fixture agree on all 5 tools'
names, titles, descriptions, required fields (including the
explicit empty `required: []` on `search_esim_plans` and the
absent `required` key on `get_shop_facts`) and property
shapes.

## Labelled reconstructions (from the spec's Wire section)

- Upstream endpoint pinned: `https://e-esim.com/wp-json/e-esim/mcp`.
- Env override `EESIM_MCP_URL` — labelled reconstruction.
- The registry record declares NO headers on the remote: no
  auth header is ever sent. Tests assert that no
  `Authorization` header is sent under any environment —
  including with key-like env vars (`EESIM_API_KEY`,
  `API_KEY`, `AUTHORIZATION`) set — and that no `X-API-Key`
  header is ever sent; upstream requests carry only
  `Content-Type`, `Accept` and, when issued, `Mcp-Session-Id`.
- Error rendering `esimguide error:` text for upstream
  failures — labelled reconstruction: an upstream JSON-RPC
  error surfaces as `esimguide error: <upstream message>`;
  a transport failure surfaces as
  `esimguide error: <failure description>`.
- Upstream results pass through verbatim, including
  `content`, `structuredContent`, `isError` and extra
  fields. tools/call is forwarded as streamable-HTTP
  JSON-RPC: initialize (protocolVersion `2025-03-26`) →
  notifications/initialized → tools/call, honouring
  `Mcp-Session-Id` when issued; plain-JSON and SSE replies
  are both parsed. The forwarding core takes an injectable
  fetch; tests stub the upstream — no live network calls
  in tests.

## Deviations

None.

## Lockfile

- Route: generated clean from birth in the build dir with no
  `node_modules` and no pre-existing lockfile:
  `npm install --package-lock-only --ignore-scripts --offline`
  (Route 3).
- Parses as JSON; `name` == `@reneturcios/esimguide`.
- Package entries: **128**.
- sha256: `11a8deeb83c6f5fa3182a523aee66dd85970dfc6220bd7718f54f191b0e25605`
  (re-verified unchanged after the subsequent offline `npm ci`).

## server.json

- Description exactly: "Travel eSIM catalogue: search plans by destination, compare prices and get shop facts." —
  **86 characters** (verified programmatically).
- npm package entry carries `"version": "0.1.0"`; the OCI entry
  (`ghcr.io/cloudcorprecords/esimguide:0.1.0`) carries **no**
  `version` field. Both entries carry packageArguments
  `[{type: positional, value: mcp}]` and transport stdio.
  Dockerfile (node:20-alpine, both stages) carries the label
  `io.modelcontextprotocol.server.name="io.github.CloudCorpRecords/esimguide"`.
  Container workflow `IMAGE` is `ghcr.io/cloudcorprecords/esimguide`
  and its smoke test asserts the server name `esimguide`.

## Verification (all run 2026-10-28)

1. `npx tsc --noEmit` → exit 0.
2. `npm run build` → exit 0; real `dist/` produced (cli,
   forward, index, mcp, types — .js, .d.ts, .js.map each).
3. `node dist/cli.js --version` → `0.1.0`.
4. `npm test` → **57 tests, 57 pass, 0 fail**
   (registration-integrity suite deep-equals the served
   tools/list against the fixture's 5 tools, including the
   title keys, the explicit empty `required` array on
   `search_esim_plans` and the no-`required`-key assertion on
   `get_shop_facts` — plus session handling/reuse, env
   override, the no-Authorization-header assertions under
   any environment, verbatim argument forwarding and result
   pass-through including structuredContent and upstream
   isError, SSE parsing, both error renderings, MCP-layer
   validation, and CLI behaviour including a tool subcommand
   forwarding test against a local stub server).
5. Parity: `python3 /home/hatch/workspace/mcp-rebuild-100/harness/parity.py --original /home/hatch/workspace/mcp-rebuild-100/harness/fixtures/eesim-tools.json --rebuild "stdio:node /home/hatch/workspace/mcp-rebuild-100/builds/esimguide/dist/cli.js mcp" --out /home/hatch/workspace/mcp-rebuild-100/builds/esimguide/parity-out` → **verdict PASS, parity 100.0**
   (5/5 identical, 0 missing, 0 extra, no schema diffs).
   Output in `parity-out/`.
