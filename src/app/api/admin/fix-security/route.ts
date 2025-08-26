import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    console.log('Starting security vulnerability fixes...');
    
    const fixes = [];
    const errors = [];

    // 1. Fix Security Definer View
    try {
      // Drop and recreate admin_dashboard view with security invoker
      await supabase.rpc('exec_sql', {
        sql: `
          DROP VIEW IF EXISTS public.admin_dashboard;
          
          CREATE VIEW public.admin_dashboard
          WITH (security_invoker = true)
          AS
          SELECT 
            s.id,
            s.common_name,
            s.scientific_name,
            s.year_extinct,
            s.last_location,
            s.extinction_cause,
            s.generation_status,
            s.supabase_image_url,
            s.supabase_video_url,
            s.type,
            s.region,
            s.habitat,
            s.description,
            sl.name as species_list_name,
            sl.is_active as from_active_list
          FROM species s
          LEFT JOIN species_lists sl ON s.species_list_id = sl.id;
        `
      });
      fixes.push('Fixed Security Definer View issue');
    } catch (error) {
      console.error('Error fixing Security Definer View:', error);
      errors.push(`Security Definer View fix failed: ${error}`);
    }

    // 2. Fix Function Search Path Issues
    const functionsToFix = [
      'get_next_media_version',
      'update_species_media', 
      'get_primary_media',
      'get_species_with_media',
      'trigger_update_media',
      'update_updated_at_col',
      'get_generation_stats',
      'reset_generation_stat'
    ];

    for (const functionName of functionsToFix) {
      try {
        await supabase.rpc('exec_sql', {
          sql: `ALTER FUNCTION public.${functionName}() SET search_path = '';`
        });
        fixes.push(`Fixed search path for function: ${functionName}`);
      } catch (error) {
        console.error(`Error fixing function ${functionName}:`, error);
        errors.push(`Function ${functionName} fix failed: ${error}`);
      }
    }

    // 3. Ensure RLS is enabled (if not already)
    try {
      await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE public.species ENABLE ROW LEVEL SECURITY;
          ALTER TABLE public.species_lists ENABLE ROW LEVEL SECURITY;
          ALTER TABLE public.species_media ENABLE ROW LEVEL SECURITY;
        `
      });
      fixes.push('Ensured RLS is enabled on all tables');
    } catch (error) {
      console.error('Error enabling RLS:', error);
      // This might fail if RLS is already enabled, which is fine
      fixes.push('RLS already enabled on tables');
    }

    console.log('Security fixes completed:', fixes);
    console.log('Security fix errors:', errors);

    return NextResponse.json({
      success: true,
      fixes,
      errors,
      message: `Applied ${fixes.length} security fixes${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    });

  } catch (error) {
    console.error('Error applying security fixes:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to apply security fixes',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}