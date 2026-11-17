/**
 * esimguide core: a forwarding client for the hosted
 * e-eSIM catalogue MCP server.
 *
 * Nothing about eSIM plans is computed here.
 * tools/list is answered from the literal definitions
 * below, which reproduce a live capture of the upstream
 * server word for word (name, title, description and
 * inputSchema exactly as captured; search_esim_plans
 * carries an explicit empty `required` array, and
 * get_shop_facts carries no `required` key at all, both
 * served verbatim). A tools/call travels upstream over
 * a streamable-HTTP JSON-RPC session: an initialize
 * POST, a notifications/initialized POST, then the
 * tools/call POST, carrying the Mcp-Session-Id response
 * header on later requests when the upstream issues
 * one. The session opens lazily on the first forwarded
 * call and is reused for the client's lifetime.
 *
 * The endpoint is pinned to
 * https://e-esim.com/wp-json/e-esim/mcp and may be
 * replaced with the EESIM_MCP_URL environment variable
 * (that override is a labelled reconstruction). The
 * registry record declares NO headers on the upstream
 * remote, so no auth header is ever sent, under any
 * environment.
 *
 * A successful upstream result is returned exactly as
 * received, isError flag and extra fields included.
 * Failures -- an upstream JSON-RPC error, a non-2xx
 * status, a body that cannot be parsed, or a fetch
 * that throws or times out -- become an isError result
 * whose text begins with `esimguide error:` (that
 * rendering is a labelled reconstruction). Replies may
 * be plain JSON or SSE (`data:` lines); the JSON-RPC
 * message whose id matches the request wins.
 */
import type {
  FetchFn,
  FetchResponseLike,
  ForwardDeps,
  ToolArgs,
  ToolDef,
  ToolResult,
} from "./types.js";

export const VERSION = "0.1.0";

export const DEFAULT_ENDPOINT_URL = "https://e-esim.com/wp-json/e-esim/mcp";

export const DEFAULT_TIMEOUT_MS = 30000;

export const PROTOCOL_VERSION = "2025-03-26";

/* ------------------------------------------------------------------ */
/* Tool definitions (tools/list literals, verbatim from the live       */
/* capture in harness/fixtures/eesim-tools.json; generated             */
/* programmatically by parsing and re-serialising the fixture JSON,    */
/* never retyped). All 5 captured tools are built.                     */
/* ------------------------------------------------------------------ */

