type SearchableProduct = {
  name: string;
  article: string;
  internalName?: string | null;
  kaspiName?: string | null;
  kaspiArticle?: string | null;
  marketplaceListings?: Array<{ productCode?: string | null }>;
};

function normalizeProductSearch(value: string): string {
  return value.trim().toLocaleLowerCase('ru-RU').replace(/\s+/g, ' ');
}

export function matchesProductSearch(product: SearchableProduct, search: string): boolean {
  const normalizedSearch = normalizeProductSearch(search);
  if (!normalizedSearch) return true;

  const tokens = Array.from(new Set(normalizedSearch.split(' ')));
  const searchableValues = [
    product.name,
    product.article,
    product.internalName,
    product.kaspiName,
    product.kaspiArticle,
    ...(product.marketplaceListings || []).map((listing) => listing.productCode),
  ].map((value) => normalizeProductSearch(value || ''));

  return tokens.every((token) => searchableValues.some((value) => value.includes(token)));
}

export function filterProductsBySearch<T extends SearchableProduct>(products: T[], search: string): T[] {
  if (!normalizeProductSearch(search)) return products;
  return products.filter((product) => matchesProductSearch(product, search));
}
