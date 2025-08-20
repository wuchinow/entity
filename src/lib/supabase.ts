import { createClient } from '@supabase/supabase-js';
import { Species, GenerationQueue, SystemState } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: !!supabaseUrl,
    anonKey: !!supabaseAnonKey,
    serviceKey: !!supabaseServiceKey
  });
}

// Client for frontend operations - only create if we have valid credentials
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Admin client for server-side operations - only create if we have valid credentials
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Database table names
export const TABLES = {
  SPECIES: 'species',
  GENERATION_QUEUE: 'generation_queue',
  SYSTEM_STATE: 'system_state',
} as const;

// Type-safe database operations
export class SupabaseService {
  // Species operations
  static async getAllSpecies(): Promise<Species[]> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return [];
    }
    
    const { data, error } = await supabase
      .from(TABLES.SPECIES)
      .select('*')
      .order('display_order', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  static async getSpeciesById(id: string): Promise<Species | null> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return null;
    }
    
    const { data, error } = await supabase
      .from(TABLES.SPECIES)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async updateSpecies(id: string, updates: Partial<Species>): Promise<Species> {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized');
    }
    
    const { data, error } = await supabaseAdmin
      .from(TABLES.SPECIES)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async insertSpecies(species: Omit<Species, 'id' | 'created_at'>[]): Promise<Species[]> {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized');
    }
    
    const { data, error } = await supabaseAdmin
      .from(TABLES.SPECIES)
      .insert(species)
      .select();
    
    if (error) throw error;
    return data || [];
  }

  static async deleteAllSpecies(): Promise<void> {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized');
    }
    
    const { error } = await supabaseAdmin
      .from(TABLES.SPECIES)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (error) throw error;
  }

  // Generation queue operations
  static async addToQueue(queueItem: Omit<GenerationQueue, 'id'>): Promise<GenerationQueue> {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized');
    }
    
    const { data, error } = await supabaseAdmin
      .from(TABLES.GENERATION_QUEUE)
      .insert(queueItem)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getQueuedItems(): Promise<GenerationQueue[]> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return [];
    }
    
    const { data, error } = await supabase
      .from(TABLES.GENERATION_QUEUE)
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  static async updateQueueItem(id: string, updates: Partial<GenerationQueue>): Promise<GenerationQueue> {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized');
    }
    
    const { data, error } = await supabaseAdmin
      .from(TABLES.GENERATION_QUEUE)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // System state operations
  static async getSystemState(): Promise<SystemState | null> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return null;
    }
    
    const { data, error } = await supabase
      .from(TABLES.SYSTEM_STATE)
      .select('*')
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data;
  }

  static async updateSystemState(updates: Partial<SystemState>): Promise<SystemState> {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized');
    }
    
    const existingState = await this.getSystemState();
    
    if (existingState) {
      const { data, error } = await supabaseAdmin
        .from(TABLES.SYSTEM_STATE)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', existingState.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabaseAdmin
        .from(TABLES.SYSTEM_STATE)
        .insert({
          ...updates,
          total_species: 0,
          completed_species: 0,
          is_cycling: false,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  }

  // Real-time subscriptions
  static subscribeToSpecies(callback: (payload: any) => void) {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return { unsubscribe: () => {} };
    }
    
    return supabase
      .channel('species-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: TABLES.SPECIES },
        callback
      )
      .subscribe();
  }

  static subscribeToSystemState(callback: (payload: any) => void) {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return { unsubscribe: () => {} };
    }
    
    return supabase
      .channel('system-state-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: TABLES.SYSTEM_STATE },
        callback
      )
      .subscribe();
  }
}