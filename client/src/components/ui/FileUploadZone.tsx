import React from 'react';
import { Upload } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface FileUploadZoneProps {
  onFileChange: (file: File | null) => void;
  accept?: string;
  selectedFile?: File | null;
  label?: string;
  hint?: string;
  className?: string;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileChange,
  accept = 'image/*',
  selectedFile,
  label = 'Выберите файл',
  hint = 'PNG, JPG до 5MB',
  className,
}) => (
  <div
    className={cn(
      'flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-border-subtle rounded-xl',
      'bg-surface-inset hover:border-brand-yellow transition-colors duration-200',
      className
    )}
  >
    <div className="text-center">
      <Upload className="mx-auto h-8 w-8 text-text-muted" />
      <div className="mt-2">
        <label className="cursor-pointer">
          <span className="text-sm text-accent font-medium hover:text-accent-hover">{label}</span>
          <input
            type="file"
            className="hidden"
            accept={accept}
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          />
        </label>
      </div>
      <p className="text-xs text-text-muted mt-1">{hint}</p>
      {selectedFile && (
        <p className="text-xs text-success mt-1 font-medium">Выбрано: {selectedFile.name}</p>
      )}
    </div>
  </div>
);
