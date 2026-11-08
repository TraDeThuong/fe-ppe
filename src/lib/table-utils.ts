export type ListPage<T> = { items: T[]; meta?: { totalPages?: number; total?: number } };
/** Fetch a complete small catalog; never publish a partial list as a complete one. */
export async function collectCatalog<T>(fetchPage: (page: number, limit: number) => Promise<ListPage<T>>): Promise<T[]> {
  const first = await fetchPage(1, 100);
  const items = [...first.items];
  if (!first.meta?.totalPages && first.meta?.total && first.meta.total > items.length) throw new Error("Missing catalog pagination metadata");
  for (let page = 2;page <= (first.meta?.totalPages ?? 1);page += 3) {
    const pages = await Promise.all(Array.from({ length: Math.min(3, first.meta!.totalPages! - page + 1) }, (_, i) => fetchPage(page + i, 100)));
    for (const result of pages) items.push(...result.items);
  }
  return items;
}
export async function settleInBatches<T>(items: readonly T[], run: (item: T) => Promise<unknown>, concurrency = 3) {
  const results: PromiseSettledResult<unknown>[] = [];
  for (let start = 0;start < items.length;start += concurrency) results.push(...await Promise.allSettled(items.slice(start, start + concurrency).map(run)));
  return { succeeded: items.filter((_, i) => results[i].status === "fulfilled"), failed: items.filter((_, i) => results[i].status === "rejected") };
}

/** Translate display-column IDs to an API allowlist; an unknown/cleared sort uses the endpoint default. */
export function mapTableSort<const T extends string>(
  sorting: readonly { id: string; desc: boolean }[],
  fields: Readonly<Record<string, T>>,
  fallback: { sortBy: T; order: "asc" | "desc" },
): { sortBy: T; order: "asc" | "desc" } {
  const first = sorting[0];
  const sortBy = first && Object.prototype.hasOwnProperty.call(fields, first.id) ? fields[first.id] : undefined;
  return sortBy ? { sortBy, order: first.desc ? "desc" : "asc" } : fallback;
}
