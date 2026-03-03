import { NextResponse } from "next/server";
import { getCacheTimestamp } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = getCacheTimestamp();
  return NextResponse.json({ timestamp });
}
