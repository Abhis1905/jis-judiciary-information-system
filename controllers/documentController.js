'use strict';

const fs                = require('fs');
const path              = require('path');
const Document          = require('../models/Document');
const EFiling           = require('../models/EFiling');
const Pleading          = require('../models/Pleading');
const Vakalatnama       = require('../models/Vakalatnama');
const Judgement         = require('../models/Judgement');
const Case              = require('../models/Case');
const {
  DOCUMENT_TYPES,
  DOCUMENT_CATEGORIES,
  INPUT_LIMITS
} = require('../config/constants');

/**
 * POST /registrar/cases/:id/documents
 * R3 Section B – E-Document Upload by Registrar
 * Supported types: FIR, Charge Sheet, Affidavit, Other
 * Accepted formats: PDF, DOCX, JPG, PNG (enforced by Multer)
 */
exports.postUploadDocument = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.id, 10);
    const { document_type, description } = req.body;
    const file = req.file;

    if (isNaN(caseId)) {
      if (file && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(404).render('errors/404', { title: 'Case Not Found – JIS' });
    }

    const caseRecord = await Case.findById(caseId);
    if (!caseRecord) {
      if (file && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(404).render('errors/404', { title: 'Case Not Found – JIS' });
    }

    if (!file) {
      req.session.flash = { error: 'Please select a valid document file to upload (PDF, DOCX, JPG, PNG).' };
      return res.redirect(`/registrar/cases/${caseId}`);
    }

    if (!DOCUMENT_TYPES.includes(document_type)) {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      req.session.flash = { error: 'Invalid document type selected.' };
      return res.redirect(`/registrar/cases/${caseId}`);
    }

    const trimmedDesc = description ? description.trim() : null;
    if (trimmedDesc && trimmedDesc.length > INPUT_LIMITS.FILING_DESCRIPTION_MAX) {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      req.session.flash = { error: `Description cannot exceed ${INPUT_LIMITS.FILING_DESCRIPTION_MAX} characters.` };
      return res.redirect(`/registrar/cases/${caseId}`);
    }

    await Document.create({
      caseId,
      uploadedBy:   req.session.user.id,
      documentType: document_type,
      originalName: file.originalname,
      fileName:     file.filename,
      filePath:     file.path,
      mimeType:     file.mimetype,
      description:  trimmedDesc
    });

    req.session.flash = {
      success: `E-Document (${document_type}: ${file.originalname}) uploaded successfully.`
    };
    res.redirect(`/registrar/cases/${caseId}`);
  } catch (err) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(err);
  }
};

/**
 * Helper to normalize a record from any of the 5 document tables.
 */
function normalizeDocRecord(category, record) {
  if (!record) return null;
  if (category === 'judgement') {
    if (!record.pdf_path) return null;
    return {
      category,
      filePath: record.pdf_path,
      mimeType: 'application/pdf',
      originalName: record.pdf_name || 'Judgement.pdf',
      caseId: record.case_id
    };
  }
  if (!record.file_path) return null;
  return {
    category,
    filePath: record.file_path,
    mimeType: record.mime_type || 'application/octet-stream',
    originalName: record.original_name || 'document',
    caseId: record.case_id
  };
}

/**
 * Check if a user is authorized to access documents for a given caseRecord.
 */
function isUserAuthorizedForCase(user, caseRecord) {
  if (!user || !caseRecord) return false;
  if (user.role === 'registrar') return true;
  if (user.role === 'judge') return caseRecord.judge_id === user.id;
  if (user.role === 'prosecutor') return caseRecord.prosecutor_id === user.id;
  if (user.role === 'advocate') {
    return caseRecord.advocate_id === null || caseRecord.advocate_id === user.id;
  }
  return false;
}

/**
 * GET /documents/:type/:id and GET /documents/:id
 * S3 – Document Viewer / Download
 * Resolves document unambiguously by category/type (H-8) and enforces strict RBAC ownership.
 */
