import { NextRequest } from "next/server";
import { getShareCloneUrl, tryDeductCloneAccess } from "@/lib/skill-shares";

export const dynamic = "force-dynamic";

const FORWARD_HEADERS = [
  "accept",
  "accept-encoding",
  "accept-language",
  "content-type",
  "git-protocol",
  "user-agent",
];

const RESPONSE_HEADERS = [
  "content-type",
  "cache-control",
  "pragma",
  "expires",
];

function isCloneStart(req: NextRequest) {
  return (
    req.method === "GET" &&
    req.nextUrl.pathname.endsWith("/info/refs") &&
    req.nextUrl.searchParams.get("service") === "git-upload-pack"
  );
}

function errorResponse(status: number, message: string) {
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain" },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ accessKey: string; path: string[] }> }
) {
  const { accessKey } = await params;

  const cloneUrl = getShareCloneUrl(accessKey);
  if (!cloneUrl) {
    return errorResponse(410, "Share link is invalid, expired, or has been revoked");
  }

  if (isCloneStart(req)) {
    const deducted = tryDeductCloneAccess(accessKey);
    if (!deducted) {
      return errorResponse(403, "Share link access limit exceeded");
    }
  }

  return proxyGet(req, cloneUrl);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ accessKey: string; path: string[] }> }
) {
  const { accessKey } = await params;

  const cloneUrl = getShareCloneUrl(accessKey, { checkLimit: false });
  if (!cloneUrl) {
    return errorResponse(410, "Share link is invalid, expired, or has been revoked");
  }

  return proxyPost(req, cloneUrl);
}

async function proxyGet(req: NextRequest, upstreamBase: string) {
  const upstreamUrl = buildUpstreamUrl(req, upstreamBase);

  const headers = collectForwardHeaders(req);

  try {
    const upstreamResp = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers,
    });

    return buildResponse(upstreamResp);
  } catch (err) {
    console.error("[git-proxy] GET upstream fetch failed:", err);
    return errorResponse(502, "Upstream fetch failed");
  }
}

async function proxyPost(req: NextRequest, upstreamBase: string) {
  const upstreamUrl = buildUpstreamUrl(req, upstreamBase);

  const headers = collectForwardHeaders(req);

  // Buffer the POST body — git-upload-pack request body is small
  // (the negotiation data), only the response is large (pack file).
  let body: ArrayBuffer | undefined;
  try {
    body = await req.arrayBuffer();
  } catch {
    body = undefined;
  }

  try {
    const upstreamResp = await fetch(upstreamUrl.toString(), {
      method: "POST",
      headers,
      body,
    });

    return buildResponse(upstreamResp);
  } catch (err) {
    console.error("[git-proxy] POST upstream fetch failed:", err);
    return errorResponse(502, "Upstream fetch failed");
  }
}

function buildUpstreamUrl(req: NextRequest, upstreamBase: string): URL {
  const subPath = req.nextUrl.pathname.replace(
    /^\/share\/[^/]+\/install\.git/,
    ""
  );
  const base = upstreamBase.replace(/\.git$/, "");
  const url = new URL(base + subPath);
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });
  return url;
}

function collectForwardHeaders(req: NextRequest): Headers {
  const headers = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

function buildResponse(upstreamResp: globalThis.Response): Response {
  const respHeaders = new Headers();
  for (const name of RESPONSE_HEADERS) {
    const value = upstreamResp.headers.get(name);
    if (value) respHeaders.set(name, value);
  }
  return new Response(upstreamResp.body, {
    status: upstreamResp.status,
    headers: respHeaders,
  });
}
