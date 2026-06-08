import React from 'react';

import type { Category } from '../../types';

import { Input } from '../ui/Input';

import { Select } from '../ui/Select';

import { Textarea } from '../ui/Textarea';

import { FormField } from '../ui/FormField';

import { FormSection } from '../ui/FormSection';

import { FileUploadZone } from '../ui/FileUploadZone';

import getImageUrl from '../../utils/image';



export type ProductFormData = {

  name: string;

  article: string;

  internalName: string;

  kaspiName: string;

  kaspiArticle: string;

  costPrice: string;

  sellingPrice: string;

  currentStock: string;

  minStock: string;

  categoryId: string;

  description: string;

};



export const emptyProductFormData = (): ProductFormData => ({

  name: '',

  article: '',

  internalName: '',

  kaspiName: '',

  kaspiArticle: '',

  costPrice: '',

  sellingPrice: '',

  currentStock: '0',

  minStock: '0',

  categoryId: '',

  description: '',

});



export interface ProductFormFieldsProps {

  data: ProductFormData;

  onChange: (data: ProductFormData) => void;

  categories: Category[];

  image: File | null;

  onImageChange: (file: File | null) => void;

  currentImageUrl?: string | null;

  mode: 'create' | 'edit';

  /** Sync supplier price when cost changes (supplier-locked create flow) */

  onCostPriceChange?: (value: string) => void;

}



export const ProductFormFields: React.FC<ProductFormFieldsProps> = ({

  data,

  onChange,

  categories,

  image,

  onImageChange,

  currentImageUrl,

  mode,

  onCostPriceChange,

}) => {

  const set = (patch: Partial<ProductFormData>) => onChange({ ...data, ...patch });



  const kaspiWarningClass =

    mode === 'edit' ? 'text-xs text-danger ml-1' : 'text-xs text-text-muted ml-1';



  return (

    <div className="space-y-5">

      <Input

        label="Название товара"

        required

        value={data.name}

        onChange={(e) => set({ name: e.target.value })}

        placeholder="Например: Конструктор LEGO"

      />



      <FormSection title="Дополнительные названия">

        <FormField label="Внутреннее название" helperText="Для сотрудников">

          <Input

            value={data.internalName}

            onChange={(e) => set({ internalName: e.target.value })}

            placeholder="Например: Маска сварная чёрная"

          />

        </FormField>

        <FormField label="Название для Kaspi">

          <Input

            value={data.kaspiName}

            onChange={(e) => set({ kaspiName: e.target.value })}

            placeholder="Официальное название для Kaspi"

          />

          <p className={kaspiWarningClass + ' mt-1'}>НЕ менять после выгрузки!</p>

        </FormField>

        <FormField label="Артикул Kaspi">

          <Input

            value={data.kaspiArticle}

            onChange={(e) => set({ kaspiArticle: e.target.value })}

            placeholder="Артикул для Kaspi"

          />

          <p className={kaspiWarningClass + ' mt-1'}>НЕ менять после выгрузки!</p>

        </FormField>

      </FormSection>



      <Select

        label="Категория"

        value={data.categoryId}

        onChange={(e) => set({ categoryId: e.target.value })}

      >

        <option value="">Без категории</option>

        {categories.map((category) => (

          <option key={category.id} value={category.id}>

            {category.name}

          </option>

        ))}

      </Select>



      <Input

        label="Артикул"

        required

        value={data.article}

        onChange={(e) => set({ article: e.target.value })}

        placeholder="Например: LEGO-001"

      />



      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <Input

          label="Себестоимость"

          type="number"

          required

          min={0}

          step="0.01"

          value={data.costPrice}

          onChange={(e) => {

            set({ costPrice: e.target.value });

            onCostPriceChange?.(e.target.value);

          }}

          placeholder="1000"

        />

        <Input

          label="Цена продажи"

          type="number"

          required

          min={0}

          step="0.01"

          value={data.sellingPrice}

          onChange={(e) => set({ sellingPrice: e.target.value })}

          placeholder="1500"

        />

      </div>



      <FormSection title="Управление остатками">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <Input

            label="Текущий остаток"

            type="number"

            min={0}

            step={1}

            value={data.currentStock}

            onChange={(e) => set({ currentStock: e.target.value })}

            placeholder="0"

          />

          <Input

            label="Минимальный порог"

            type="number"

            min={0}

            step={1}

            value={data.minStock}

            onChange={(e) => set({ minStock: e.target.value })}

            placeholder="0"

            helperText="При достижении этого уровня товар попадёт в список закупа"

          />

        </div>

      </FormSection>



      <Textarea

        label="Описание"

        rows={3}

        value={data.description}

        onChange={(e) => set({ description: e.target.value })}

        placeholder="Дополнительное описание товара..."

        className="resize-none"

      />



      <FormField label="Фотография товара">

        {currentImageUrl && !image && (

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

          onFileChange={onImageChange}

          selectedFile={image}

          label={currentImageUrl ? 'Изменить изображение' : 'Выберите файл'}

        />

      </FormField>

    </div>

  );

};

