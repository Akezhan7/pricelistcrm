import type { EmployeeTaskAttachment } from '../types';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function getExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
}

export function isTaskImageAttachment(attachment: EmployeeTaskAttachment) {
  return attachment.mimeType.startsWith('image/') || IMAGE_EXTENSIONS.has(getExtension(attachment.originalName));
}

export function getTaskImageAttachments(attachments: EmployeeTaskAttachment[]) {
  return attachments.filter(isTaskImageAttachment);
}
