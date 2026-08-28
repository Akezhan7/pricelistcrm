import React, { useState } from 'react';
import { Package } from 'lucide-react';
import type { Product } from '../types';
import getImageUrl from '../utils/image';

type ProcurementProductThumbnailProps = {
  product: Pick<Product, 'name' | 'image'>;
};

export const ProcurementProductThumbnail: React.FC<ProcurementProductThumbnailProps> = ({
  product,
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = getImageUrl(product.image);

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border-subtle bg-surface-inset">
      {imageUrl && !imageFailed ? (
        <img
          src={imageUrl}
          alt={product.name}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Package className="h-5 w-5 text-text-muted" role="img" aria-label="Нет изображения" />
      )}
    </div>
  );
};
