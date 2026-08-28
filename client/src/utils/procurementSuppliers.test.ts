import { getRelevantProcurementSuppliers } from './procurementSuppliers';

describe('procurement supplier choices', () => {
  const tahir = { id: 1, name: 'Тахир' };
  const abdulla = { id: 2, name: 'Абдулла' };
  const karim = { id: 3, name: 'Карим' };

  it('puts the recommendation first and deduplicates linked suppliers', () => {
    expect(getRelevantProcurementSuppliers({
      linkedSuppliers: [tahir, abdulla],
      recommendedSupplier: tahir,
      selectedSupplier: null,
    })).toEqual([tahir, abdulla]);
  });

  it('keeps a previously selected unlinked supplier visible', () => {
    expect(getRelevantProcurementSuppliers({
      linkedSuppliers: [abdulla],
      recommendedSupplier: null,
      selectedSupplier: karim,
    })).toEqual([abdulla, karim]);
  });
});
