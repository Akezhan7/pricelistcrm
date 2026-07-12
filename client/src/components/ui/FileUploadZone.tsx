import React from 'react';
import { Upload } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface FileUploadZoneProps {
  onFileChange?: (file: File | null) => void;
  onFilesChange?: (files: File[]) => void;
  accept?: string;
  selectedFile?: File | null;
  selectedFiles?: File[];
  multiple?: boolean;
  label?: string;
  hint?: string;
  className?: string;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileChange,
  onFilesChange,
  accept = 'image/*',
  selectedFile,
  selectedFiles = [],
  multiple = false,
  label = 'Выберите файл',
  hint = 'PNG, JPG до 5MB',
  className,
}) => {
  const selectedCount = multiple ? selectedFiles.length : selectedFile ? 1 : 0;

  return (
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
              multiple={multiple}
              onChange={(event) => {
                const files = Array.from(event.target.files || []);
                if (multiple) {
                  onFilesChange?.(files);
                } else {
                  onFileChange?.(files[0] || null);
                }
                event.target.value = '';
              }}
            />
          </label>
        </div>
        <p className="text-xs text-text-muted mt-1">{hint}</p>
        {selectedFile && !multiple && (
          <p className="text-xs text-success mt-1 font-medium">Выбрано: {selectedFile.name}</p>
        )}
        {multiple && selectedCount > 0 && (
          <div className="mt-2 space-y-1 text-xs text-success">
            <p className="font-medium">Выбрано файлов: {selectedCount}</p>
            <div className="mx-auto max-w-sm space-y-0.5 text-left">
              {selectedFiles.slice(0, 5).map((file) => (
                <p key={`${file.name}-${file.size}-${file.lastModified}`} className="truncate">
                  {file.name}
                </p>
              ))}
              {selectedFiles.length > 5 && (
                <p className="text-text-muted">И еще {selectedFiles.length - 5}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
