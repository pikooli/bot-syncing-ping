// This is a storage and a queue system for the bot
// it not optimized for performance, but for simplicity and ease of use
// It is used to store the transactions; the block numbers; and the state of if we have pong

import { createClient } from '@supabase/supabase-js';
import { BLOCK_NUMBER_USAGE, QUEUE_STATE } from '@/constants';
import { logger } from './logger';

interface DbStorage {
  hash: `0x${string}`;
  state: (typeof QUEUE_STATE)[keyof typeof QUEUE_STATE];
  block: number;
  done: boolean;
  nonce?: number;
  attempt?: number;
  last_tx_hash?: `0x${string}`;
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
  items: {
    hash: `0x${string}`;
    block: number;
    nonce?: number;
    attempt: number;
    last_tx_hash: string;
  }[],
) => {
  const { data, error } = await supabase.from('storage').upsert(
    items.map((item) => ({
      hash: item.hash,
      state: QUEUE_STATE.COMPLETED,
      done: true,
      block: item.block,
      nonce: item.nonce,
      attempt: item.attempt,
      last_tx_hash: item.last_tx_hash,
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

const updateDbStorage = async ({
  hash,
  nonce,
  attempt,
  last_tx_hash,
  state,
  done,
}: Partial<DbStorage> & { hash: `0x${string}` }) => {
  const entryData: Partial<DbStorage> = {};
  if (nonce) {
    entryData.nonce = nonce;
  }
  if (attempt) {
    entryData.attempt = attempt;
  }
  if (last_tx_hash) {
    entryData.last_tx_hash = last_tx_hash;
  }
  if (state) {
    entryData.state = state;
  }
  if (done) {
    entryData.done = done;
  }
  const { data, error } = await supabase
    .from('storage')
    .update(entryData)
    .eq('hash', hash);
  if (error) {
    logger.error('[updateDbStorage] Error updating storage', error);
    throw error;
  }
  return data;
};

const updateDbStorageModeCompleted = async ({
  hash,
  nonce,
  attempt,
  last_tx_hash,
}: {
  hash: `0x${string}`;
  nonce: number;
  attempt: number;
  last_tx_hash: string;
}) => {
  const { data, error } = await supabase
    .from('storage')
    .update({
      state: QUEUE_STATE.COMPLETED,
      done: true,
      nonce,
      attempt,
      last_tx_hash,
    })
    .eq('hash', hash);
  if (error) {
    logger.error(
      '[updateDbStorageModeCompleted] Error updating storage',
      error,
    );
    throw error;
  }
  return data;
};

const findInDbStorage = async ({ block }: { block?: number }) => {
  let query = supabase
    .from('storage')
    .select('*')
    .order('block', { ascending: true });
  if (block) {
    query = query.gte('block', block);
  }
  const { data, error } = await query;

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

export const cleanDB = async () => {
  await supabase.from('storage').delete().neq('id', 0);
  await supabase.from('blockNumber').delete().neq('id', 0);
};

export const supabaseDb = {
  storage: {
    insertIntoDbStorageModeQueue: insertIntoDbStorageModeQueue,
    insertIntoDbStorageModeDone: insertIntoDbStorageModeDone,
    updateDbStorageModeCompleted: updateDbStorageModeCompleted,
    updateDbStorage: updateDbStorage,
    findInDbStorage: findInDbStorage,
    findInDbStorageFirstQueue: findInDbStorageFirstQueue,
  },
  blockNumber: {
    addBlockNumber: addBlockNumber,
    findBlockNumber: findBlockNumber,
  },
};
