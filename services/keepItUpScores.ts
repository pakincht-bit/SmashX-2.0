import { supabase } from './supabaseClient';

export interface KeepItUpScore {
  userId: string;
  bestScore: number;
}

/** Highest first; on a tie, whoever reached the score first ranks higher. */
export async function fetchKeepItUpScores(): Promise<KeepItUpScore[]> {
  const { data, error } = await supabase
    .from('keep_it_up_scores')
    .select('user_id, best_score')
    .order('best_score', { ascending: false })
    .order('updated_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(row => ({ userId: row.user_id, bestScore: row.best_score }));
}

/** Saves a score (the server keeps the highest) and returns the stored best, or null on failure. */
export async function submitKeepItUpScore(score: number): Promise<number | null> {
  const { data, error } = await supabase.rpc('submit_keep_it_up_score', { p_score: score });
  if (error) {
    console.error('SX: Failed to save Keep It Up score:', error.message);
    return null;
  }
  return data;
}
