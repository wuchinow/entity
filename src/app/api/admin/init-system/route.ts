import { NextRequest, NextResponse } from 'next/server';
import { SupabaseService } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // First, let's get all species to see what we have
    const allSpecies = await SupabaseService.getAllSpecies();
    
    if (allSpecies.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No species found in database. Please load species data first.' 
      }, { status: 400 });
    }

    // Get the first species to set as current
    const firstSpecies = allSpecies[0];
    
    // Initialize or update system state
    const systemState = await SupabaseService.updateSystemState({
      current_species_id: firstSpecies.id,
      total_species: allSpecies.length,
      completed_species: 0,
      is_cycling: false,
      updated_at: new Date().toISOString()
    });

    console.log('System initialized with:', {
      currentSpecies: firstSpecies.common_name,
      totalSpecies: allSpecies.length,
      systemState
    });

    return NextResponse.json({ 
      success: true, 
      message: `System initialized with ${allSpecies.length} species. Current: ${firstSpecies.common_name}`,
      data: {
        currentSpecies: firstSpecies,
        totalSpecies: allSpecies.length,
        systemState
      }
    });

  } catch (error) {
    console.error('Error initializing system:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}