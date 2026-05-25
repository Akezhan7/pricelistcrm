import React, { useState } from 'react';
import { X, Loader2, AlertCircle, FileText, Download } from 'lucide-react';
import suppliersApi, { ReconciliationReport } from '../services/suppliersApi';
import { generateReconciliationPDF } from '../utils/pdfGenerator';

interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId: number;
  supplierName: string;
}

const formatNumber = (n: number) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

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

  if (!isOpen) return null;

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
      alert('Ошибка при формировании PDF');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-black text-white">
          <div>
            <div className="text-xs uppercase tracking-wider text-yellow-400 font-semibold mb-1">Reconciliation</div>
            <h2 className="text-xl font-bold">Акт сверки — {supplierName}</h2>
          </div>
          <button onClick={handleClose} className="text-gray-300 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-600 uppercase mb-1">С</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 uppercase mb-1">По</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <button
              onClick={loadReport}
              disabled={loading}
              className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Сформировать
            </button>
            {report && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="px-4 py-2 bg-black hover:bg-gray-800 text-white font-semibold rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Скачать PDF
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {report && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-gray-50 border-l-4 border-yellow-400 p-3 rounded">
                  <div className="text-xs text-gray-500 uppercase">Сальдо на начало</div>
                  <div className="text-lg font-bold text-gray-900 mt-1">{formatNumber(report.openingBalance)} ₸</div>
                </div>
                <div className="bg-gray-50 border-l-4 border-yellow-400 p-3 rounded">
                  <div className="text-xs text-gray-500 uppercase">Сальдо на конец</div>
                  <div className="text-lg font-bold text-gray-900 mt-1">{formatNumber(report.closingBalance)} ₸</div>
                </div>
                <div className="bg-gray-50 border-l-4 border-yellow-400 p-3 rounded">
                  <div className="text-xs text-gray-500 uppercase">Оплачено за период</div>
                  <div className="text-lg font-bold text-green-700 mt-1">{formatNumber(report.totals.payment)} ₸</div>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-yellow-400 text-black">
                      <th className="px-3 py-2 text-left">Дата</th>
                      <th className="px-3 py-2 text-left">Тип</th>
                      <th className="px-3 py-2 text-left">Документ</th>
                      <th className="px-3 py-2 text-right">Поставка</th>
                      <th className="px-3 py-2 text-right">Возврат</th>
                      <th className="px-3 py-2 text-right">Оплата</th>
                      <th className="px-3 py-2 text-right">Баланс</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.movements.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                          За выбранный период движений нет
                        </td>
                      </tr>
                    ) : (
                      report.movements.map((m, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2">{formatDate(m.date)}</td>
                          <td className="px-3 py-2">{kindLabel[m.kind] || m.kind}</td>
                          <td className="px-3 py-2 font-medium">{m.documentNumber}</td>
                          <td className="px-3 py-2 text-right">{m.purchase ? formatNumber(m.purchase) : ''}</td>
                          <td className="px-3 py-2 text-right text-yellow-700">{m.returned ? formatNumber(m.returned) : ''}</td>
                          <td className="px-3 py-2 text-right text-green-700">{m.payment ? formatNumber(m.payment) : ''}</td>
                          <td className="px-3 py-2 text-right font-semibold">{formatNumber(m.balance)} ₸</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-black text-white font-bold">
                      <td colSpan={3} className="px-3 py-2 text-right">ИТОГО</td>
                      <td className="px-3 py-2 text-right">{formatNumber(report.totals.purchase)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(report.totals.returned)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(report.totals.payment)}</td>
                      <td className="px-3 py-2 text-right text-yellow-400">{formatNumber(report.closingBalance)} ₸</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {!report && !loading && !error && (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Выберите период и нажмите «Сформировать» для получения акта сверки.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReconciliationModal;
