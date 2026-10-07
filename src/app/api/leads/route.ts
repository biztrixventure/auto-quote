import { NextResponse } from "next/server";

// The site no longer offers car insurance quotes; service contract requests go to /api/vsc-leads.
export function POST() {
  return NextResponse.json({ error: "Car insurance quotes are no longer offered" }, { status: 410 });
}
