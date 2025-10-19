import React from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

type DeleteConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  title: string;
  message: string;
  itemName?: string;
};

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading,
  title,
  message,
  itemName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-gray-700 mb-2">{message}</p>
          {itemName && (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 mb-4">
              <strong>Элемент:</strong> {itemName}
            </p>
          )}
          <p className="text-sm text-red-600 font-medium">
            Это действие нельзя отменить!
          </p>
        </div>

        <div className="flex justify-end space-x-3 p-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={loading}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {loading ? 'Удаление...' : 'Удалить'}
          </button>
        </div>
      </div>
    </div>
  );
};
