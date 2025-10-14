import { NextRequest, NextResponse } from "next/server";

import {
  createSession,
  destroySession,
  getSessionFromCookie,
  toSessionResponse,
  touchSession,
} from "@/lib/session";
import { ensureUserCredits } from "@/lib/user-credits";

const buildError = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ session: null }, { status: 200 });
    }

    const refreshed = await touchSession(session.sessionId);
    const activeSession = refreshed ?? session;
    const creditDoc = await ensureUserCredits(activeSession.userId);
    return NextResponse.json({
      session: toSessionResponse(activeSession, { credits: creditDoc.balance }),
    });
  } catch (error) {
    console.error("Failed to read session", error);
    return buildError("Unable to read session.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      userId?: string;
      email?: string | null;
      name?: string | null;
      wallet?: string | null;
    } | null;

    if (!body?.userId) {
      return buildError("Missing user id.");
    }

    const session = await createSession({
      userId: body.userId,
      email: body.email ?? null,
      name: body.name ?? null,
      wallet: body.wallet ?? null,
    });
    const credits = await ensureUserCredits(body.userId);

    return NextResponse.json(
      { session: toSessionResponse(session, { credits: credits.balance }) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create session", error);
    return buildError("Unable to create session.", 500);
  }
}

export async function DELETE() {
  try {
    await destroySession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to destroy session", error);
    return buildError("Unable to destroy session.", 500);
  }
}
