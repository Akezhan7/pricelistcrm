import { fireEvent, render, screen } from '@testing-library/react';
import { Edit, History } from 'lucide-react';
import { ProductRowActions } from './ProductRowActions';

test('keeps primary actions visible and puts secondary actions in a closing menu', () => {
  const onEdit = jest.fn();
  const onHistory = jest.fn();

  render(
    <ProductRowActions
      primaryActions={[{
        key: 'edit',
        label: 'Редактировать товар',
        icon: Edit,
        onClick: onEdit,
      }]}
      overflowActions={[{
        key: 'history',
        label: 'История товара',
        icon: History,
        onClick: onHistory,
      }]}
    />
  );

  fireEvent.click(screen.getByTitle('Редактировать товар'));
  expect(onEdit).toHaveBeenCalledTimes(1);

  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  fireEvent.click(screen.getByTitle('Другие действия'));
  expect(screen.getByRole('menuitem', { name: 'Редактировать товар' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('menuitem', { name: 'История товара' }));

  expect(onHistory).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});