exports.getDocument = async (req, res, next) => {
  try {
    const docId = parseInt(req.params.id, 10);
    if (isNaN(docId) || docId <= 0) {
      return res.status(404).render('errors/404', { title: 'Document Not Found – JIS' });
    }

    const requestedType = (req.params.type || req.query.type || '').toLowerCase().trim();
    let targetDoc = null;

    if (requestedType) {
      if (!DOCUMENT_CATEGORIES.includes(requestedType)) {
        return res.status(404).render('errors/404', {
          title: 'Invalid Document Category – JIS',
          message: `Invalid document category '${requestedType}'.`
        });
      }

      if (requestedType === 'document') {
        targetDoc = normalizeDocRecord('document', await Document.findById(docId));
      } else if (requestedType === 'efiling') {
        targetDoc = normalizeDocRecord('efiling', await EFiling.findById(docId));
      } else if (requestedType === 'pleading') {
        targetDoc = normalizeDocRecord('pleading', await Pleading.findById(docId));
      } else if (requestedType === 'vakalatnama') {
        targetDoc = normalizeDocRecord('vakalatnama', await Vakalatnama.findById(docId));
      } else if (requestedType === 'judgement') {
        targetDoc = normalizeDocRecord('judgement', await Judgement.findById(docId));
      }
    } else {
      // Legacy untyped route: check all tables and detect cross-table collisions (H-8)
      const [doc, ef, pl, vak, judg] = await Promise.all([
        Document.findById(docId),
        EFiling.findById(docId),
        Pleading.findById(docId),
        Vakalatnama.findById(docId),
        Judgement.findById(docId)
      ]);

      const candidates = [
        normalizeDocRecord('document', doc),
        normalizeDocRecord('efiling', ef),
        normalizeDocRecord('pleading', pl),
        normalizeDocRecord('vakalatnama', vak),
        normalizeDocRecord('judgement', judg)
      ].filter(Boolean);

      if (candidates.length === 1) {
        targetDoc = candidates[0];
      } else if (candidates.length > 1) {
        // Disambiguate by checking which candidate(s) belong to a case authorized for this user
        const authorizedCandidates = [];
        for (const cand of candidates) {
          const cRec = await Case.findById(cand.caseId);
          if (cRec && isUserAuthorizedForCase(req.session.user, cRec)) {
            authorizedCandidates.push(cand);
          }
        }
        if (authorizedCandidates.length === 1) {
          targetDoc = authorizedCandidates[0];
        } else if (authorizedCandidates.length === 0) {
          return res.status(403).render('errors/403', {
            title: 'Access Denied – JIS',
            message: 'You are not authorized to access this document.'
          });
        } else {
          // Multiple authorized documents share the same numeric ID across different tables
          return res.status(400).render('errors/404', {
            title: 'Ambiguous Document Reference – JIS',
            message: 'Ambiguous document ID across categories. Please use the typed document link (/documents/:type/:id).'
          });
        }
      }
    }

    if (!targetDoc || !targetDoc.filePath) {
      return res.status(404).render('errors/404', {
        title: 'Document Not Found – JIS',
        message: 'The requested document record does not exist in the system.'
      });
    }

    // Role-based case ownership & authorization verification
    const user = req.session.user;
    if (targetDoc.caseId && user) {
      const caseRecord = await Case.findById(targetDoc.caseId);
      if (!caseRecord) {
        return res.status(404).render('errors/404', { title: 'Case Not Found – JIS' });
      }

      if (!isUserAuthorizedForCase(user, caseRecord)) {
        return res.status(403).render('errors/403', {
          title: 'Access Denied – JIS',
          message: 'You are not authorized to access documents for a case not assigned to your docket.'
        });
      }
    }

    // Strict path traversal & existence verification
    const uploadsRoot = path.resolve(__dirname, '..', 'uploads');
    const resolvedPath = path.resolve(targetDoc.filePath);

    if (!resolvedPath.startsWith(uploadsRoot + path.sep) || !fs.existsSync(resolvedPath)) {
      return res.status(404).render('errors/404', {
        title: 'File Not Found – JIS',
        message: 'The document file is not present on server storage.'
      });
    }

    // Serve file inline with disposition header
    res.setHeader('Content-Type', targetDoc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(targetDoc.originalName)}"`);
    res.sendFile(resolvedPath);
  } catch (err) {
    next(err);
  }
};
