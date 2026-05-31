import { NextRequest } from "next/server";

const GITEA_BASE = process.env.GITEA_BASE;
if (!GITEA_BASE) {
  throw new Error("GITEA_BASE 环境变量未设置。请在 .env 中配置 Gitea 服务地址。");
}

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const url = `${GITEA_BASE}/api/v1/${path.join("/")}`;

  try {
    const resp = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    const contentType = resp.headers.get("content-type") || "application/json";
    const data = contentType.includes("text")
      ? await resp.text()
      : await resp.arrayBuffer();

    return new Response(data, {
      status: resp.status,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return Response.json({ error: "Gitea unreachable" }, { status: 502 });
  }
}
