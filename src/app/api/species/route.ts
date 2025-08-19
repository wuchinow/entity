import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data: species, error } = await supabase
      .from('species')
      .select('*')
      .order('common_name');

    if (error) {
      console.error('Error fetching species:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ species });
  } catch (error) {
    console.error('Error in species API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch species' },
      { status: 500 }
    );
  }
}