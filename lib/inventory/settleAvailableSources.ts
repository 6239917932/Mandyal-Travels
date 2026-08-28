export async function settleAvailableSources<T>(
  sources: readonly (() => Promise<readonly T[]>)[],
  unavailableMessage: string,
): Promise<T[]> {
  const results = await Promise.allSettled(sources.map((source) => source()));

  if (results.every((result) => result.status === 'rejected')) {
    throw new Error(unavailableMessage);
  }

  return results
    .filter(
      (result): result is PromiseFulfilledResult<readonly T[]> => result.status === 'fulfilled',
    )
    .flatMap((result) => result.value);
}
