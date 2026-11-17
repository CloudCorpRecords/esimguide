# esimguide

Off to Thailand, Japan, or a five-country loop and need mobile data when you land? esimguide is a local forwarding client for the hosted e-eSIM catalogue MCP service: it answers `tools/list` locally from the captured tool definitions and forwards every call to the service, returning the answers exactly as the service sends them back.

The catalogue tools search published eSIM plans by destination, return full facts for one plan, fit up to three plans to a described trip, and explain how the shop itself works — delivery, installation, payment methods, refunds. One tool hands the traveller to the shop's own product page to buy; no purchase, cart, or payment happens inside this surface.

## The tools

- **`search_esim_plans`** — Find plans for one destination or several, in any language. Best-value plans come first with full facts, coverage lists and a direct link; multi-country plans that include the destination are marked `covers_via`. Filter by plan `type`, `min_days`, and quote in a `language`, `bucket`, or `currency`. Its captured `required` list is explicitly empty — every parameter is optional.
- **`get_plan_details`** — Full facts for one plan by `product_id` (required): coverage, data and speed rules, validity clock, expiry, carrier, price, reviews and link.
- **`start_checkout`** — A navigation handoff, not a checkout: for one `product_id` (required) it returns the plan's `buy_url` — the shop's own product page where the customer taps Buy now and pays on the shop's site — plus the plan name and price. It collects no personal details and creates no order.
- **`recommend_plan`** — Turn a trip into up to three recommendations. `countries` (1–5) and `days` are required; `usage` or `gb_per_day` sizes the data need and `budget` caps the trip total. Each fit carries the full plan facts, the whole-trip price, and a one-sentence reason built only from catalogue facts.
- **`get_shop_facts`** — How e-eSIM works in the shop's own words: delivery and installation, device requirements, payment methods, refund policy, hotspot, support and company details. Takes no parameters and carries no `required` key.

## Install and run

As an MCP server via npm:

```bash
npx -y @reneturcios/esimguide mcp
```

MCP client configuration:

```json
{
  "mcpServers": {
    "esimguide": {
      "command": "npx",
      "args": ["-y", "@reneturcios/esimguide", "mcp"]
    }
  }
}
```

As a container:

```bash
docker run -i ghcr.io/cloudcorprecords/esimguide
docker run --rm ghcr.io/cloudcorprecords/esimguide get_shop_facts '{}'
```

## CLI

One binary serves both the command line and the MCP server. Each tool is a subcommand taking a single JSON string with that tool's arguments:

```bash
esimguide search_esim_plans '{"destination":"Thailand","limit":5}'
esimguide get_plan_details '{"product_id":42}'
esimguide start_checkout '{"product_id":42,"currency":"EUR"}'
esimguide recommend_plan '{"countries":["Japan"],"days":10,"usage":"normal"}'
esimguide get_shop_facts '{}'
esimguide --version
```

Exit codes: `0` when the forwarded call succeeds, `1` when the upstream result is an error, and `2` for usage problems such as an unknown subcommand or a malformed JSON argument.

## Configuration

- `EESIM_MCP_URL` — Overrides the upstream endpoint. The default is the pinned hosted endpoint, `https://e-esim.com/wp-json/e-esim/mcp`. (The override variable is a reconstruction added by this rebuild.)

The upstream registry record declares no headers, so no authentication header is ever sent; the tool surface was captured keyless.

Upstream failures — a JSON-RPC error from the service, a non-2xx response, an unreadable body, or a request that fails outright — are reported to the caller as an error result whose text starts with `esimguide error:`.

## How forwarding works

The first forwarded call opens a session: an `initialize` request (protocol version `2025-03-26`), followed by a `notifications/initialized` notification, then the `tools/call` itself. If the service answers the initialize request with an `Mcp-Session-Id` header, that value is carried on every later request, and the open session is reused for the rest of the process. Replies are accepted either as plain JSON or as server-sent events. Successful results pass through verbatim, including any `isError` flag and any extra fields the service includes.

## Development

```bash
npm install
npm run build   # tsc -> dist/ (dist/cli.js is the bin)
npm test        # tsx --test test/*.test.ts — stubbed upstream, no network
npm run dev     # run the CLI from source
```

The test suite checks the served tool list against the captured surface (all 5 tools, deep-equal, in order, titles included, the explicit empty `required` array on `search_esim_plans` and no `required` key on `get_shop_facts`), exercises the session handshake and its reuse, verifies that no `Authorization` header is ever sent under any environment, and verifies that arguments go upstream untouched and results come back untouched.

## License

MIT — see `LICENSE`. Copyright (c) 2026 Rene Turcios.
