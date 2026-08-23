import React, { useState } from 'react';
import { FileText, Download } from 'lucide-react';
import suppliersApi, { ReconciliationReport } from '../services/suppliersApi';
import { generateReconciliationPDF } from '../utils/pdfGenerator';
import {
  Alert,
  Button,
  Card,
  CardBody,
  EmptyState,
  FormFooter,
  Input,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from './ui';
import { toast } from '../context/ToastContext';
import { formatPriceKZT } from '../utils/format';

interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId: number;
  supplierName: string;
}

const formatDate = (s: string) => new Date(s).toLocaleDateString('ru-RU');

export const ReconciliationModal: React.FC<ReconciliationModalProps> = ({
  isOpen,
  onClose,
  supplierId,
  supplierName,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthAgoStr = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  })();

  const [from, setFrom] = useState(monthAgoStr);
  const [to, setTo] = useState(todayStr);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [downloading, setDownloading] = useState(false);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await suppliersApi.getReconciliation(supplierId, from, to);
      setReport(data);
    } catch (e: any) {
      setError(e.message || 'Ошибка получения отчёта сверки');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!report) return;
    try {
      setDownloading(true);
      await generateReconciliationPDF(report);
    } catch (e) {
      console.error(e);
      toast.error('Ошибка при формировании PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleClose = () => {
    setReport(null);
    setError(null);
    onClose();
  };

  const kindLabel: Record<string, string> = {
    purchase: 'Поставка',
    return: 'Возврат',
    payment: 'Оплата',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Акт сверки — ${supplierName}`}
      size="xl"
      footer={<FormFooter onCancel={handleClose} cancelLabel="Закрыть" showSubmit={false} />}
    >
      <Card variant="inset" className="mb-4 shadow-none">
        <CardBody className="flex flex-wrap items-end gap-3 p-4">
          <Input
            label="С"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-auto min-w-[10rem]"
          />
          <Input
            label="По"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-auto min-w-[10rem]"
          />
          <Button
            type="button"
            variant="primary"
            onClick={loadReport}
            disabled={loading}
            leftIcon={loading ? undefined : FileText}
            loading={loading}
          >
            Сформировать
          </Button>
          {report && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleDownload}
              disabled={downloading}
              leftIcon={downloading ? undefined : Download}
              loading={downloading}
            >
              Скачать PDF
            </Button>
          )}
        </CardBody>
      </Card>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {report && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              { label: 'Сальдо на начало', value: formatPriceKZT(report.openingBalance) },
              { label: 'Сальдо на конец', value: formatPriceKZT(report.closingBalance) },
              { label: 'Оплачено за период', value: formatPriceKZT(report.totals.payment) },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl border border-border-subtle border-l-[3px] border-l-brand-yellow bg-brand-white p-4"
              >
                <p className="text-overline text-text-muted">{label}</p>
                <p className="mt-1 text-metric font-tabular text-brand-black">{value}</p>
              </div>
            ))}
          </div>

          <Card className="overflow-hidden">
            <Table>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeaderCell>Дата</TableHeaderCell>
                  <TableHeaderCell>Тип</TableHeaderCell>
                  <TableHeaderCell>Документ</TableHeaderCell>
                  <TableHeaderCell className="text-right">Поставка</TableHeaderCell>
                  <TableHeaderCell className="text-right">Возврат</TableHeaderCell>
                  <TableHeaderCell className="text-right">Оплата</TableHeaderCell>
                  <TableHeaderCell className="text-right">Баланс</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.movements.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="py-8 text-center text-text-muted">
                      За выбранный период движений нет
                    </TableCell>
                  </TableRow>
                ) : (
                  report.movements.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="tabular-nums">{formatDate(m.date)}</TableCell>
                      <TableCell>{kindLabel[m.kind] || m.kind}</TableCell>
                      <TableCell className="text-body-medium text-brand-black">
                        <div>{m.documentNumber}</div>
                        {m.comment && (
                          <div className="mt-1 text-caption font-normal text-text-muted">
                            {m.comment}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.purchase ? formatPriceKZT(m.purchase) : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-warning-dark">
                        {m.returned ? formatPriceKZT(m.returned) : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-success-dark">
                        {m.payment ? formatPriceKZT(m.payment) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-brand-black">
                        {formatPriceKZT(m.balance)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="border-t border-border-subtle bg-brand-black px-4 py-3">
              <div className="grid grid-cols-7 gap-2 text-caption font-semibold text-brand-white">
                <div className="col-span-3 text-right">ИТОГО</div>
                <div className="text-right tabular-nums">{formatPriceKZT(report.totals.purchase)}</div>
                <div className="text-right tabular-nums">{formatPriceKZT(report.totals.returned)}</div>
                <div className="text-right tabular-nums">{formatPriceKZT(report.totals.payment)}</div>
                <div className="text-right tabular-nums text-brand-yellow">
                  {formatPriceKZT(report.closingBalance)}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {!report && !loading && !error && (
        <EmptyState
          icon={FileText}
          title="Акт сверки не сформирован"
          description="Выберите период и нажмите «Сформировать» для получения отчёта"
          className="py-12"
        />
      )}
    </Modal>
  );
};

export default ReconciliationModal;
