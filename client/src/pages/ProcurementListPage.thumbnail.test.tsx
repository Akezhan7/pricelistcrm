import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ProcurementProductThumbnail } from '../components/ProcurementProductThumbnail';

describe('ProcurementProductThumbnail', () => {
  it('shows the main product image', () => {
    render(
      <ProcurementProductThumbnail
        product={{ name: 'Плиткорез', image: '/uploads/tile-cutter.jpg' }}
      />
    );

    expect(screen.getByRole('img', { name: 'Плиткорез' })).toHaveAttribute(
      'src',
      expect.stringContaining('/uploads/tile-cutter.jpg')
    );
  });

  it('shows a placeholder when the image cannot be loaded', () => {
    render(
      <ProcurementProductThumbnail
        product={{ name: 'Плиткорез', image: '/uploads/missing.jpg' }}
      />
    );

    fireEvent.error(screen.getByRole('img', { name: 'Плиткорез' }));
    expect(screen.getByLabelText('Нет изображения')).toBeInTheDocument();
  });
});
