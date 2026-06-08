import React from 'react';

import { Plus } from 'lucide-react';

import type { Market } from '../../types';

import { FormField } from '../ui/FormField';

import { FormSection } from '../ui/FormSection';

import { Input } from '../ui/Input';

import { Select } from '../ui/Select';

import { Textarea } from '../ui/Textarea';

import { Button } from '../ui/Button';

import { Spinner } from '../ui/Spinner';

import { Alert } from '../ui/Alert';

import { FileUploadZone } from '../ui/FileUploadZone';

import getImageUrl from '../../utils/image';



export type SupplierFormData = {

  marketId: string;

  name: string;

  phone: string;

  whatsapp: string;

  row: string;

  container: string;

  cityAddress: string;

  notes: string;

  containerImage: File | null;

  debt: string;

};



export type ProductLinkData = {

  supplierPrice: string;

  quantity: string;

  isAvailable: boolean;

  notes: string;

};



export const emptySupplierFormData = (): SupplierFormData => ({

  marketId: '',

  name: '',

  phone: '',

  whatsapp: '',

  row: '',

  container: '',

  cityAddress: '',

  notes: '',

  containerImage: null,

  debt: '0',

});



export const emptyProductLinkData = (): ProductLinkData => ({

  supplierPrice: '',

  quantity: '0',

  isAvailable: true,

  notes: '',

});



export interface SupplierFormFieldsProps {

  data: SupplierFormData;

  onChange: (data: SupplierFormData) => void;

  onMarketChange?: (marketId: string) => void;

  markets: Market[];

  loadingMarkets: boolean;

  onOpenMarketModal: () => void;

  mode: 'create' | 'edit';

  currentImageUrl?: string | null;

  withProduct?: {

    productName: string;

    linkData: ProductLinkData;

    onLinkDataChange: (data: ProductLinkData) => void;

  };

}



