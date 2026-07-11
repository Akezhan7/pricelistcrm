import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import analyticsApi from '../services/analyticsApi';
import api from '../utils/api';
import { Layout } from '../components/Layout';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Input,
  PageHeader,
  Select,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { DesignerKpiReport as DesignerKpiReportDto, LifecycleUserRef } from '../types';

type DesignerOption = LifecycleUserRef & {
  role: string;
};

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDefaultFromDate() {
  const now = new Date();
  return formatDateInput(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
}

function getDefaultToDate() {
  return formatDateInput(new Date());
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  }).format(value);
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <Card className="shadow-none hover:shadow-none">
      <CardBody compact>
        <p className="text-caption text-text-muted">{label}</p>
        <p className="mt-1 text-h2 font-bold tabular-nums text-brand-black">{value}</p>
      </CardBody>
    </Card>
  );
}

export const DesignerKpiReport: React.FC = () => {
  const { user } = useAuth();
  const [report, setReport] = useState<DesignerKpiReportDto | null>(null);
  const [designers, setDesigners] = useState<DesignerOption[]>([]);
  const [from, setFrom] = useState(getDefaultFromDate);
  const [to, setTo] = useState(getDefaultToDate);
  const [designerId, setDesignerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canView = user?.role === 'admin';

  const selectedDesignerId = useMemo(() => {
    const parsed = Number(designerId);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }, [designerId]);

  const loadReport = useCallback(async () => {
    if (!canView) return;

    setLoading(true);
    setError('');
    try {
      const [reportData, usersResponse] = await Promise.all([
        analyticsApi.getDesignerKpiReport({
          from,
          to,
          designerId: selectedDesignerId,
        }),
        api.get('/auth/users?role=designer'),
      ]);
      setReport(reportData);
      setDesigners(usersResponse.data.data.users || []);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
          (err as { message?: string })?.message ||
          'Не удалось загрузить KPI дизайнеров'
      );
    } finally {
      setLoading(false);
    }
  }, [canView, from, selectedDesignerId, to]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  if (!canView) {
    return (
      <Layout>
        <Alert variant="error">Нет доступа к отчету KPI дизайнеров.</Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader
          title="KPI дизайнеров"
          description="Зачтенные веса карточек по датам одобрения"
          icon={BarChart3}
          actions={
            <Button
              type="button"
              variant="secondary"
              leftIcon={RefreshCw}
              loading={loading}
              onClick={loadReport}
            >
              Обновить
            </Button>
          }
        />

        <Card className="shadow-none hover:shadow-none">
          <CardBody>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] md:items-end">
              <Input
                label="С"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
              <Input
                label="По"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
              <Select
                label="Дизайнер"
                value={designerId}
                onChange={(event) => setDesignerId(event.target.value)}
              >
                <option value="">Все дизайнеры</option>
                {designers.map((designer) => (
                  <option key={designer.id} value={designer.id}>
                    {designer.name}
                  </option>
                ))}
              </Select>
              <Button type="button" variant="primary" onClick={loadReport} loading={loading}>
                Применить
              </Button>
            </div>
          </CardBody>
        </Card>

        {error && <Alert variant="error">{error}</Alert>}

        {loading && !report ? (
          <div className="flex min-h-[18rem] items-center justify-center">
            <Spinner size="lg" color="brand" />
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <MetricCard label="Карточек" value={report?.summary.totalCards || 0} />
              <MetricCard label="Сумма веса" value={formatNumber(report?.summary.totalWeight || 0)} />
              <MetricCard label="Дизайнеров" value={report?.summary.designerCount || 0} />
            </div>

            <Card className="shadow-none hover:shadow-none">
              <CardHeader>
                <CardTitle>
                  Период {report?.period.from || from} - {report?.period.to || to}
                </CardTitle>
              </CardHeader>
              <CardBody>
                {report && report.designers.length > 0 ? (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Дизайнер</TableHeaderCell>
                        <TableHeaderCell>Карточки</TableHeaderCell>
                        <TableHeaderCell>Вес</TableHeaderCell>
                        <TableHeaderCell>Зачтенные товары</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {report.designers.map((row) => (
                        <TableRow key={row.designer.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-brand-black">{row.designer.name}</p>
                              {row.designer.email && (
                                <p className="text-caption text-text-muted">{row.designer.email}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="tabular-nums">{row.totalCards}</TableCell>
                          <TableCell>
                            <Badge variant="warning">{formatNumber(row.totalWeight)}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              {row.entries.map((entry) => (
                                <div
                                  key={entry.id}
                                  className="rounded-lg border border-border-subtle bg-surface-page px-3 py-2"
                                >
                                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                      <p className="truncate text-body-medium text-brand-black">
                                        {entry.product?.name || 'Товар удален'}
                                      </p>
                                      <p className="text-caption text-text-muted">
                                        {entry.product?.article || 'Без артикула'} ·{' '}
                                        {new Date(entry.creditedAt).toLocaleDateString('ru-RU')}
                                      </p>
                                    </div>
                                    <Badge variant="outline">{formatNumber(entry.weight)}</Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="rounded-xl border border-dashed border-border-subtle bg-surface-page p-6 text-center">
                    <p className="text-body text-text-muted">За выбранный период KPI не начислялся.</p>
                  </div>
                )}
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
};
