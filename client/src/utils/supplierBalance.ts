export type SupplierBalanceTone = 'danger' | 'success' | 'neutral';

export function getSupplierBalancePresentation(value: number | string | null | undefined) {
  const balance = Number(value || 0);

  if (balance > 0) {
    return { label: 'К оплате поставщику', amount: balance, tone: 'danger' as const };
  }
  if (balance < 0) {
    return { label: 'Аванс у поставщика', amount: Math.abs(balance), tone: 'success' as const };
  }
  return { label: 'Расчёты закрыты', amount: 0, tone: 'neutral' as const };
}
