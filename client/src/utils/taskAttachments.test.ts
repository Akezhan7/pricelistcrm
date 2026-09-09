import type { EmployeeTaskAttachment } from '../types';
import { getTaskImageAttachments, isTaskImageAttachment } from './taskAttachments';

const attachment = (id: number, originalName: string, mimeType: string): EmployeeTaskAttachment => ({
  id,
  taskId: 1,
  uploadedByUserId: 1,
  originalName,
  mimeType,
  size: 100,
  createdAt: '2026-09-09T00:00:00.000Z',
});

test('keeps only previewable task images in attachment order', () => {
  const files = [
    attachment(1, 'brief.pdf', 'application/pdf'),
    attachment(2, 'photo.png', 'image/png'),
    attachment(3, 'scan.JPG', 'application/octet-stream'),
    attachment(4, 'archive.zip', 'application/zip'),
  ];

  expect(isTaskImageAttachment(files[1])).toBe(true);
  expect(getTaskImageAttachments(files).map((file) => file.id)).toEqual([2, 3]);
});
