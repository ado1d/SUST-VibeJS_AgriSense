import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getWeather } from '@/lib/agent/tools/weather';
import { checkWeatherTriggers } from '@/lib/agent/tools/tier1_tools';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
    if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });

    const farmer = await db.farmer.findUnique({
      where: { sessionId },
      include: {
        seasonPlans: {
          where: { planStatus: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    const plan = farmer?.seasonPlans[0];
    if (!farmer?.location || !plan) {
      return NextResponse.json({ checked: false, reason: 'A saved location and active season plan are required.', trace: [], alerts: [] });
    }

    const weatherStart = Date.now();
    const weather = await getWeather(farmer.location);
    const weatherDuration = Date.now() - weatherStart;
    const triggerStart = Date.now();
    const triggers = checkWeatherTriggers(plan.crop, plan.currentGrowthStage || undefined, weather.forecast);
    const triggerDuration = Date.now() - triggerStart;
    const now = new Date();

    const trace = [
      {
        iteration: 1,
        toolName: 'get_weather',
        toolArgs: { location: farmer.location, reason: 'automatic active-plan forecast check' },
        toolResult: weather,
        durationMs: weatherDuration,
        timestamp: now.toISOString(),
      },
      {
        iteration: 2,
        toolName: 'check_weather_triggers',
        toolArgs: { crop: plan.crop, growthStage: plan.currentGrowthStage, weatherForecast: '(from get_weather)' },
        toolResult: triggers,
        durationMs: triggerDuration,
        timestamp: now.toISOString(),
      },
    ];

    await db.$transaction([
      db.weatherCheck.create({
        data: {
          seasonPlanId: plan.id,
          forecastStart: weather.forecast[0]?.date,
          forecastEnd: weather.forecast.at(-1)?.date,
          requestUrl: 'https://api.open-meteo.com/v1/forecast',
        },
      }),
      ...trace.map(entry => db.traceEntry.create({
        data: {
          farmerId: farmer.id,
          toolName: entry.toolName,
          toolArgs: JSON.stringify(entry.toolArgs),
          toolResult: JSON.stringify(entry.toolResult).slice(0, 50000),
          durationMs: entry.durationMs,
        },
      })),
    ]);

    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);
    for (const alert of triggers.proactiveAlerts) {
      const message = `[${alert.ruleId}] ${alert.action} Reason: ${alert.reasoning}`;
      const duplicate = await db.alert.findFirst({
        where: { seasonPlanId: plan.id, messageEn: message, createdAt: { gte: startOfToday } },
      });
      if (!duplicate) {
        await db.alert.create({
          data: {
            seasonPlanId: plan.id,
            alertType: alert.alertOrOperation.toLowerCase().includes('disease') ? 'disease' :
              alert.alertOrOperation.toLowerCase().includes('pest') ? 'pest' : 'heavy_rain',
            severity: 'moderate',
            messageEn: message,
          },
        });
      }
    }

    return NextResponse.json({
      checked: true,
      checkedAt: now.toISOString(),
      weatherSummary: weather.summary,
      trace,
      alerts: triggers.proactiveAlerts,
    });
  } catch (error: any) {
    console.error('[/api/monitor] error:', error);
    return NextResponse.json({ error: error.message || 'Forecast monitoring failed' }, { status: 500 });
  }
}
