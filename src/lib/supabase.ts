import { createClient } from '@supabase/supabase-js';
import { BLOCK_NUMBER_USAGE, QUEUE_STATE } from '@/constants';
import { logger } from './logger';

interface DbStorage {
  hash: `0x${string}`;
  state: (typeof QUEUE_STATE)[keyof typeof QUEUE_STATE];
  block: number;
}

const supabase = createClient(
  process.env['SUPABASE_URL'] ?? '',
  process.env['SUPABASE_SECRET_KEY'] ?? '',
);

const insertIntoDbStorageModeQueue = async (
  items: { hash: `0x${string}`; block: number }[],
) => {
  const { data, error } = await supabase.from('storage').upsert(
    items.map((item) => ({
      hash: item.hash,
      state: QUEUE_STATE.PENDING,
      block: item.block,
      done: false,
    })),
    {
      onConflict: 'hash',
      ignoreDuplicates: true,
    },
  );
  if (error) {
    logger.error('[insertIntoDbStorage] Error inserting into storage', error);
    throw error;
  }
  return data;
};

const insertIntoDbStorageModeDone = async (
  items: { hash: `0x${string}`; block: number }[],
) => {
  const { data, error } = await supabase.from('storage').upsert(
    items.map((item) => ({
      hash: item.hash,
      state: QUEUE_STATE.COMPLETED,
      done: true,
      block: item.block,
    })),
    {
      onConflict: 'hash',
      ignoreDuplicates: true,
    },
  );
  if (error) {
    logger.error(
      '[insertIntoDbStorageModeDone] Error inserting into storage',
      error,
    );
    throw error;
  }
  return data;
};

const updateDbStorageModeCompleted = async (hash: string) => {
  const { data, error } = await supabase
    .from('storage')
    .update({ state: QUEUE_STATE.COMPLETED, done: true })
    .eq('hash', hash);
  console.log('data ==========', data);
  if (error) {
    logger.error(
      '[updateDbStorageModeCompleted] Error updating storage',
      error,
    );
    throw error;
  }
  return data;
};

const findInDbStorage = async () => {
  const { data, error } = await supabase.from('storage').select('*');
  if (error) {
    logger.error('[findInDbStorage] Error finding in storage', error);
  }
  return data as DbStorage[];
};

const findInDbStorageFirstQueue = async () => {
  const { data, error } = await supabase
    .from('storage')
    .select('*')
    .eq('state', QUEUE_STATE.PENDING)
    .eq('done', false)
    .order('block', { ascending: true })
    .limit(1);
  if (error) {
    logger.error('[findInDbStorageModeQueue] Error finding in storage', error);
  }
  return data as DbStorage[];
};

interface DbBlockNumber {
  block: number;
  usage: (typeof BLOCK_NUMBER_USAGE)[keyof typeof BLOCK_NUMBER_USAGE];
}

const addBlockNumber = async (
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

const findBlockNumber = async (
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

export const supabaseDb = {
  storage: {
    insertIntoDbStorageModeQueue: insertIntoDbStorageModeQueue,
    insertIntoDbStorageModeDone: insertIntoDbStorageModeDone,
    updateDbStorageModeCompleted: updateDbStorageModeCompleted,
    findInDbStorage: findInDbStorage,
    findInDbStorageFirstQueue: findInDbStorageFirstQueue,
  },
  blockNumber: {
    addBlockNumber: addBlockNumber,
    findBlockNumber: findBlockNumber,
  },
};
