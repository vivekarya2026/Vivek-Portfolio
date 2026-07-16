import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

/**
 * On-demand revalidation endpoint. Protected by a shared secret so the public
 * cache can be refreshed programmatically (e.g. from external automations).
 * The admin publish/unpublish actions already call revalidatePath directly;
 * this route is a backup / external hook.
 */
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ ok: false, error: "Missing path" }, { status: 400 });
  }

  revalidatePath(path);
  return NextResponse.json({ ok: true, revalidated: path });
}
