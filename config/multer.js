'use strict';

const multer = require('multer');
const path   = require('path');
const crypto = require('crypto');
const { verifyMultipartCsrf } = require('../middleware/csrfMiddleware');

// ── Allowed MIME types & Extensions (A7 decision: PDF, DOCX, JPG, PNG) ──────────
const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
]);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.jpg', '.jpeg', '.png']);
const PDF_ONLY_EXTENSIONS = new Set(['.pdf']);

// Judgement PDFs are PDF-only
const PDF_ONLY_MIMES = new Set(['application/pdf']);

// ── File filter factory ─────────────────────────────────────────────
function makeFileFilter(allowedMimes, allowedExts = ALLOWED_EXTENSIONS) {
  return (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (allowedMimes.has(file.mimetype) && allowedExts.has(ext)) {
      cb(null, true);
    } else {
      const err = new Error(
        `File type not allowed. Accepted extensions: ${[...allowedExts].join(', ')}`
      );
      err.statusCode = 400;
      cb(err, false);
    }
  };
}

// ── Disk storage factory ────────────────────────────────────────────
function makeStorage(subdir) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '..', 'uploads', subdir));
    },
    filename: (req, file, cb) => {
      const ext    = path.extname(file.originalname).toLowerCase();
      const unique = crypto.randomBytes(16).toString('hex');
      cb(null, `${Date.now()}-${unique}${ext}`);
    }
  });
}

/**
 * Wrap a multer instance so .single(field) automatically runs verifyMultipartCsrf
 * immediately after parsing multipart/form-data fields.
 */
function wrapWithCsrf(multerInstance) {
  return {
    single(fieldName) {
      const middleware = multerInstance.single(fieldName);
      return (req, res, next) => {
        middleware(req, res, (err) => {
          if (err) {
            if (err instanceof multer.MulterError) {
              err.statusCode = 400;
            }
            return next(err);
          }
          verifyMultipartCsrf(req, res, next);
        });
      };
    }
  };
}

// ── Multer instances ────────────────────────────────────────────────
const uploadDocument    = wrapWithCsrf(multer({ storage: makeStorage('edocuments'),  fileFilter: makeFileFilter(ALLOWED_MIMES, ALLOWED_EXTENSIONS),  limits: { fileSize: 10 * 1024 * 1024 } }));
const uploadEFiling     = wrapWithCsrf(multer({ storage: makeStorage('efilings'),    fileFilter: makeFileFilter(ALLOWED_MIMES, ALLOWED_EXTENSIONS),  limits: { fileSize: 10 * 1024 * 1024 } }));
const uploadPleading    = wrapWithCsrf(multer({ storage: makeStorage('pleadings'),   fileFilter: makeFileFilter(ALLOWED_MIMES, ALLOWED_EXTENSIONS),  limits: { fileSize: 10 * 1024 * 1024 } }));
const uploadVakalatnama = wrapWithCsrf(multer({ storage: makeStorage('vakalatnama'), fileFilter: makeFileFilter(ALLOWED_MIMES, ALLOWED_EXTENSIONS),  limits: { fileSize: 10 * 1024 * 1024 } }));
const uploadJudgement   = wrapWithCsrf(multer({ storage: makeStorage('judgements'),  fileFilter: makeFileFilter(PDF_ONLY_MIMES, PDF_ONLY_EXTENSIONS), limits: { fileSize: 20 * 1024 * 1024 } }));

module.exports = {
  uploadDocument,
  uploadEFiling,
  uploadPleading,
  uploadVakalatnama,
  uploadJudgement
};
