import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProductsPage } from './ProductsPage';
import api from '../utils/api';

jest.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
}), { virtual: true });

jest.mock('../utils/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'admin' } }),
}));

jest.mock('../context/UIContext', () => ({
  useUI: () => ({ searchQuery: '', setSearchQuery: jest.fn() }),
}));

jest.mock('../components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../components/ProductList', () => ({
  ProductList: ({ onRefresh }: { onRefresh: () => void }) => {
    const [page, setPage] = require('react').useState(1);
    return (
      <div>
        <span>Страница {page}</span>
        <button onClick={() => setPage(4)}>Перейти на страницу 4</button>
        <button onClick={onRefresh}>Обновить список</button>
      </div>
    );
  },
}));

jest.mock('../components/ui', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  IconButton: ({ title, onClick }: { title: string; onClick: () => void }) => (
    <button title={title} onClick={onClick} />
  ),
  Spinner: () => <span>Загрузка</span>,
}));

jest.mock('../services/categoryApi', () => ({
  __esModule: true,
  default: { getCategoryById: jest.fn() },
}));

const mockedGet = api.get as jest.MockedFunction<typeof api.get>;

function productsResponse() {
  return Promise.resolve({
    data: { data: { products: [], pagination: { total: 0 } } },
  });
}

test('keeps the product list mounted while products refresh', async () => {
  mockedGet.mockImplementationOnce(productsResponse);

  render(<ProductsPage />);

  await screen.findByText('Страница 1');
  fireEvent.click(screen.getByText('Перейти на страницу 4'));
  expect(screen.getByText('Страница 4')).toBeInTheDocument();

  let finishRefresh: ((value: Awaited<ReturnType<typeof api.get>>) => void) | undefined;
  mockedGet.mockImplementationOnce(
    () => new Promise((resolve) => { finishRefresh = resolve; })
  );

  fireEvent.click(screen.getByText('Обновить список'));
  expect(screen.getByText('Страница 4')).toBeInTheDocument();

  finishRefresh?.({ data: { data: { products: [], pagination: { total: 0 } } } } as Awaited<ReturnType<typeof api.get>>);
  await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2));
});
