import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 as ok`;
    return NextResponse.json(
      {
        status: "ok",
        db: result[0]?.ok === 1 ? "connected" : "unknown",
        checkedAt: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Health check: database connection failed", error);
    return NextResponse.json(
      {
        status: "error",
        db: "disconnected",
        checkedAt: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