export const TOOL_DEFS: ToolDef[] = [
  {
    "name": "search_esim_plans",
    "title": "Find eSIM plans",
    "description": "Find e-eSIM eSIM plans for one destination or several (countries or regions, any language). Returns the best-value plans first with full facts, coverage lists and a direct link; multi-country plans that include the destination are returned too and marked covers_via. Use when a user wants mobile data abroad; use recommend_plan when they describe a whole trip.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "destination": {
          "type": "string",
          "description": "Country or region in any language, e.g. \"Thailand\", \"Japon\", \"Europa\", or a 2-letter ISO code. For a city, pass its country."
        },
        "destinations": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "maxItems": 5,
          "description": "Several countries for one trip; only plans covering ALL of them are returned. Overrides destination."
        },
        "type": {
          "type": "string",
          "enum": [
            "daily_surf",
            "trip_surf",
            "all_you_can_surf",
            "any"
          ],
          "description": "Plan type. Default any."
        },
        "min_days": {
          "type": "integer",
          "minimum": 1,
          "description": "Only plans valid for at least this many days."
        },
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 50,
          "description": "Plans to return. Default 10; all_plans_url lists everything."
        },
        "sort": {
          "type": "string",
          "enum": [
            "value",
            "price",
            "data"
          ],
          "description": "value = best price per GB delivered / cheapest All You Can Surf per day first (default); price = cheapest first; data = most data first."
        },
        "language": {
          "type": "string",
          "description": "ISO language of the conversation, e.g. en, de, ja. Plan names and country names come back in it when available. Bare \"en\" is quoted in en-us / USD."
        },
        "bucket": {
          "type": "string",
          "description": "Optional language-region bucket the customer shops in, e.g. \"en-gb\", \"de-de\". Wins over language; prices and links are quoted in it."
        },
        "currency": {
          "type": "string",
          "description": "Optional ISO 4217 code. Every price in the result is quoted in it."
        }
      },
      "required": []
    }
  },
  {
    "name": "get_plan_details",
    "title": "Get plan details",
    "description": "Full facts for one e-eSIM plan by product id: coverage list, data and speed rules (daily allowance, reduced speed, fair use), validity clock, expiry date, notice, carrier, price, reviews and link — quoted in the customer's bucket or currency when given.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "product_id": {
          "type": "integer",
          "description": "Product id from search_esim_plans or recommend_plan."
        },
        "language": {
          "type": "string",
          "description": "ISO language of the conversation, e.g. en, de, ja. Plan names and country names come back in it when available. Bare \"en\" is quoted in en-us / USD."
        },
        "bucket": {
          "type": "string",
          "description": "Optional language-region bucket the customer shops in, e.g. \"en-gb\", \"de-de\". Wins over language; prices and links are quoted in it."
        },
        "currency": {
          "type": "string",
          "description": "Optional ISO 4217 code. Every price in the result is quoted in it."
        }
      },
      "required": [
        "product_id"
      ]
    }
  },
  {
    "name": "start_checkout",
    "title": "Start secure checkout",
    "description": "Hand the customer to the e-eSIM shop to buy one plan. Returns buy_url (the product page where they tap Buy now and pay securely — card, Apple Pay, Google Pay, PayPal, Amazon Pay, Klarna or a local method such as iDEAL | Wero, Bancontact, BLIK or Pix; there is no discount-code field) plus the plan name and price in the customer's bucket or currency. No account needed; the eSIM is emailed right after payment. There is no in-chat order tracking.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "product_id": {
          "type": "integer",
          "description": "Product id to buy."
        },
        "language": {
          "type": "string",
          "description": "ISO language of the conversation, e.g. en, de, ja. Plan names and country names come back in it when available. Bare \"en\" is quoted in en-us / USD."
        },
        "bucket": {
          "type": "string",
          "description": "Optional language-region bucket the customer shops in, e.g. \"en-gb\", \"de-de\". Wins over language; prices and links are quoted in it."
        },
        "currency": {
          "type": "string",
          "description": "Optional ISO 4217 code. Every price in the result is quoted in it."
        }
      },
      "required": [
        "product_id"
      ]
    }
  },
  {
    "name": "recommend_plan",
    "title": "Recommend a plan for a trip",
    "description": "Turn a trip into up to three plan recommendations: countries (1-5, any language), number of days and how much data the traveller uses. Each fit carries the full plan facts, the total price for the whole trip and a one-sentence reason built only from catalogue facts. Use this first whenever the user describes a trip rather than asks for a list.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "countries": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "minItems": 1,
          "maxItems": 5,
          "description": "Countries or regions of the trip, any language."
        },
        "days": {
          "type": "integer",
          "minimum": 1,
          "maximum": 365,
          "description": "Trip length in days."
        },
        "usage": {
          "type": "string",
          "enum": [
            "light",
            "normal",
            "heavy"
          ],
          "description": "light ≈ 0.5 GB/day (maps, messaging), normal ≈ 1.5 GB/day (social, some video), heavy ≈ 4 GB/day (video, hotspot). Default normal."
        },
        "gb_per_day": {
          "type": "number",
          "minimum": 0.1,
          "description": "Overrides usage with an explicit daily need in GB."
        },
        "budget": {
          "type": "number",
          "minimum": 0,
          "description": "Optional maximum total for the trip, in the result currency."
        },
        "language": {
          "type": "string",
          "description": "ISO language of the conversation, e.g. en, de, ja. Plan names and country names come back in it when available. Bare \"en\" is quoted in en-us / USD."
        },
        "bucket": {
          "type": "string",
          "description": "Optional language-region bucket the customer shops in, e.g. \"en-gb\", \"de-de\". Wins over language; prices and links are quoted in it."
        },
        "currency": {
          "type": "string",
          "description": "Optional ISO 4217 code. Every price in the result is quoted in it."
        }
      },
      "required": [
        "countries",
        "days"
      ]
    }
  },
  {
    "name": "get_shop_facts",
    "title": "Shop facts",
    "description": "How e-eSIM works, in the shop's own words: delivery and installation, device requirements, payment methods, refund policy, no top-ups, hotspot, Usage Dashboard and apps, support and company details. Use for any \"how / when / what if\" question that is not about one specific plan.",
    "inputSchema": {
      "type": "object",
      "properties": {}
    }
  }
];
export const TOOL_NAMES = TOOL_DEFS.map((t) => t.name);

/** Whether `name` belongs to the captured built surface. */
export function isKnownTool(name: string): boolean {
  return TOOL_NAMES.includes(name);
}

/* ------------------------------------------------------------------ */
/* Forwarding client                                                   */
/* ------------------------------------------------------------------ */

function errorResult(detail: string): ToolResult {
  return {
    content: [{ type: "text", text: `esimguide error: ${detail}` }],
    isError: true,
  };
}

function rpcErrorMessage(error: unknown): string {
  if (error !== null && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message !== "") return message;
    return JSON.stringify(error);
  }
  return String(error);
}

/**
 * Read a JSON-RPC response body, tolerating SSE framing.
 * Returns the message whose id matches `expectedId` when
 * present, otherwise the last parseable message, otherwise
 * null when nothing in the body parses.
 */
export function parseRpcBody(
  text: string,
  expectedId?: number,
): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const candidates: Record<string, unknown>[] = [];
  const tryPush = (payload: string): void => {
    try {
      const parsed: unknown = JSON.parse(payload);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        candidates.push(parsed as Record<string, unknown>);
      }
    } catch {
      // Not a JSON payload; skip this candidate.
    }
  };
  if (trimmed.includes("data:")) {
    for (const line of trimmed.split("\n")) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice("data:".length).trim();
      if (payload !== "" && payload !== "[DONE]") tryPush(payload);
    }
  } else {
    tryPush(trimmed);
  }
  if (candidates.length === 0) return null;
  if (expectedId !== undefined) {
    const match = candidates.find((c) => c.id === expectedId);
    if (match !== undefined) return match;
  }
  return candidates[candidates.length - 1];
}

