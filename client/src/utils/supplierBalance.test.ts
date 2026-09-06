import { getSupplierBalancePresentation } from './supplierBalance';

test('presents debt, advance and settled supplier balances unambiguously', () => {
  expect(getSupplierBalancePresentation(4950)).toEqual({
    label: 'К оплате поставщику',
    amount: 4950,
    tone: 'danger',
  });
  expect(getSupplierBalancePresentation(-95050)).toEqual({
    label: 'Аванс у поставщика',
    amount: 95050,
    tone: 'success',
  });
  expect(getSupplierBalancePresentation(0)).toEqual({
    label: 'Расчёты закрыты',
    amount: 0,
    tone: 'neutral',
  });
});
