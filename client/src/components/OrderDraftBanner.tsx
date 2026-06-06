import React from 'react';
import { useLocation } from 'react-router-dom';
import { FileText, X, ArrowRight } from 'lucide-react';
import { useOrderDraft } from '../context/OrderDraftContext';
import { isDraftResumeLocation } from '../utils/orderDraftStorage';

export const OrderDraftBanner: React.FC = () => {
  const location = useLocation();
  const {
    draft,
    hasDraft,
    isModalOpen,
    draftTotal,
    draftProductCount,
    continueDraft,
    clearDraft,
  } = useOrderDraft();

  if (!hasDraft || !draft || isModalOpen) return null;

  if (isDraftResumeLocation(draft, location.pathname)) return null;

  const typeLabel = draft.type === 'return' ? 'возврата' : 'заявки';
  const continueLabel = draft.origin === 'modal' ? 'Открыть' : 'Продолжить';

  return (
    <div className="flex-shrink-0 bg-yellow-50 border-b border-yellow-300 px-4 py-2.5 flex items-center justify-between gap-3 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="h-5 w-5 text-yellow-700 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            Черновик {typeLabel}
            {draft.supplierName ? `: ${draft.supplierName}` : ''}
          </p>
          <p className="text-xs text-gray-600">
            {draftProductCount} товар(ов) · {draftTotal.toLocaleString('ru-RU')} ₸
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={continueDraft}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg transition-colors"
        >
          {continueLabel}
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Удалить черновик заявки?')) {
              clearDraft();
            }
          }}
          className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-yellow-100 rounded-lg transition-colors"
          title="Удалить черновик"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
