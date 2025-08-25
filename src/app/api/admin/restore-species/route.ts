import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting species restoration process...');
    
    // Get the active species list
    const { data: activeList } = await supabase
      .from('species_lists')
      .select('id, name')
      .eq('is_active', true)
      .single();

    if (!activeList) {
      throw new Error('No active species list found');
    }

    console.log(`📋 Active list: ${activeList.name} (${activeList.id})`);

    // Get current species count
    const { data: currentSpecies, error: countError } = await supabase
      .from('species')
      .select('id, common_name')
      .eq('species_list_id', activeList.id);

    if (countError) {
      throw new Error(`Failed to get current species: ${countError.message}`);
    }

    const currentCount = currentSpecies?.length || 0;
    console.log(`📊 Current species count: ${currentCount}`);

    if (currentCount === 132) {
      return NextResponse.json({
        success: true,
        message: 'Species count is already correct (132)',
        currentCount: 132,
        restored: 0
      });
    }

    // Re-import the 133 species to restore missing ones
    console.log('📥 Re-importing 133 species to restore missing entries...');
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/import-133-species`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      // Try local import instead
      console.log('🔄 Trying local import...');
      const localResponse = await fetch('http://localhost:3000/api/import-133-species', {
        method: 'POST'
      });
      
      if (!localResponse.ok) {
        throw new Error('Failed to re-import species');
      }
    }

    // Wait a moment for import to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Now properly remove ONLY the Levuana Moth duplicate
    console.log('🔍 Finding Levuana Moth duplicates...');
    
    const { data: levuanaSpecies } = await supabase
      .from('species')
      .select('id, common_name, created_at')
      .eq('species_list_id', activeList.id)
      .eq('common_name', 'Levuana Moth')
      .order('created_at', { ascending: true });

    if (levuanaSpecies && levuanaSpecies.length > 1) {
      // Keep the first (oldest), remove the rest
      const toKeep = levuanaSpecies[0];
      const toRemove = levuanaSpecies.slice(1);
      
      console.log(`🗑️ Removing ${toRemove.length} Levuana Moth duplicate(s), keeping ${toKeep.id}`);
      
      for (const duplicate of toRemove) {
        // Remove any media associated with this duplicate
        await supabase
          .from('species_media')
          .delete()
          .eq('species_id', duplicate.id);
        
        // Remove the duplicate species
        await supabase
          .from('species')
          .delete()
          .eq('id', duplicate.id);
        
        console.log(`✅ Removed duplicate Levuana Moth: ${duplicate.id}`);
      }
    }

    // Update Baiji to Baiji Dolphin if it exists
    console.log('🐬 Updating Baiji to Baiji Dolphin...');
    
    const { data: baijiSpecies } = await supabase
      .from('species')
      .select('id')
      .eq('species_list_id', activeList.id)
      .eq('common_name', 'Baiji')
      .single();

    if (baijiSpecies) {
      await supabase
        .from('species')
        .update({ 
          common_name: 'Baiji Dolphin',
          updated_at: new Date().toISOString()
        })
        .eq('id', baijiSpecies.id);
      
      console.log('✅ Updated Baiji to Baiji Dolphin');
    }

    // Get final count
    const { data: finalSpecies } = await supabase
      .from('species')
      .select('id')
      .eq('species_list_id', activeList.id);

    const finalCount = finalSpecies?.length || 0;
    const restored = finalCount - currentCount;

    console.log(`🎉 Restoration complete! Final count: ${finalCount}`);

    return NextResponse.json({
      success: true,
      message: `Species restoration completed. Count: ${currentCount} → ${finalCount}`,
      currentCount: finalCount,
      restored: restored,
      targetCount: 132
    });

  } catch (error) {
    console.error('❌ Error in species restoration:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}