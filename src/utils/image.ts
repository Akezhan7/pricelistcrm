// Утилита для формирования корректного URL изображения
// Принимает либо уже абсолютный URL, либо относительный путь, начинающийся с '/uploads/...'
const DEFAULT_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Если API URL заканчивается на /api — убираем эту часть, чтобы получить базовый хост
const IMAGE_BASE = DEFAULT_API_URL.replace(/\/api\/?$/, '');

export default function getImageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/')) return `${IMAGE_BASE}${path}`;
  return `${IMAGE_BASE}/${path}`;
}
