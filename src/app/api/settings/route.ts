import { NextRequest, NextResponse } from "next/server";

import { getSessionFromCookie } from "@/lib/session";
import { getUserSettings, upsertUserSettings } from "@/lib/user-settings";

const MAX_KEY_LENGTH = 128;

const sanitizeValue = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, MAX_KEY_LENGTH);
};

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ settings: null }, { status: 401 });
    }

    const settings = await getUserSettings(session.userId);
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Failed to load settings", error);
    return NextResponse.json({ error: "Unable to load settings." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Session required." }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      binanceApiKey?: unknown;
      binanceApiSecret?: unknown;
      bybitApiKey?: unknown;
      bybitApiSecret?: unknown;
    } | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const payload = {
      binanceApiKey: sanitizeValue(body.binanceApiKey),
      binanceApiSecret: sanitizeValue(body.binanceApiSecret),
      bybitApiKey: sanitizeValue(body.bybitApiKey),
      bybitApiSecret: sanitizeValue(body.bybitApiSecret),
    };

    const settings = await upsertUserSettings(session.userId, payload);
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Failed to save settings", error);
    return NextResponse.json({ error: "Unable to save settings." }, { status: 500 });
  }
}
