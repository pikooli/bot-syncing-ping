import { createClient } from '@supabase/supabase-js';
import { BLOCK_NUMBER_USAGE } from '@/constants';
import { logger } from './logger';

interface DbStorage {
  hash: `0x${string}`;
}
export const supabase = createClient(
  process.env['SUPABASE_URL'] ?? '',
  process.env['SUPABASE_SECRET_KEY'] ?? '',
);

export const insertIntoDbStorage = async (hashs: string[]) => {
  const { data, error } = await supabase.from('storage').upsert(
    hashs.map((hash) => ({ hash })),
    {
      onConflict: 'hash',
    },
  );
  if (error) {
    logger.error('[insertIntoDbStorage] Error inserting into storage', error);
    throw error;
  }
  return data;
};

export const findInDbStorage = async () => {
  const { data, error } = await supabase.from('storage').select('*');
  if (error) {
    logger.error('[findInDbStorage] Error finding in storage', error);
  }
  return data as DbStorage[];
};

interface DbBlockNumber {
  block: number;
  usage: (typeof BLOCK_NUMBER_USAGE)[keyof typeof BLOCK_NUMBER_USAGE];
}

export const addBlockNumber = async (
  block: number,
  usage: (typeof BLOCK_NUMBER_USAGE)[keyof typeof BLOCK_NUMBER_USAGE],
) => {
  const { data, error } = await supabase
    .from('blockNumber')
    .upsert({ block, usage }, { onConflict: 'usage' });
  if (error) {
    logger.error('[addBlockNumber] Error adding block number', error);
    throw error;
  }
  return data;
};

export const findBlockNumber = async (
  usage: (typeof BLOCK_NUMBER_USAGE)[keyof typeof BLOCK_NUMBER_USAGE],
) => {
  const { data, error } = await supabase
    .from('blockNumber')
    .select('*')
    .eq('usage', usage);
  if (error) {
    logger.error('[findBlockNumber] Error finding storage block', error);
    throw error;
  }
  return data as DbBlockNumber[];
};
