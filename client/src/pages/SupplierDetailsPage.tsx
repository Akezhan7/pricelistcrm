import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  DollarSign,
  FileText,
  Phone,
  MessageSquare,
  MapPin,
  Building2,
  MoreVertical,
  Image as ImageIcon,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { SupplierProductsPanel } from '../components/SupplierProductsPanel';
import { SupplierFinanceModal } from '../components/SupplierFinanceModal';
import { ReconciliationModal } from '../components/ReconciliationModal';
import { useAuth } from '../context/AuthContext';
import {
  Badge,
  Button,
  Card,
  CardBody,
  IconButton,
  Spinner,
} from '../components/ui';
import api from '../utils/api';
import getImageUrl from '../utils/image';
import { Supplier } from '../types';
import { formatPriceKZT } from '../utils/format';
import { cn } from '../utils/cn';

const darkCtaClass =
  'border-brand-black bg-brand-black text-white hover:border-gray-800 hover:bg-gray-800 hover:text-white';

export const SupplierDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'purchase_manager';

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFinance, setShowFinance] = useState(false);
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [showToolbarMenu, setShowToolbarMenu] = useState(false);
  const toolbarMenuRef = useRef<HTMLDivElement>(null);

  const fetchSupplier = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.get(`/suppliers/${id}`);
      setSupplier(res.data.data.supplier);
    } catch (error) {
      console.error('Ошибка загрузки поставщика:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplier();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!showToolbarMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarMenuRef.current && !toolbarMenuRef.current.contains(event.target as Node)) {
        setShowToolbarMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showToolbarMenu]);

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const el = e.currentTarget;
    el.onerror = null;
    el.src = '/placeholder.svg';
  };

  if (loading || !supplier) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Spinner size="lg" color="brand" />
          <p className="text-body text-text-muted">Загрузка поставщика...</p>
        </div>
      </Layout>
    );
  }

  const waPhone = (supplier.whatsapp || supplier.phone || '').replace(/\D/g, '');
  const locationLabel =
    supplier.row || supplier.container
      ? `${supplier.row ? `Ряд ${supplier.row}` : ''}${
          supplier.row && supplier.container ? ', ' : ''
        }${supplier.container ? `Контейнер ${supplier.container}` : ''}`
      : supplier.address || '—';

  const toolbarOverflowItems = [
    ...(canEdit
      ? [
          {
            key: 'finance',
            label: 'Финансы / оплата',
            icon: DollarSign,
            onClick: () => setShowFinance(true),
          },
        ]
      : []),
    {
      key: 'refresh',
      label: 'Обновить',
      icon: RefreshCw,
      onClick: fetchSupplier,
    },
  ];

  const sidebarContent = (
    <Card className="shadow-none hover:shadow-none overflow-hidden">
      {supplier.containerImage ? (
        <img
          src={getImageUrl(supplier.containerImage) || undefined}
          alt={`Контейнер ${supplier.name}`}
          className="w-full h-20 object-cover"
          onError={handleImgError}
        />
      ) : (
        <div className="w-full h-16 bg-surface-inset flex items-center justify-center">
          <ImageIcon className="h-6 w-6 text-text-muted" aria-hidden />
        </div>
      )}

      <CardBody className="space-y-4 p-4">
        <div className="space-y-2">
          {supplier.market && (
            <span className="inline-flex items-center gap-1.5 text-caption text-accent font-medium">
              <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {supplier.market.name}
            </span>
          )}
          <span className="flex items-start gap-1.5 text-caption text-text-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
            <span>{locationLabel}</span>
          </span>
          {supplier.sector && <Badge variant="info">{supplier.sector}</Badge>}
          {supplier.phone && (
            <a
              href={`tel:${supplier.phone}`}
              className="inline-flex items-center gap-1.5 text-caption text-text-muted hover:text-accent transition-colors"
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {supplier.phone}
            </a>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {waPhone && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={MessageSquare}
              onClick={() => window.open(`https://wa.me/${waPhone}`, '_blank')}
              className="w-full border-green-600/30 text-green-700 hover:bg-green-50"
            >
              WhatsApp
            </Button>
          )}
          {supplier.phone && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={Phone}
              onClick={() => window.open(`tel:${supplier.phone}`, '_self')}
              className="w-full"
            >
              Звонок
            </Button>
          )}
        </div>

        <div className="rounded-card border border-border-subtle bg-surface-inset p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-text-muted shrink-0" aria-hidden />
              <p className="text-caption font-medium text-text-muted">Задолженность</p>
            </div>
            <p
              className={cn(
                'text-price font-bold tabular-nums tracking-tight',
                Number(supplier.debt) > 0 ? 'text-danger' : 'text-brand-black'
              )}
            >
              {formatPriceKZT(supplier.debt)}
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );

  return (
    <Layout fullHeight>
      <div className="h-full flex flex-col gap-5 min-h-0">
        {/* Sticky top toolbar */}
        <div className="sticky top-0 z-10 -mx-4 px-4 pt-1 pb-4 md:static md:mx-0 md:px-0 md:pt-0 md:pb-0 bg-surface-page/95 backdrop-blur-sm border-b border-border-subtle md:border-0 space-y-4 flex-shrink-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={ArrowLeft}
                onClick={() => navigate('/suppliers')}
                className="mb-2 px-0 hover:bg-transparent text-text-muted hover:text-brand-black"
              >
                Назад к поставщикам
              </Button>
              <h1 className="text-h1 font-bold tracking-tight text-brand-black sm:text-display truncate">
                {supplier.name}
              </h1>
              <p className="mt-1 text-body text-text-muted hidden sm:block">
                Каталог, цены и оформление заявок
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2 md:hidden">
                {canEdit && (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={DollarSign}
                    onClick={() => setShowFinance(true)}
                  >
                    Финансы
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={FileText}
                  onClick={() => setShowReconciliation(true)}
                  className={darkCtaClass}
                >
                  Сверка
                </Button>
                {toolbarOverflowItems.length > 0 && (
                  <div className="relative" ref={toolbarMenuRef}>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={MoreVertical}
                      onClick={() => setShowToolbarMenu((prev) => !prev)}
                      aria-expanded={showToolbarMenu}
                      aria-haspopup="menu"
                    >
                      Ещё
                    </Button>
                    {showToolbarMenu && (
                      <div
                        role="menu"
                        className="absolute right-0 top-full z-20 mt-2 min-w-[12rem] rounded-xl border border-border-subtle bg-brand-white py-1 shadow-card"
                      >
                        {toolbarOverflowItems.map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              item.onClick();
                              setShowToolbarMenu(false);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-brand-black hover:bg-surface-inset transition-colors text-left"
                          >
                            <item.icon className="w-4 h-4 flex-shrink-0 text-text-muted" />
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="hidden md:flex flex-wrap items-center justify-end gap-2">
                {canEdit && (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={DollarSign}
                    onClick={() => setShowFinance(true)}
                  >
                    Финансы / оплата
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={FileText}
                  onClick={() => setShowReconciliation(true)}
                  className={darkCtaClass}
                >
                  Сверка
                </Button>
                <IconButton
                  icon={RefreshCw}
                  title="Обновить"
                  size="md"
                  variant="default"
                  onClick={fetchSupplier}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Two-column: catalog + sidebar */}
        <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">
          {/* Main — catalog */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col order-2 lg:order-1">
            <Card className="flex flex-col flex-1 min-h-0 shadow-none hover:shadow-none">
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 min-h-0 flex flex-col mx-3 mb-3 md:mx-4 md:mb-4 rounded-xl bg-surface-inset border border-border-subtle overflow-hidden">
                  <SupplierProductsPanel
                    supplier={supplier}
                    canCreate={canEdit}
                    canEdit={canEdit}
                    onOrderSuccess={fetchSupplier}
                    mobileActionBarAtBottom
                    showSupplierHeader={false}
                    layout="grid"
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar — supplier info */}
          <aside className="w-full lg:w-[270px] shrink-0 order-1 lg:order-2 lg:sticky lg:top-4 lg:self-start">
            {sidebarContent}
          </aside>
        </div>
      </div>

      <SupplierFinanceModal
        isOpen={showFinance}
        onClose={() => setShowFinance(false)}
        supplierId={supplier.id}
        supplierName={supplier.name}
        onSuccess={fetchSupplier}
      />

      <ReconciliationModal
        isOpen={showReconciliation}
        onClose={() => setShowReconciliation(false)}
        supplierId={supplier.id}
        supplierName={supplier.name}
      />
    </Layout>
  );
};
