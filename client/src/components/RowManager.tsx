import React, { useState, useEffect } from 'react';

import { Plus, Edit3, Trash2, ArrowLeft, Package2 } from 'lucide-react';

import { Row, Sector } from '../types';

import { rowsApi } from '../services/rowsApi';

import { sectorsApi } from '../services/sectorsApi';

import { useConfirmDialog } from '../context/ConfirmDialogContext';

import {

  Alert,

  Badge,

  Button,

  Card,

  CardBody,

  CardTitle,

  EmptyState,

  FormFooter,

  IconButton,

  Input,

  Modal,

  PageHeader,

  Select,

  Spinner,

  Textarea,

} from './ui';

import { cn } from '../utils/cn';



interface RowFormData {

  sectorId: number;

  name: string;

  code: string;

  totalSpaces: number;

  notes: string;

  sortOrder: number;

}



const INITIAL_FORM_DATA: RowFormData = {

  sectorId: 0,

  name: '',

  code: '',

  totalSpaces: 0,

  notes: '',

  sortOrder: 0,

};



interface RowManagerProps {

  selectedSectorId?: number;

  onBack?: () => void;

}



export const RowManager: React.FC<RowManagerProps> = ({ selectedSectorId, onBack }) => {

  const { confirm } = useConfirmDialog();

  const [rows, setRows] = useState<Row[]>([]);

  const [sectors, setSectors] = useState<Sector[]>([]);

  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);

  const [editingRow, setEditingRow] = useState<Row | null>(null);

  const [formData, setFormData] = useState<RowFormData>(INITIAL_FORM_DATA);

  const [submitting, setSubmitting] = useState(false);



  useEffect(() => {

    loadInitialData();

  }, [selectedSectorId]);



  const loadInitialData = async () => {

    try {

      setLoading(true);

      const sectorsData = await sectorsApi.getAll();

      setSectors(sectorsData);



      if (selectedSectorId) {

        const sector = sectorsData.find((s) => s.id === selectedSectorId);

        setSelectedSector(sector || null);



        if (sector) {

          const rowsData = await rowsApi.getAll(selectedSectorId);

          setRows(rowsData);

        }

      } else {

        const rowsData = await rowsApi.getAll();

        setRows(rowsData);

      }



      setError(null);

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');

    } finally {

      setLoading(false);

    }

  };



  const loadRows = async (sectorId?: number) => {

    try {

      const data = await rowsApi.getAll(sectorId);

      setRows(data);

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Ошибка загрузки рядов');

    }

  };



  const handleSectorChange = async (sectorId: number) => {

    const sector = sectors.find((s) => s.id === sectorId);

    setSelectedSector(sector || null);



    if (sectorId > 0) {

      await loadRows(sectorId);

    } else {

      await loadRows();

    }

  };



  const handleCreateRow = () => {

    setEditingRow(null);

    setFormData({

      ...INITIAL_FORM_DATA,

      sectorId: selectedSector?.id || 0,

    });

    setShowForm(true);

  };



  const handleEditRow = (row: Row) => {

    setEditingRow(row);

    setFormData({

      sectorId: row.sectorId,

      name: row.name,

      code: row.code,

      totalSpaces: row.totalSpaces,

      notes: row.notes || '',

      sortOrder: row.sortOrder,

    });

    setShowForm(true);

  };



  const handleCloseForm = () => {

    setShowForm(false);

    setEditingRow(null);

    setFormData(INITIAL_FORM_DATA);

  };



  const handleSubmitForm = async (e: React.FormEvent) => {

    e.preventDefault();



    if (!formData.sectorId || !formData.name.trim() || !formData.code.trim()) {

      setError('Заполните все обязательные поля');

      return;

    }



    setSubmitting(true);



    try {

      if (editingRow) {

        await rowsApi.update(editingRow.id, formData);

      } else {

        await rowsApi.create(formData);

      }



      await loadRows(selectedSector?.id);

      handleCloseForm();

      setError(null);

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Ошибка сохранения ряда');

    } finally {

      setSubmitting(false);

    }

  };



  const handleDeleteRow = async (row: Row) => {

    const ok = await confirm({

      title: 'Удалить ряд',

      message: `Удалить ряд «${row.name}»? Это действие нельзя отменить.`,

      confirmLabel: 'Удалить',

      variant: 'danger',

    });

    if (!ok) return;



    try {

      await rowsApi.delete(row.id);

      await loadRows(selectedSector?.id);

      setError(null);

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Ошибка удаления ряда');

    }

  };



  const handleUpdateOccupancy = async (row: Row) => {

    try {

      await rowsApi.updateOccupancy(row.id);

      await loadRows(selectedSector?.id);

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Ошибка обновления заполненности');

    }

  };



  const handleInputChange = (field: keyof RowFormData, value: string | number) => {

    setFormData((prev) => ({

      ...prev,

      [field]: value,

    }));

  };



  const getOccupancyPercentage = (row: Row) => {

    if (row.totalSpaces === 0) return 0;

    return Math.round((row.occupiedSpaces / row.totalSpaces) * 100);

  };



  const getOccupancyBadge = (percentage: number) => {

    if (percentage >= 90) return 'danger' as const;

    if (percentage >= 70) return 'warning' as const;

    return 'success' as const;

  };



  if (loading) {

    return (

      <div className="flex min-h-[16rem] items-center justify-center">

        <Spinner size="lg" color="brand" useLucide />

      </div>

    );

  }



  const statItems = [

    { label: 'Всего рядов', value: rows.length },

    { label: 'Активных', value: rows.filter((r) => r.isActive).length },

  ];



  return (

    <div className="space-y-6">

      <PageHeader

        title="Управление рядами"

        description={

          selectedSector

            ? `Ряды сектора «${selectedSector.name}»`

            : 'Все ряды складских секторов'

        }

        icon={Package2}

        actions={

          <div className="flex items-center gap-2">

            {onBack && (

              <IconButton icon={ArrowLeft} title="Назад" variant="ghost" onClick={onBack} />

            )}

            <Button variant="primary" leftIcon={Plus} onClick={handleCreateRow} disabled={!selectedSector}>

              Создать ряд

            </Button>

          </div>

        }

      />



      {!selectedSectorId && (

        <Card variant="inset" className="shadow-none">

          <CardBody className="p-4">

            <Select

              label="Фильтр по сектору"

              value={String(selectedSector?.id || 0)}

              onChange={(e) => handleSectorChange(parseInt(e.target.value))}

            >

              <option value={0}>Все сектора</option>

              {sectors.map((sector) => (

                <option key={sector.id} value={sector.id}>

                  {sector.icon} {sector.name} ({sector.productType})

                </option>

              ))}

            </Select>

          </CardBody>

        </Card>

      )}



      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">

        {statItems.map(({ label, value }) => (

          <div key={label} className="rounded-xl border border-border-subtle bg-brand-white p-4">

            <p className="text-caption font-medium text-text-muted">{label}</p>

            <p className="mt-1 text-h2 font-bold tabular-nums tracking-tight text-brand-black">{value}</p>

          </div>

        ))}

        {selectedSector && (

          <div className="rounded-xl border border-border-subtle bg-surface-accent p-4">

            <p className="text-caption font-medium text-text-muted">Сектор</p>

            <p className="mt-1 text-card-title text-brand-black">{selectedSector.name}</p>

          </div>

        )}

      </div>



      {error && <Alert variant="error">{error}</Alert>}



      {rows.length === 0 ? (

        <Card>

          <EmptyState

            icon={Package2}

            title={selectedSector ? 'Нет рядов в этом секторе' : 'Нет созданных рядов'}

            description={

              selectedSector

                ? 'Создайте первый ряд в этом секторе для организации пространства'

                : 'Выберите сектор и создайте первые ряды для организации складского пространства'

            }

            action={

              <Button

                variant="primary"

                leftIcon={Plus}

                onClick={handleCreateRow}

                disabled={!selectedSector && sectors.length === 0}

              >

                Создать ряд

              </Button>

            }

            className="py-12"

          />

        </Card>

      ) : (

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">

          {rows.map((row) => {

            const occupancy = getOccupancyPercentage(row);

            return (

              <Card key={row.id} variant="elevated" className={cn(!row.isActive && 'opacity-60')}>

                <CardBody className="space-y-4">

                  <div className="flex items-center gap-3">

                    <div

                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"

                      style={{ backgroundColor: row.sector?.color || '#6b7280' }}

                    >

                      {row.code}

                    </div>

                    <div className="min-w-0 flex-1">

                      <CardTitle>{row.name}</CardTitle>

                      <p className="text-caption text-text-muted">

                        {row.sector?.name} ({row.sector?.productType})

                      </p>

                    </div>

                    {!row.isActive && <Badge variant="outline">Неактивен</Badge>}

                  </div>



                  <div>

                    <div className="mb-2 flex justify-between text-caption">

                      <span className="text-text-muted">Заполненность</span>

                      <span className="font-medium tabular-nums text-brand-black">

                        {row.occupiedSpaces} / {row.totalSpaces}

                      </span>

                    </div>

                    {row.totalSpaces > 0 && (

                      <div className="mb-2 h-2 w-full rounded-full bg-surface-inset">

                        <div

                          className="h-2 rounded-full bg-brand-yellow transition-all duration-150"

                          style={{ width: `${occupancy}%` }}

                        />

                      </div>

                    )}

                    <div className="flex items-center justify-between">

                      <Badge variant={getOccupancyBadge(occupancy)}>{occupancy}%</Badge>

                      <Button

                        variant="ghost"

                        size="sm"

                        onClick={() => handleUpdateOccupancy(row)}

                        className="text-accent-blue"

                      >

                        Обновить

                      </Button>

                    </div>

                  </div>



                  {row.notes && <p className="text-caption text-text-muted">{row.notes}</p>}



                  <div className="space-y-1 border-t border-border-subtle pt-3 text-caption">

                    <div className="flex justify-between">

                      <span className="text-text-muted">Поставщиков</span>

                      <span className="tabular-nums text-brand-black">{row.suppliers?.length || 0}</span>

                    </div>

                    <div className="flex justify-between">

                      <span className="text-text-muted">Порядок</span>

                      <span className="tabular-nums text-brand-black">{row.sortOrder}</span>

                    </div>

                  </div>



                  <div className="flex gap-2">

                    <Button

                      variant="secondary"

                      size="sm"

                      leftIcon={Edit3}

                      onClick={() => handleEditRow(row)}

                      className="flex-1"

                    >

                      Редактировать

                    </Button>

                    <IconButton

                      icon={Trash2}

                      title="Удалить"

                      variant="danger"

                      onClick={() => handleDeleteRow(row)}

                    />

                  </div>

                </CardBody>

              </Card>

            );

          })}

        </div>

      )}



      <Modal

        isOpen={showForm}

        onClose={handleCloseForm}

        title={editingRow ? 'Редактировать ряд' : 'Создать ряд'}

        size="md"

        footer={

          <FormFooter

            onCancel={handleCloseForm}

            submitLabel={submitting ? 'Сохранение...' : 'Сохранить'}

            submitLoading={submitting}

            submitDisabled={submitting}

            onSubmit={() => handleSubmitForm({ preventDefault: () => {} } as React.FormEvent)}

            submitType="button"

          />

        }

      >

        <form onSubmit={handleSubmitForm} className="space-y-4">

          <Select

            label="Сектор"

            required

            value={formData.sectorId.toString()}

            onChange={(e) => handleInputChange('sectorId', parseInt(e.target.value))}

            disabled={!!selectedSector}

          >

            <option value="0">Выберите сектор</option>

            {sectors.map((sector) => (

              <option key={sector.id} value={sector.id}>

                {sector.icon} {sector.name} ({sector.productType})

              </option>

            ))}

          </Select>



          <div className="grid grid-cols-2 gap-4">

            <Input

              label="Название"

              required

              value={formData.name}

              onChange={(e) => handleInputChange('name', e.target.value)}

              placeholder="Ряд 1"

            />

            <Input

              label="Код"

              required

              value={formData.code}

              onChange={(e) => handleInputChange('code', e.target.value)}

              placeholder="1"

            />

          </div>



          <div className="grid grid-cols-2 gap-4">

            <Input

              label="Всего мест"

              type="number"

              min={0}

              value={formData.totalSpaces}

              onChange={(e) => handleInputChange('totalSpaces', parseInt(e.target.value) || 0)}

              placeholder="0"

            />

            <Input

              label="Порядок сортировки"

              type="number"

              value={formData.sortOrder}

              onChange={(e) => handleInputChange('sortOrder', parseInt(e.target.value) || 0)}

              placeholder="0"

            />

          </div>



          <Textarea

            label="Заметки"

            rows={3}

            value={formData.notes}

            onChange={(e) => handleInputChange('notes', e.target.value)}

            placeholder="Дополнительная информация о ряде..."

            className="resize-none"

          />

        </form>

      </Modal>

    </div>

  );

};


