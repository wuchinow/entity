import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Demo images for testing (using placeholder service)
const demoImages = [
  'https://picsum.photos/800/600?random=1',
  'https://picsum.photos/800/600?random=2',
  'https://picsum.photos/800/600?random=3',
  'https://picsum.photos/800/600?random=4',
  'https://picsum.photos/800/600?random=5',
  'https://picsum.photos/800/600?random=6',
  'https://picsum.photos/800/600?random=7',
  'https://picsum.photos/800/600?random=8',
  'https://picsum.photos/800/600?random=9',
  'https://picsum.photos/800/600?random=10'
];

export async function POST(request: NextRequest) {
  let speciesId: string | null = null;
  
  try {
    const body = await request.json();
    speciesId = body.speciesId;

    if (!speciesId) {
      return NextResponse.json({ error: 'Species ID is required' }, { status: 400 });
    }

    // Get species data
    const { data: species, error: speciesError } = await supabase
      .from('species')
      .select('*')
      .eq('id', speciesId)
      .single();

    if (speciesError || !species) {
      return NextResponse.json({ error: 'Species not found' }, { status: 404 });
    }

    // Update status to generating
    await supabase
      .from('species')
      .update({ generation_status: 'generating_image' })
      .eq('id', speciesId);

    console.log(`Generating demo image for ${species.common_name}...`);

    // Simulate generation time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get a random demo image
    const imageUrl = demoImages[Math.floor(Math.random() * demoImages.length)];

    // Update species with generated image
    const { error: updateError } = await supabase
      .from('species')
      .update({ 
        image_url: imageUrl,
        generation_status: 'image_generated',
        updated_at: new Date().toISOString()
      })
      .eq('id', speciesId);

    if (updateError) {
      console.error('Error updating species with image:', updateError);
      return NextResponse.json({ error: 'Failed to save image' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      imageUrl,
      species: {
        ...species,
        image_url: imageUrl,
        generation_status: 'image_generated'
      }
    });

  } catch (error) {
    console.error('Error generating demo image:', error);
    
    // Update status to error
    if (speciesId) {
      try {
        await supabase
          .from('species')
          .update({ generation_status: 'error' })
          .eq('id', speciesId);
      } catch (e) {
        console.error('Error updating status to error:', e);
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate demo image' },
      { status: 500 }
    );
  }
}