import { logger } from '@/lib/logger';

const BUMP_FACTOR = 1.1;

export function toJsonSafe<T>(obj: T): string {
  return JSON.stringify(
    obj,
    (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
    2,
  );
}

export const batchCall = async <T>(
  items: Array<any>,
  fn: (item: any) => Promise<T>,
  batchSize: number = 10,
): Promise<Array<T>> => {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    logger.info(`[batchCall] batching ${i} to ${i + batchSize}`);
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
};

export const bumpFees = (fees: {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}) => {
  return {
    maxFeePerGas: BigInt(Math.ceil(Number(fees.maxFeePerGas) * BUMP_FACTOR)),
    maxPriorityFeePerGas: BigInt(
      Math.ceil(Number(fees.maxPriorityFeePerGas) * BUMP_FACTOR),
    ),
  };
};

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
