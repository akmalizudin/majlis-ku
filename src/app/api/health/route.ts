import { db } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      db.$queryRaw`SELECT 1`,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), 2000);
      }),
    ]);
    return Response.json({ status: "ok" }, { headers: noStore });
  } catch {
    return Response.json({ status: "error" }, { status: 503, headers: noStore });
  } finally {
    clearTimeout(timer);
  }
}