export const SupplierFormFields: React.FC<SupplierFormFieldsProps> = ({

  data,

  onChange,

  onMarketChange,

  markets,

  loadingMarkets,

  onOpenMarketModal,

  mode,

  currentImageUrl,

  withProduct,

}) => {

  const set = (patch: Partial<SupplierFormData>) => onChange({ ...data, ...patch });



  const handleMarketChange = (newMarketId: string) => {

    if (onMarketChange) {

      onMarketChange(newMarketId);

      return;

    }

    if (newMarketId) {

      set({ marketId: newMarketId, cityAddress: '' });

    } else {

      set({ marketId: '', row: '', container: '' });

    }

  };



  return (

    <div className="space-y-5">

      {withProduct && (

        <Alert variant="info">

          Поставщик будет автоматически привязан к товару: <strong>{withProduct.productName}</strong>

        </Alert>

      )}



      <FormSection title="Основная информация">

        <FormField

          label="Рынок (опционально)"

          helperText="Если поставщик на Байсате, Ялянь или другом рынке — выберите рынок"

        >

          <div className="flex gap-2">

            {loadingMarkets ? (

              <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-border-subtle rounded-lg text-text-muted bg-surface-base">

                <Spinner size="sm" />

                Загрузка рынков...

              </div>

            ) : (

              <Select

                className="flex-1"

                value={data.marketId}

                onChange={(e) => handleMarketChange(e.target.value)}

              >

                <option value="">Не на рынке / Где-то в городе</option>

                {markets.map((market) => (

                  <option key={market.id} value={market.id}>

                    {market.name}

                  </option>

                ))}

              </Select>

            )}

            <Button

              type="button"

              variant="accent"

              size="md"

              leftIcon={Plus}

              onClick={onOpenMarketModal}

              title="Управление рынками"

              className="flex-shrink-0"

            />

          </div>

        </FormField>



        <Input

          label="Имя поставщика"

          required

          value={data.name}

          onChange={(e) => set({ name: e.target.value })}

          placeholder="Например: Юсуф, Рустам"

        />



        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          <Input

            label="Телефон"

            type="tel"

            required

            value={data.phone}

            onChange={(e) => set({ phone: e.target.value })}

            placeholder="+7 777 123 45 67"

          />

          <Input

            label="WhatsApp"

            type="tel"

            value={data.whatsapp}

            onChange={(e) => set({ whatsapp: e.target.value })}

            placeholder="+7 777 123 45 67"

            helperText="Если отличается от телефона"

          />

        </div>

      </FormSection>



      {data.marketId ? (

        <FormSection title="Местоположение на рынке">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            <Input

              label="Номер ряда"

              required={mode === 'create' && !data.container}

              value={data.row}

              onChange={(e) => set({ row: e.target.value })}

              placeholder="Например: 24"

            />

            <Input

              label="Номер контейнера"

              value={data.container}

              onChange={(e) => set({ container: e.target.value })}

              placeholder="Например: 6"

            />

          </div>

          {mode === 'create' && (

            <p className="text-xs text-text-muted">

              Укажите хотя бы номер ряда или контейнера для точного поиска поставщика

            </p>

          )}

        </FormSection>

      ) : (

        <FormSection title="Адрес в городе">

          <Input

            label="Адрес"

            required

            value={data.cityAddress}

            onChange={(e) => set({ cityAddress: e.target.value })}

            placeholder="Например: ул. Абая 123, офис 45"

            helperText="Укажите полный адрес поставщика в городе"

          />

        </FormSection>

      )}



      {mode === 'edit' && (

        <Input

          label="Задолженность (₸)"

          type="number"

          min={0}

          step="0.01"

          value={data.debt}

          onChange={(e) => set({ debt: e.target.value })}

          placeholder="0"

          helperText="Сумма, которую вы должны поставщику"

        />

      )}



      <FormField label="Фото контейнера (опционально)">

        {mode === 'edit' && currentImageUrl && !data.containerImage && (

          <div className="mb-3">

            <img

              src={getImageUrl(currentImageUrl) || undefined}

              alt="Текущее изображение"

              className="w-full h-32 object-cover rounded-xl border border-border-subtle"

              onError={(e) => {

                const el = e.currentTarget;

                el.onerror = null;

                el.src = '/placeholder.svg';

              }}

            />

            <p className="text-xs text-text-muted mt-1">Текущее изображение</p>

          </div>

        )}

        <FileUploadZone

          onFileChange={(file) => set({ containerImage: file })}

          selectedFile={data.containerImage}

          label={currentImageUrl ? 'Изменить изображение' : 'Выберите файл'}

        />

      </FormField>



      <Textarea

        label="Заметки (опционально)"

        rows={mode === 'edit' ? 3 : 2}

        value={data.notes}

        onChange={(e) => set({ notes: e.target.value })}

        placeholder="Дополнительные заметки о поставщике..."

        className="resize-none"

      />



      {withProduct && (

        <FormSection title="Условия для товара" variant="accent">

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            <Input

              label="Цена"

              type="number"

              required

              min={0}

              step="0.01"

              value={withProduct.linkData.supplierPrice}

              onChange={(e) =>

                withProduct.onLinkDataChange({

                  ...withProduct.linkData,

                  supplierPrice: e.target.value,

                })

              }

              placeholder="0.00"

            />

            <Input

              label="Количество"

              type="number"

              min={0}

              value={withProduct.linkData.quantity}

              onChange={(e) =>

                withProduct.onLinkDataChange({

                  ...withProduct.linkData,

                  quantity: e.target.value,

                })

              }

              placeholder="0"

            />

            <FormField label="Доступность">

              <Select

                value={withProduct.linkData.isAvailable.toString()}

                onChange={(e) =>

                  withProduct.onLinkDataChange({

                    ...withProduct.linkData,

                    isAvailable: e.target.value === 'true',

                  })

                }

              >

                <option value="true">Доступен</option>

                <option value="false">Недоступен</option>

              </Select>

            </FormField>

          </div>

          <Input

            label="Заметки для этого товара"

            value={withProduct.linkData.notes}

            onChange={(e) =>

              withProduct.onLinkDataChange({

                ...withProduct.linkData,

                notes: e.target.value,

              })

            }

            placeholder="Особые условия, заметки о качестве..."

          />

        </FormSection>

      )}

    </div>

  );

};

