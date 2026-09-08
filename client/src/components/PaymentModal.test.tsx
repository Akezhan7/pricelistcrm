import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PaymentModal from './PaymentModal';
import type { Order } from '../types';

const order = {
  id: 22,
  orderNumber: 'ORD-22',
  totalAmount: 10000,
  paidAmount: 2000,
  paymentStatus: 'Частично оплачено',
} as Order;

test('submits the selected receipt with a partial order payment', async () => {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  const receipt = new File(['receipt'], 'payment.pdf', { type: 'application/pdf' });

  render(
    <PaymentModal
      isOpen
      onClose={jest.fn()}
      onSubmit={onSubmit}
      order={order}
    />
  );

  fireEvent.change(screen.getByLabelText('Сумма оплаты (тенге)'), { target: { value: '3000' } });
  fireEvent.change(screen.getByLabelText('Чек (необязательно)'), {
    target: { files: [receipt] },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Зарегистрировать оплату' }));

  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(3000, undefined, receipt));
});

test('does not submit a receipt removed before payment', async () => {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  const receipt = new File(['receipt'], 'payment.png', { type: 'image/png' });

  render(
    <PaymentModal
      isOpen
      onClose={jest.fn()}
      onSubmit={onSubmit}
      order={order}
    />
  );

  fireEvent.change(screen.getByLabelText('Сумма оплаты (тенге)'), { target: { value: '1000' } });
  fireEvent.change(screen.getByLabelText('Чек (необязательно)'), {
    target: { files: [receipt] },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Убрать чек' }));
  fireEvent.click(screen.getByRole('button', { name: 'Зарегистрировать оплату' }));

  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(1000, undefined, undefined));
});

test('does not register payment after selecting a forbidden receipt file', async () => {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  const receipt = new File(['receipt'], 'payment.exe', { type: 'application/x-msdownload' });

  render(
    <PaymentModal
      isOpen
      onClose={jest.fn()}
      onSubmit={onSubmit}
      order={order}
    />
  );

  fireEvent.change(screen.getByLabelText('Сумма оплаты (тенге)'), { target: { value: '1000' } });
  fireEvent.change(screen.getByLabelText('Чек (необязательно)'), {
    target: { files: [receipt] },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Зарегистрировать оплату' }));

  expect(await screen.findByText('Разрешены изображения JPEG, PNG, GIF, WebP и PDF')).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});
