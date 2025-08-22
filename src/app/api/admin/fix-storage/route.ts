import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MediaStorageService } from '@/lib/media-storage';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    console.log('🔧 Starting storage fix process...');
    
    // Step 1: Initialize storage bucket
    console.log('Step 1: Initializing storage bucket...');
    await MediaStorageService.initializeBucket();
    
    // Step 2: Find species with Replicate URLs but missing Supabase URLs
    console.log('Step 2: Finding species with missing Supabase storage...');
    const { data: speciesWithMissingStorage, error: queryError } = await supabase
      .from('species')
      .select('*')
      .or('and(image_url.not.is.null,supabase_image_url.is.null),and(video_url.not.is.null,supabase_video_url.is.null)');
    
    if (queryError) {
      throw new Error(`Failed to query species: ${queryError.message}`);
    }
    
    if (!speciesWithMissingStorage || speciesWithMissingStorage.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No species found with missing storage. All media is properly stored.',
        fixed: 0,
        errors: []
      });
    }
    
    console.log(`Found ${speciesWithMissingStorage.length} species with missing storage`);
    
    // Step 3: Fix each species
    const results = {
      fixed: 0,
      errors: [] as string[]
    };
    
    for (const species of speciesWithMissingStorage) {
      try {
        console.log(`Fixing storage for: ${species.common_name}`);
        
        const updates: any = {};
        
        // Fix missing image storage
        if (species.image_url && !species.supabase_image_url) {
          try {
            console.log(`  - Downloading and storing image...`);
            const imageResult = await MediaStorageService.downloadAndStore(
              species.image_url,
              species.id,
              'image',
              species.common_name
            );
            
            updates.supabase_image_path = imageResult.path;
            updates.supabase_image_url = imageResult.publicUrl;
            console.log(`  ✅ Image stored successfully`);
          } catch (imageError) {
            const errorMsg = `Failed to store image for ${species.common_name}: ${imageError instanceof Error ? imageError.message : 'Unknown error'}`;
            console.error(`  ❌ ${errorMsg}`);
            results.errors.push(errorMsg);
          }
        }
        
        // Fix missing video storage
        if (species.video_url && !species.supabase_video_url) {
          try {
            console.log(`  - Downloading and storing video...`);
            const videoResult = await MediaStorageService.downloadAndStore(
              species.video_url,
              species.id,
              'video',
              species.common_name
            );
            
            updates.supabase_video_path = videoResult.path;
            updates.supabase_video_url = videoResult.publicUrl;
            console.log(`  ✅ Video stored successfully`);
          } catch (videoError) {
            const errorMsg = `Failed to store video for ${species.common_name}: ${videoError instanceof Error ? videoError.message : 'Unknown error'}`;
            console.error(`  ❌ ${errorMsg}`);
            results.errors.push(errorMsg);
          }
        }
        
        // Update database if we have any fixes
        if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date().toISOString();
          
          const { error: updateError } = await supabase
            .from('species')
            .update(updates)
            .eq('id', species.id);
          
          if (updateError) {
            const errorMsg = `Failed to update database for ${species.common_name}: ${updateError.message}`;
            console.error(`  ❌ ${errorMsg}`);
            results.errors.push(errorMsg);
          } else {
            results.fixed++;
            console.log(`  ✅ Database updated for ${species.common_name}`);
          }
        }
        
      } catch (error) {
        const errorMsg = `Failed to process ${species.common_name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`❌ ${errorMsg}`);
        results.errors.push(errorMsg);
      }
    }
    
    // Step 4: Get final storage stats
    const stats = await MediaStorageService.getStorageStats();
    
    console.log('🎉 Storage fix process completed!');
    console.log(`Fixed: ${results.fixed} species`);
    console.log(`Errors: ${results.errors.length}`);
    console.log(`Storage stats:`, stats);
    
    return NextResponse.json({
      success: true,
      message: `Storage fix completed. Fixed ${results.fixed} species with ${results.errors.length} errors.`,
      fixed: results.fixed,
      errors: results.errors,
      stats
    });
    
  } catch (error) {
    console.error('❌ Storage fix process failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Storage fix process failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Just return current storage stats and any issues
    const stats = await MediaStorageService.getStorageStats();
    
    // Check for species with missing storage
    const { data: speciesWithMissingStorage, error: queryError } = await supabase
      .from('species')
      .select('id, common_name, image_url, video_url, supabase_image_url, supabase_video_url')
      .or('and(image_url.not.is.null,supabase_image_url.is.null),and(video_url.not.is.null,supabase_video_url.is.null)');
    
    if (queryError) {
      throw new Error(`Failed to query species: ${queryError.message}`);
    }
    
    const missingCount = speciesWithMissingStorage?.length || 0;
    
    return NextResponse.json({
      success: true,
      stats,
      issues: {
        speciesWithMissingStorage: missingCount,
        needsFixing: missingCount > 0
      },
      message: missingCount > 0 
        ? `Found ${missingCount} species with missing storage. Run POST /api/admin/fix-storage to fix.`
        : 'All media is properly stored in Supabase Storage.'
    });
    
  } catch (error) {
    console.error('Error checking storage status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check storage status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}