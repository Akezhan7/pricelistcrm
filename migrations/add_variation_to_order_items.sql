-- Миграция: Добавление поддержки вариаций товаров в заявки
-- Дата: 2025-10-22
-- Описание: Добавляет поле product_variation_id в таблицу order_items

-- Добавить колонку для хранения ID вариации товара
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS product_variation_id INTEGER NULL;

-- Добавить комментарий к колонке
COMMENT ON COLUMN order_items.product_variation_id IS 'ID вариации товара (если выбрана конкретная вариация)';

-- Создать индекс для быстрого поиска по вариациям
CREATE INDEX IF NOT EXISTS order_items_product_variation_id_idx 
ON order_items(product_variation_id);

-- Добавить внешний ключ к таблице product_variations
ALTER TABLE order_items
ADD CONSTRAINT fk_order_items_product_variation
FOREIGN KEY (product_variation_id) 
REFERENCES product_variations(id)
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- Вывести информацию о выполнении
SELECT 'Миграция успешно выполнена: добавлено поле product_variation_id в order_items' AS message;