async function defaultFetch(
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
): Promise<FetchResponseLike> {
  return fetch(url, init) as unknown as FetchResponseLike;
}

/**
 * A forwarding client holding a single upstream session,
 * opened lazily on first use and reused from then on
 * (for the process lifetime in the MCP server, or for a
 * single invocation in the CLI).
 */
export class EsimguideClient {
  private readonly deps: ForwardDeps;
  private sessionId: string | null = null;
  private ready = false;
  private sessionPromise: Promise<void> | null = null;
  private idCounter = 0;

  constructor(deps: ForwardDeps = {}) {
    this.deps = deps;
  }

  private fetchFn(): FetchFn {
    return this.deps.fetchFn ?? defaultFetch;
  }

  private endpointUrl(): string {
    if (this.deps.url && this.deps.url.trim() !== "") return this.deps.url.trim();
    const raw = (this.deps.env ?? process.env).EESIM_MCP_URL;
    if (raw && raw.trim() !== "") return raw.trim();
    return DEFAULT_ENDPOINT_URL;
  }

  private timeoutMs(): number {
    if (typeof this.deps.timeoutMs === "number" && this.deps.timeoutMs > 0) {
      return this.deps.timeoutMs;
    }
    return DEFAULT_TIMEOUT_MS;
  }

  private nextId(): number {
    this.idCounter += 1;
    return this.idCounter;
  }

  private async post(
    body: unknown,
    withSession: boolean,
  ): Promise<FetchResponseLike> {
    // The registry record declares NO headers on the upstream
    // remote: no Authorization header is ever sent.
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    if (withSession && this.sessionId !== null) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs());
    try {
      return await this.fetchFn()(this.endpointUrl(), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async ensureSession(): Promise<void> {
    if (this.ready) return;
    if (this.sessionPromise === null) {
      this.sessionPromise = (async () => {
        const initId = this.nextId();
        const initRes = await this.post(
          {
            jsonrpc: "2.0",
            id: initId,
            method: "initialize",
            params: {
              protocolVersion: PROTOCOL_VERSION,
              capabilities: {},
              clientInfo: { name: "esimguide", version: VERSION },
            },
          },
          false,
        );
        const sessionId = initRes.headers.get("mcp-session-id");
        if (sessionId) this.sessionId = sessionId;
        const initText = await initRes.text();
        const initParsed = parseRpcBody(initText, initId);
        if (initParsed !== null && initParsed.error) {
          throw new Error(rpcErrorMessage(initParsed.error));
        }
        if (initRes.status < 200 || initRes.status >= 300) {
          throw new Error(`HTTP ${initRes.status}`);
        }
        if (initParsed === null && initText.trim() !== "") {
          throw new Error("malformed response");
        }
        const initializedRes = await this.post(
          { jsonrpc: "2.0", method: "notifications/initialized" },
          true,
        );
        try {
          await initializedRes.text();
        } catch {
          // Nothing needed from the notification response body.
        }
        this.ready = true;
      })();
    }
    try {
      await this.sessionPromise;
    } catch (err) {
      this.sessionPromise = null;
      this.sessionId = null;
      throw err;
    }
  }

  /** Forward one tool call; upstream failures come back as isError results. */
  async callTool(name: string, args: ToolArgs): Promise<ToolResult> {
    try {
      await this.ensureSession();
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }

    const callId = this.nextId();
    let callRes: FetchResponseLike;
    try {
      callRes = await this.post(
        {
          jsonrpc: "2.0",
          id: callId,
          method: "tools/call",
          params: { name, arguments: args ?? {} },
        },
        true,
      );
    } catch (err) {
      return errorResult(
        `request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const parsed = parseRpcBody(await callRes.text(), callId);
    if (parsed !== null && parsed.error) {
      return errorResult(rpcErrorMessage(parsed.error));
    }
    if (callRes.status < 200 || callRes.status >= 300) {
      return errorResult(`HTTP ${callRes.status}`);
    }
    if (parsed === null) return errorResult("malformed response");
    const result = parsed.result as ToolResult | undefined;
    if (result === undefined || result === null || typeof result !== "object") {
      return errorResult("malformed response");
    }
    // Hand the upstream result back exactly as received.
    return result;
  }
}

/** Build a forwarding client; tests inject a fake fetch and env through deps. */
export function createClient(deps: ForwardDeps = {}): EsimguideClient {
  return new EsimguideClient(deps);
}

/** One-shot helper: a fresh client for a single call (the CLI path). */
export async function callTool(
  name: string,
  args: ToolArgs,
  deps: ForwardDeps = {},
): Promise<ToolResult> {
  return new EsimguideClient(deps).callTool(name, args);
}
