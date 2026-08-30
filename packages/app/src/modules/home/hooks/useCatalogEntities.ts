import useAsync from 'react-use/esm/useAsync';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import type { Entity } from '@backstage/catalog-model';
import type { EntityFilterQuery } from '@backstage/catalog-client';

/** Fields fetched for list cards -- enough to render, nothing more. */
const LIST_FIELDS = [
  'kind',
  'metadata.name',
  'metadata.namespace',
  'metadata.title',
  'metadata.description',
  'metadata.annotations',
  'spec.type',
  'spec.lifecycle',
  'spec.owner',
];

/**
 * Queries the real catalog.
 *
 * Returns `undefined` filters as a no-op so callers can wait for a dependency
 * (such as the signed-in user's ownership refs) before querying.
 */
export function useCatalogEntities(options: {
  filter?: EntityFilterQuery;
  limit?: number;
  enabled?: boolean;
}) {
  const { filter, limit = 8, enabled = true } = options;
  const catalogApi = useApi(catalogApiRef);
  const filterKey = JSON.stringify(filter ?? null);

  return useAsync(async (): Promise<{
    entities: Entity[];
    total: number;
  }> => {
    if (!enabled) {
      return { entities: [], total: 0 };
    }

    const response = await catalogApi.getEntities({
      filter,
      fields: LIST_FIELDS,
    });

    return {
      entities: response.items.slice(0, limit),
      total: response.items.length,
    };
    // filterKey stands in for the structural identity of `filter`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogApi, filterKey, limit, enabled]);
}
