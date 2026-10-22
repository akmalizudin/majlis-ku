import { env } from "@/lib/env";
import { ApiError, handle } from "@/server/http";
import { runPurgeOnce } from "@/server/retention/schedule";
import { secretMatches } from "@/server/security/secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** For an external scheduler. No body; the bearer secret is the only gate. */
export const POST = handle(async (request: Request) => {
  const { CRON_SECRET } = env();
  if (!CRON_SECRET) throw new ApiError("not_found", 404);
  const bearer = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!secretMatches(bearer, CRON_SECRET)) throw new ApiError("unauthorized", 401);
  return Response.json(await runPurgeOnce());
});
