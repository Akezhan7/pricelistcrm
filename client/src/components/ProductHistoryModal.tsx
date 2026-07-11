import React from 'react';
import type { Product } from '../types';
import { Modal } from './ui';
import { ProductActionTimeline } from './ProductActionTimeline';

type ProductHistoryModalProps = {
  product: Pick<Product, 'id' | 'name'> | null;
  onClose: () => void;
};

export const ProductHistoryModal: React.FC<ProductHistoryModalProps> = ({ product, onClose }) => (
  <Modal
    isOpen={Boolean(product)}
    onClose={onClose}
    title={product ? `История: ${product.name}` : 'История товара'}
    size="xl"
  >
    {product && <ProductActionTimeline productId={product.id} />}
  </Modal>
);
