import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import analyticsApi from '../services/analyticsApi';
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
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { getProductActionTypeLabel } from '../constants/productActionTypes';
import type { ManagerActivityReport as ManagerActivityReportDto } from '../types';

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

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="shadow-none hover:shadow-none">
      <CardBody compact>
        <p className="text-caption text-text-muted">{label}</p>
        <p className="mt-1 text-h2 font-bold tabular-nums text-brand-black">{value}</p>
      </CardBody>
    </Card>
  );
}

export const ManagerActivityReport: React.FC = () => {
  const { user } = useAuth();
  const [report, setReport] = useState<ManagerActivityReportDto | null>(null);
  const [from, setFrom] = useState(getDefaultFromDate);
  const [to, setTo] = useState(getDefaultToDate);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canView = user?.role === 'admin' && user?.canViewManagerReports === true;

  const loadReport = useCallback(async () => {
    if (!canView) return;

    setLoading(true);
    setError('');
    try {
      const reportData = await analyticsApi.getManagerActivityReport({ from, to });
      setReport(reportData);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
          (err as { message?: string })?.message ||
          'Не удалось загрузить отчёт по менеджерам'
      );
    } finally {
      setLoading(false);
    }
  }, [canView, from, to]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  if (!canView) {
    return (
      <Layout>
        <Alert variant="error">Нет доступа к отчёту по менеджерам.</Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader
          title="Активность менеджеров"
          description="Кто из администраторов сколько товаров создал и обработал за период"
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
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
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
              <MetricCard label="Действий с товарами" value={report?.summary.totalActions || 0} />
              <MetricCard label="Заявок на закупку" value={report?.summary.totalOrders || 0} />
              <MetricCard label="Менеджеров" value={report?.summary.managerCount || 0} />
            </div>

            <Card className="shadow-none hover:shadow-none">
              <CardHeader>
                <CardTitle>
                  Период {report?.period.from || from} - {report?.period.to || to}
                </CardTitle>
              </CardHeader>
              <CardBody>
                {report && report.managers.length > 0 ? (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Менеджер</TableHeaderCell>
                        <TableHeaderCell>Действий</TableHeaderCell>
                        <TableHeaderCell>Заявок на закупку</TableHeaderCell>
                        <TableHeaderCell>Разбивка по действиям</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {report.managers.map((row) => (
                        <TableRow key={row.manager.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-brand-black">{row.manager.name}</p>
                              {row.manager.email && (
                                <p className="text-caption text-text-muted">{row.manager.email}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="tabular-nums">{row.totalActions}</TableCell>
                          <TableCell>
                            <Badge variant="warning">{row.ordersCreated}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1.5">
                              {row.actionBreakdown.map((entry) => (
                                <Badge key={entry.actionType} variant="outline">
                                  {getProductActionTypeLabel(entry.actionType)}: {entry.count}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="rounded-xl border border-dashed border-border-subtle bg-surface-page p-6 text-center">
                    <p className="text-body text-text-muted">За выбранный период активности не было.</p>
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
