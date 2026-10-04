'use strict';

/**
 * Legal Categories (Taxonomy) for the JIS Legal Knowledge Repository
 * Domains:
 * - Criminal Law
 * - Constitutional Law
 * - Civil Law
 * - Family Law
 * - Commercial Law
 * - Evidence & Procedure
 * - Administrative Law
 */

const LEGAL_CATEGORIES = [
  {
    code: 'CAT_CRIM_HOMICIDE',
    name: 'Offences Against Human Life (Homicide, Murder, Suicide)',
    domain: 'Criminal Law',
    description: 'Statutory provisions and jurisprudence dealing with culpable homicide, murder, transfer of malice, attempt to murder, causing death by negligence, dowry death, and abetment of suicide.'
  },
  {
    code: 'CAT_CRIM_WOMEN_CHILD',
    name: 'Offences Against Women and Children',
    domain: 'Criminal Law',
    description: 'Provisions regarding rape, gang rape, sexual harassment, voyeurism, stalking, outraging modesty, cruelty by husband/relatives, child abuse, and trafficking.'
  },
  {
    code: 'CAT_CRIM_BODILY_HURT',
    name: 'Offences Against Bodily Integrity (Hurt, Force, Confinement)',
    domain: 'Criminal Law',
    description: 'Simple and grievous hurt, acid attacks, wrongful restraint, wrongful confinement, criminal force, and assault.'
  },
  {
    code: 'CAT_CRIM_PROPERTY',
    name: 'Offences Against Property (Theft, Robbery, Dacoity, Cheating)',
    domain: 'Criminal Law',
    description: 'Theft, extortion, robbery, dacoity, criminal misappropriation, criminal breach of trust, receiving stolen property, cheating, and mischief.'
  },
  {
    code: 'CAT_CRIM_FORGERY_DOCS',
    name: 'Offences Relating to Documents and Property Marks',
    domain: 'Criminal Law',
    description: 'Forgery, making false documents, using forged documents, falsification of accounts, and counterfeiting currency notes or stamps.'
  },
  {
    code: 'CAT_CRIM_STATE_PUBLIC',
    name: 'Offences Against the State & Public Tranquillity',
    domain: 'Criminal Law',
    description: 'Treason, waging war against India, sovereignty threats, terrorism, unlawful assembly, rioting, affray, and promoting enmity between groups.'
  },
  {
    code: 'CAT_CRIM_JUSTICE_ADMIN',
    name: 'Offences Against Public Justice & Authority',
    domain: 'Criminal Law',
    description: 'Giving false evidence (perjury), fabricating evidence, destruction of evidence, disobedience of lawful public orders, and harbouring offenders.'
  },
  {
    code: 'CAT_CRIM_GENERAL_DEF',
    name: 'General Exceptions & Defences',
    domain: 'Criminal Law',
    description: 'Private defence, accident, infancy (doli incapax), insanity (McNaughten rule), intoxication, necessity, consent, and act done under threat.'
  },
  {
    code: 'CAT_PROC_INVESTIGATION',
    name: 'Investigation, FIR, and Police Powers',
    domain: 'Evidence & Procedure',
    description: 'FIR, Zero FIR, investigatory powers, search & seizure, audio-video recording, witness examination by police, and diary of proceedings.'
  },
  {
    code: 'CAT_PROC_ARREST_BAIL',
    name: 'Arrest, Remand, Bail, and Bonds',
    domain: 'Evidence & Procedure',
    description: 'Arrest guidelines (D.K. Basu, Arnesh Kumar), notices under Sec 41A/35, police custody remand under 167/187, bailable bail, non-bailable bail (437/480), anticipatory bail (438/482), and HC/Sessions bail (439/483).'
  },
  {
    code: 'CAT_PROC_TRIAL_JUDGMENT',
    name: 'Criminal Trial Procedure, Charges, and Judgment',
    domain: 'Evidence & Procedure',
    description: 'Framing of charges, discharge, Sessions trial, warrant trial, summons trial, summary trial, examination of accused (313/351), plea bargaining, and judgment pronunciation.'
  },
  {
    code: 'CAT_PROC_APPEALS_REVISION',
    name: 'Appeals, Revisions, and Inherent Powers',
    domain: 'Evidence & Procedure',
    description: 'Appeals against conviction/acquittal, victim appeals, criminal revision, and inherent powers of the High Court (CrPC 482 / BNSS 528).'
  },
  {
    code: 'CAT_EVID_RELEVANCY_CONF',
    name: 'Relevancy, Admissions, and Confessions',
    domain: 'Evidence & Procedure',
    description: 'Res gestae, motive & conduct, plea of alibi, admissions, bar on police confessions, discovery/recovery under Sec 27/23, and dying declarations.'
  },
  {
    code: 'CAT_EVID_DOC_ELECTRONIC',
    name: 'Documentary & Electronic Evidence',
    domain: 'Evidence & Procedure',
    description: 'Primary and secondary evidence, public documents, certified copies, admissibility of electronic records (Sec 65B / Sec 63 BSA certificates), and digital forensics.'
  },
  {
    code: 'CAT_EVID_BURDEN_WITNESS',
    name: 'Burden of Proof, Presumptions & Witnesses',
    domain: 'Evidence & Procedure',
    description: 'Burden of proof (101-106), statutory presumptions (dowry death, rape consent), witness competency, attorney-client privilege, examination-in-chief, cross-examination, and hostile witnesses.'
  },
  {
    code: 'CAT_CONST_FUND_RIGHTS',
    name: 'Fundamental Rights & Judicial Review',
    domain: 'Constitutional Law',
    description: 'Article 14 equality & non-arbitrariness, Article 19 basic freedoms, Article 20 protection in criminal prosecution, Article 21 right to life, privacy and liberty, and Article 32 writ jurisdiction.'
  },
  {
    code: 'CAT_CONST_JUDICIARY_POWERS',
    name: 'Powers of Supreme Court & High Courts',
    domain: 'Constitutional Law',
    description: 'Supreme Court original and appellate jurisdiction (Art 131, 136), binding precedent (Art 141), complete justice (Art 142), High Court writ jurisdiction (Art 226), and superintendence (Art 227).'
  },
  {
    code: 'CAT_CIVIL_PROCEDURE',
    name: 'Civil Procedure, Pleadings & Decrees',
    domain: 'Civil Law',
    description: 'Civil court jurisdiction (Sec 9), res sub-judice (Sec 10), res judicata (Sec 11), plaints, decrees, execution, appeals, ADR (Sec 89), and inherent civil powers (Sec 151).'
  },
  {
    code: 'CAT_COMMERCIAL_LAW',
    name: 'Commercial Litigation & Dispute Resolution',
    domain: 'Commercial Law',
    description: 'Commercial courts, specified value thresholds, mandatory pre-institution mediation (Sec 12A CCA), expedited timelines, and commercial appeals.'
  },
  {
    code: 'CAT_FAMILY_MATRIMONIAL',
    name: 'Family, Matrimonial & Child Custody Law',
    domain: 'Family Law',
    description: 'Family courts, conciliation procedures, maintenance under CrPC 125 / BNSS 144, matrimonial property, child custody, and domestic disputes.'
  }
];

module.exports = {
  LEGAL_CATEGORIES
};
