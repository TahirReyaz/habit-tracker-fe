import type { NextRequest } from "next/server";

/**
 * Same-origin proxy to the Spring Boot API.
 * Keeps the session cookie first-party (httpOnly, SameSite=Strict) and hides the backend URL from the browser.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND = (process.env.BACKEND_URL || "http://localhost:8080").replace(/\/+$/, "");
const FORWARD_REQ = ["cookie", "content-type", "accept", "authorization", "user-agent"];
const FORWARD_RES = ["content-type", "content-disposition"];

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const search = new URL(req.url).search;
  const target = `${BACKEND}/api/${path.map(encodeURIComponent).join("/")}${search}`;

  const headers = new Headers();
  for (const h of FORWARD_REQ) {
    const v = req.headers.get(h);
    if (v) headers.set(h, v);
  }
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip");
  if (ip) headers.set("x-forwarded-for", ip);

  const init: RequestInit = { method: req.method, headers, redirect: "manual", cache: "no-store" };
  if (req.method !== "GET" && req.method !== "HEAD") init.body = await req.arrayBuffer();

  let res: Response;
  try {
    res = await fetch(target, init);
  } catch {
    return Response.json({ error: "API unavailable" }, { status: 502, headers: { "cache-control": "no-store" } });
  }

  const out = new Headers({ "cache-control": "no-store" });
  for (const h of FORWARD_RES) {
    const v = res.headers.get(h);
    if (v) out.set(h, v);
  }
  for (const c of res.headers.getSetCookie()) out.append("set-cookie", c);

  const body = res.status === 204 || res.status === 304 ? null : await res.arrayBuffer();
  return new Response(body, { status: res.status, headers: out });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
