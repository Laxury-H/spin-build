import { NextResponse } from "next/server";
import { getTrendSnapshot } from "@/lib/trends/engine";
import type { Region } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const regionParam = searchParams.get("region");
    const region: Region = regionParam === "VN" ? "VN" : "GLOBAL";
    const force = searchParams.get("force") === "true";

    const snapshot = await getTrendSnapshot(region, { force });

    return NextResponse.json(snapshot, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("[api/trends] Failed to get snapshot:", error);
    return NextResponse.json(
      { error: "Failed to fetch live trends" },
      { status: 500 },
    );
  }
}
