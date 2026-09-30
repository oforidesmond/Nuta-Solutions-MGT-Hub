import { NextResponse } from "next/server";
import { staffAppNestDownloadUrl } from "@/lib/staff-app";

/** Thin proxy: redirect to Nest public download. Nest owns Blob / current release. */
export async function GET() {
  return NextResponse.redirect(staffAppNestDownloadUrl(), 302);
}
