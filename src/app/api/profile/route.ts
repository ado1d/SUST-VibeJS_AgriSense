import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

// GET /api/profile?sessionId=... — fetch farmer profile + conversation history
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const farmer = await db.farmer.findUnique({
    where: { sessionId },
    include: {
      conversations: { orderBy: { createdAt: 'asc' }, take: 100 },
      traces: { orderBy: { createdAt: 'desc' }, take: 200 },
    },
  });

  if (!farmer) {
    return NextResponse.json({ profile: null, conversations: [], trace: [] });
  }

  return NextResponse.json({
    profile: {
      sessionId: farmer.sessionId,
      name: farmer.name,
      location: farmer.location,
      latitude: farmer.latitude,
      longitude: farmer.longitude,
      farmSizeDecimal: farmer.farmSizeDecimal,
      soilType: farmer.soilType,
      waterSource: farmer.waterSource,
      budgetBdt: farmer.budgetBdt,
      targetSeason: farmer.targetSeason,
      chosenCrop: farmer.chosenCrop,
      sowingDate: farmer.sowingDate,
    },
    conversations: farmer.conversations.map(c => ({ role: c.role, content: c.content, at: c.createdAt })),
    // Return the trace with the profile so sidebar restoration is atomic. The
    // dedicated /api/trace route remains available for trace-only consumers.
    trace: [...farmer.traces].reverse().map(t => ({
      id: t.id,
      toolName: t.toolName,
      toolArgs: tryParse(t.toolArgs),
      toolResult: tryParse(t.toolResult),
      durationMs: t.durationMs,
      at: t.createdAt,
    })),
  });
}

function tryParse(value: string | null): any {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return value; }
}
