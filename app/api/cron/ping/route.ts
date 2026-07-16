import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  // Vercel sets this header on cron invocations; reject anything else
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    // Minimal query — just enough to count as activity for Supabase
    const { error } = await supabase.from('games').select('id').limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    console.error('Ping failed:', err);
    return NextResponse.json({ error: 'Ping failed' }, { status: 500 });
  }
}
