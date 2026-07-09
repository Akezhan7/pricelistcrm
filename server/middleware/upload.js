const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Определяем директорию для загрузок.
// По умолчанию используем папку `../../uploads` относительно middleware — это корневая папка проекта `/uploads`.
// Ранее в коде использовалась `../uploads` (server/uploads), что приводило к рассинхронизации с express.static.
// Use project root uploads folder explicitly to avoid mismatches when code is run from different cwd
const defaultUploadsDir = path.resolve(process.cwd(), 'uploads');
let uploadsDir = process.env.UPLOAD_DIR;
if (uploadsDir) {
  // Если задан относительный путь в env, приводим его к абсолютному на базе текущей рабочей директории
  uploadsDir = path.isAbsolute(uploadsDir) ? uploadsDir : path.resolve(process.cwd(), uploadsDir);
} else {
  uploadsDir = defaultUploadsDir;
}

// Создание директории uploads если она не существует
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Создание уникального имени файла
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const sanitizedName = name.replace(/[^a-zA-Z0-9а-яёА-ЯЁ]/g, '-');
    cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Разрешенные типы файлов изображений
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Недопустимый тип файла. Разрешены только изображения (JPEG, PNG, GIF, WebP)'), false);
  }
};

// Для чеков платежей: фото + PDF
const receiptFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Недопустимый тип файла. Разрешены изображения (JPEG, PNG, GIF, WebP) и PDF'), false);
  }
};

const productAssetFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
    'application/x-photoshop',
    'application/photoshop',
    'image/vnd.adobe.photoshop',
    'image/photoshop',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Недопустимый тип файла для материалов товара'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB по умолчанию
  },
});

const uploadReceipt = multer({
  storage,
  fileFilter: receiptFileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
  },
});

const uploadProductAsset = multer({
  storage,
  fileFilter: productAssetFileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_PSD_FILE_SIZE) || 200 * 1024 * 1024,
  },
});

// Middleware для обработки ошибок загрузки
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Файл слишком большой для выбранного типа загрузки',
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Слишком много файлов',
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Неожиданное поле файла',
      });
    }
  }

  if (err.message.includes('Недопустимый тип файла')) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next(err);
};

module.exports = {
  upload,
  uploadReceipt,
  uploadProductAsset,
  handleUploadError,
};
