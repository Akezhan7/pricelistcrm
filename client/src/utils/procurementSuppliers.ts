type SupplierRef = {
  id: number;
  name: string;
};

type RelevantProcurementSuppliersInput<T extends SupplierRef> = {
  linkedSuppliers?: T[];
  recommendedSupplier?: T | null;
  selectedSupplier?: T | null;
};

export function getRelevantProcurementSuppliers<T extends SupplierRef>({
  linkedSuppliers = [],
  recommendedSupplier = null,
  selectedSupplier = null,
}: RelevantProcurementSuppliersInput<T>): T[] {
  const result: T[] = [];
  const seen = new Set<number>();
  const add = (supplier: T | null) => {
    if (!supplier || seen.has(supplier.id)) return;
    seen.add(supplier.id);
    result.push(supplier);
  };

  add(recommendedSupplier);
  [...linkedSuppliers]
    .sort((left, right) => left.name.localeCompare(right.name, 'ru'))
    .forEach(add);
  add(selectedSupplier);

  return result;
}
