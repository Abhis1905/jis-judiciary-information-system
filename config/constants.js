'use strict';

/**
 * Centralized application constants, domain enums, state transitions, and input validation limits.
 */

const CASE_STATUSES = Object.freeze({
  FILED: 'Filed',
  ALLOCATED: 'Allocated',
  IN_TRIAL: 'In Trial',
  JUDGEMENT_PENDING: 'Judgement Pending',
  CLOSED: 'Closed'
});

const CASE_STATUS_LIST = Object.freeze(Object.values(CASE_STATUSES));

/**
 * Valid status transitions enforced across the case lifecycle (M-9):
 * Filed -> Allocated -> In Trial -> Judgement Pending -> Closed
 */
const VALID_STATUS_TRANSITIONS = Object.freeze({
  [CASE_STATUSES.FILED]: [CASE_STATUSES.ALLOCATED],
  [CASE_STATUSES.ALLOCATED]: [CASE_STATUSES.IN_TRIAL],
  [CASE_STATUSES.IN_TRIAL]: [CASE_STATUSES.JUDGEMENT_PENDING, CASE_STATUSES.CLOSED],
  [CASE_STATUSES.JUDGEMENT_PENDING]: [CASE_STATUSES.CLOSED],
  [CASE_STATUSES.CLOSED]: []
});

const JUDGE_ALLOWED_STATUS_UPDATES = Object.freeze([
  CASE_STATUSES.IN_TRIAL,
  CASE_STATUSES.JUDGEMENT_PENDING
]);

const CASE_TYPES = Object.freeze(['Civil', 'Criminal', 'Constitutional', 'Family']);

const VERDICT_TYPES = Object.freeze(['Guilty', 'Not Guilty', 'Dismissed', 'Settled', 'Other']);

const HEARING_TYPES = Object.freeze(['First Hearing', 'Interim', 'Final']);

const DOCUMENT_TYPES = Object.freeze(['FIR', 'Charge Sheet', 'Affidavit', 'Other']);

const EFILING_TYPES = Object.freeze(['Application', 'Petition', 'Reply', 'Other']);

const PLEADING_TYPES = Object.freeze(['Written Statement', 'Counter-Claim', 'Rejoinder', 'Other']);

const DOCUMENT_CATEGORIES = Object.freeze(['document', 'efiling', 'pleading', 'vakalatnama', 'judgement']);

const RECORD_PROVENANCE = Object.freeze({
  REAL_VERIFIED: 'REAL_VERIFIED',
  SYNTHETIC_REPRESENTATIVE: 'SYNTHETIC_REPRESENTATIVE',
  SYNTHETIC_WORKFLOW: 'SYNTHETIC_WORKFLOW',
  STAFF_FILED: 'STAFF_FILED'
});

const INPUT_LIMITS = Object.freeze({
  CASE_NUMBER_MAX: 50,
  TITLE_MAX: 255,
  PARTY_NAME_MAX: 150,
  DESCRIPTION_MAX: 10000,
  COURT_ROOM_MAX: 50,
  NOTE_CONTENT_MAX: 10000,
  JUDGEMENT_SUMMARY_MAX: 20000,
  STATUS_UPDATE_MAX: 5000,
  CLIENT_NAME_MAX: 150,
  FILING_DESCRIPTION_MAX: 255,
  SCHEDULING_REASON_MAX: 2000,
  APPEAL_GROUNDS_MAX: 10000
});

module.exports = {
  CASE_STATUSES,
  CASE_STATUS_LIST,
  VALID_STATUS_TRANSITIONS,
  JUDGE_ALLOWED_STATUS_UPDATES,
  CASE_TYPES,
  VERDICT_TYPES,
  HEARING_TYPES,
  DOCUMENT_TYPES,
  EFILING_TYPES,
  PLEADING_TYPES,
  DOCUMENT_CATEGORIES,
  RECORD_PROVENANCE,
  INPUT_LIMITS
};
