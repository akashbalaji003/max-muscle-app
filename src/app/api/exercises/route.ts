import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('exercises')
    .select('id, name, category, muscle_group, equipment')
    .order('category')
    .order('name');

  if (error) return NextResponse.json({ error: 'Failed to fetch exercises' }, { status: 500 });

  return NextResponse.json({ exercises: data });
}
