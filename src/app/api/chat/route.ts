import { NextRequest, NextResponse } from 'next/server';
import { runAgent } from '@/lib/agent/loop';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, message, language } = body as { sessionId?: string; message?: string; language?: string };

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    // Generate a sessionId if not provided
    const sid = sessionId || `s-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    if (language !== undefined && language !== 'en' && language !== 'bn') {
      return NextResponse.json({ error: 'language must be en or bn' }, { status: 400 });
    }

    const result = await runAgent(sid, message, language === 'bn' ? 'bn' : 'en');

    return NextResponse.json({
      sessionId: sid,
      answer: result.finalAnswer,
      trace: result.trace,
      iterations: result.iterations,
    });
  } catch (err: any) {
    console.error('[/api/chat] error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'agrisense-chat' });
}
