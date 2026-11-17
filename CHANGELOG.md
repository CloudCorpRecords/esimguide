# Changelog

## 0.1.0 (2026-10-28)

- First release: a forwarding client for the hosted e-eSIM catalogue MCP server. All 5 captured tools are answered locally for tools/list, and every tools/call is forwarded upstream over a streamable-HTTP JSON-RPC session (initialize, notifications/initialized, tools/call, honouring the Mcp-Session-Id header when the upstream issues one).
- Tools: `search_esim_plans`, `get_plan_details`, `start_checkout`, `recommend_plan`, `get_shop_facts`. Titles are served exactly as captured; `search_esim_plans` carries the capture's explicit empty `required` array and `get_shop_facts` carries no `required` key; `get_plan_details` and `start_checkout` require `product_id`, and `recommend_plan` requires `countries` and `days`. `start_checkout` is a buy-link navigation handoff to the shop's own product page — no purchase is made through this surface.
- Upstream results pass through verbatim, including the isError flag; upstream failures surface as `esimguide error:` text results.
- One bin serves the CLI (one subcommand per tool, plus `--version`) and the stdio MCP server (`mcp` subcommand). The upstream endpoint can be overridden via `EESIM_MCP_URL`. The upstream record declares no headers, so no auth header is ever sent.
