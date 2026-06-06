import React from 'react';
import { OrderDraftBanner } from './OrderDraftBanner';
import CreateOrderModal from './CreateOrderModal';

/** Глобальный черновик заявки: баннер + модалка (вне размонтируемых страниц) */
export const GlobalOrderDraft: React.FC = () => (
  <>
    <OrderDraftBanner />
    <CreateOrderModal />
  </>
);
