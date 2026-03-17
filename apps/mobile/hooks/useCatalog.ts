import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../lib/api';

interface CatalogCategory {
  id: string;
  name: string;
  display_name: string;
  icon_name: string | null;
  sort_order: number;
}

interface CatalogItem {
  id: string;
  category_id: string | null;
  title: string;
  image_path: string;
  thumbnail_path: string | null;
  image_url?: string;
  thumbnail_url?: string;
  tags: string[];
  gender: string;
  popularity: number;
  category?: CatalogCategory;
}

export function useCatalog() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'popularity' | 'created_at'>('popularity');
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort: sortBy, limit: '50' });
      if (categoryId) params.set('category_id', categoryId);
      const res = await apiGet<{ items: CatalogItem[] }>(`/api/catalog?${params}`);
      setItems(res.items);
    } catch (err) {
      console.error('Failed to fetch catalog:', err);
    } finally {
      setLoading(false);
    }
  }, [sortBy, categoryId]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  return { items, loading, sortBy, setSortBy, categoryId, setCategoryId, refetch: fetchCatalog };
}
