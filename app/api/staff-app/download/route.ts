import { head } from "@vercel/blob";
import { NextResponse } from "next/server";
import { STAFF_APP_APK_FILENAME } from "@/lib/staff-app";

export async function GET(request: Request) {
  const blobUrl = process.env.STAFF_APP_BLOB_URL?.trim();
  if (!blobUrl) {
    return NextResponse.json(
      { message: "Staff app download is not configured yet." },
      { status: 503 },
    );
  }

  try {
    const meta = await head(blobUrl);
    const target = new URL(meta.downloadUrl ?? meta.url);
    target.searchParams.set("download", STAFF_APP_APK_FILENAME);

    const response = NextResponse.redirect(target.toString(), 302);
    const orgId = new URL(request.url).searchParams.get("org");
    if (orgId) {
      response.headers.set("X-Staff-App-Org", orgId);
    }
    return response;
  } catch {
    return NextResponse.json(
      { message: "Staff app file could not be found. Contact your administrator." },
      { status: 404 },
    );
  }
}
