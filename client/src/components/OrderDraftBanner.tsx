import React from 'react';
import { useLocation } from 'react-router-dom';
import { FileText, X, ArrowRight } from 'lucide-react';
import { useOrderDraft } from '../context/OrderDraftContext';
import { useConfirmDialog } from '../context/ConfirmDialogContext';
import { isDraftResumeLocation } from '../utils/orderDraftStorage';
import { formatPriceKZT } from '../utils/format';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';

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
  const { confirm } = useConfirmDialog();

  if (!hasDraft || !draft || isModalOpen) return null;

  if (isDraftResumeLocation(draft, location.pathname)) return null;

  const typeLabel = draft.type === 'return' ? 'возврата' : 'заявки';
  const continueLabel = draft.origin === 'modal' ? 'Открыть' : 'Продолжить';

  return (
    <div className="sticky top-0 z-20 flex-shrink-0 bg-brand-white border-b border-border shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 md:px-6 py-3 border-l-4 border-brand-yellow max-w-[1600px] mx-auto w-full">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-yellow/15 flex-shrink-0">
            <FileText className="h-5 w-5 text-brand-yellow-dark" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-black truncate">
              Черновик {typeLabel}
              {draft.supplierName ? `: ${draft.supplierName}` : ''}
            </p>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {draftProductCount} товар(ов) · {formatPriceKZT(draftTotal)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
          <Button
            type="button"
            onClick={continueDraft}
            size="sm"
            rightIcon={ArrowRight}
            className="flex-1 sm:flex-initial"
          >
            {continueLabel}
          </Button>
          <IconButton
            icon={X}
            title="Удалить черновик"
            variant="ghost"
            size="md"
            onClick={async () => {
              const ok = await confirm({
                title: 'Удалить черновик',
                message: 'Удалить черновик заявки?',
                confirmLabel: 'Удалить',
                variant: 'danger',
              });
              if (ok) clearDraft();
            }}
          />
        </div>
      </div>
    </div>
  );
};
