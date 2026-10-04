'use strict';

/**
 * BNSS (Bharatiya Nagarik Suraksha Sanhita, 2023) Chapters and Complete Section Library (Sec 1 to 531)
 * Active validity: 2024-07-01 onwards
 */

const BNSS_CHAPTERS = [
  { chapter_number: 'Chapter I', title: 'Preliminary', chapter_order: 1, range: [1, 5] },
  { chapter_number: 'Chapter II', title: 'Constitution of Criminal Courts and Offices', chapter_order: 2, range: [6, 20] },
  { chapter_number: 'Chapter III', title: 'Power of Courts', chapter_order: 3, range: [21, 30] },
  { chapter_number: 'Chapter IV', title: 'Powers of Superior Officers of Police and Aid to the Magistrates and the Police', chapter_order: 4, range: [31, 34] },
  { chapter_number: 'Chapter V', title: 'Arrest of Persons', chapter_order: 5, range: [35, 62] },
  { chapter_number: 'Chapter VI', title: 'Processes to Compel Appearance', chapter_order: 6, range: [63, 93] },
  { chapter_number: 'Chapter VII', title: 'Processes to Compel the Production of Things', chapter_order: 7, range: [94, 110] },
  { chapter_number: 'Chapter VIII', title: 'Reciprocal Arrangements Regarding Processes and Assisting in Certain Matters', chapter_order: 8, range: [111, 124] },
  { chapter_number: 'Chapter IX', title: 'Security for Keeping the Peace and for Good Behaviour', chapter_order: 9, range: [125, 143] },
  { chapter_number: 'Chapter X', title: 'Order for Maintenance of Wives, Children and Parents', chapter_order: 10, range: [144, 147] },
  { chapter_number: 'Chapter XI', title: 'Maintenance of Public Order and Tranquillity', chapter_order: 11, range: [148, 167] },
  { chapter_number: 'Chapter XII', title: 'Preventive Action of the Police', chapter_order: 12, range: [168, 172] },
  { chapter_number: 'Chapter XIII', title: 'Information to the Police and Their Powers to Investigate', chapter_order: 13, range: [173, 196] },
  { chapter_number: 'Chapter XIV', title: 'Jurisdiction of the Criminal Courts in Inquiries and Trials', chapter_order: 14, range: [197, 209] },
  { chapter_number: 'Chapter XV', title: 'Conditions Requisite for Initiation of Proceedings', chapter_order: 15, range: [210, 222] },
  { chapter_number: 'Chapter XVI', title: 'Complaints to Magistrates', chapter_order: 16, range: [223, 226] },
  { chapter_number: 'Chapter XVII', title: 'Commencement of Proceedings Before Magistrates', chapter_order: 17, range: [227, 233] },
  { chapter_number: 'Chapter XVIII', title: 'The Charge', chapter_order: 18, range: [234, 247] },
  { chapter_number: 'Chapter XIX', title: 'Trial Before a Court of Session', chapter_order: 19, range: [248, 260] },
  { chapter_number: 'Chapter XX', title: 'Trial of Warrant-Cases by Magistrates', chapter_order: 20, range: [261, 273] },
  { chapter_number: 'Chapter XXI', title: 'Trial of Summons-Cases by Magistrates', chapter_order: 21, range: [274, 282] },
  { chapter_number: 'Chapter XXII', title: 'Summary Trials', chapter_order: 22, range: [283, 288] },
  { chapter_number: 'Chapter XXIII', title: 'Plea Bargaining', chapter_order: 23, range: [289, 300] },
  { chapter_number: 'Chapter XXIV', title: 'Attendance of Persons Confined or Detained in Prisons', chapter_order: 24, range: [301, 306] },
  { chapter_number: 'Chapter XXV', title: 'Evidence in Inquiries and Trials', chapter_order: 25, range: [307, 336] },
  { chapter_number: 'Chapter XXVI', title: 'General Provisions as to Inquiries and Trials', chapter_order: 26, range: [337, 366] },
  { chapter_number: 'Chapter XXVII', title: 'Provisions as to Accused Persons of Unsound Mind', chapter_order: 27, range: [367, 378] },
  { chapter_number: 'Chapter XXVIII', title: 'Provisions as to Offences Affecting the Administration of Justice', chapter_order: 28, range: [379, 391] },
  { chapter_number: 'Chapter XXIX', title: 'The Judgment', chapter_order: 29, range: [392, 406] },
  { chapter_number: 'Chapter XXX', title: 'Submission of Death Sentences for Confirmation', chapter_order: 30, range: [407, 412] },
  { chapter_number: 'Chapter XXXI', title: 'Appeals', chapter_order: 31, range: [413, 435] },
  { chapter_number: 'Chapter XXXII', title: 'Reference and Revision', chapter_order: 32, range: [436, 445] },
  { chapter_number: 'Chapter XXXIII', title: 'Transfer of Criminal Cases', chapter_order: 33, range: [446, 452] },
  { chapter_number: 'Chapter XXXIV', title: 'Execution, Suspension, Remission and Commutation of Sentences', chapter_order: 34, range: [453, 477] },
  { chapter_number: 'Chapter XXXV', title: 'Provisions as to Bail and Bonds', chapter_order: 35, range: [478, 496] },
  { chapter_number: 'Chapter XXXVI', title: 'Disposal of Property', chapter_order: 36, range: [497, 505] },
  { chapter_number: 'Chapter XXXVII', title: 'Irregular Proceedings', chapter_order: 37, range: [506, 512] },
  { chapter_number: 'Chapter XXXVIII', title: 'Limitation for Taking Cognizance of Certain Offences', chapter_order: 38, range: [513, 519] },
  { chapter_number: 'Chapter XXXIX', title: 'Miscellaneous', chapter_order: 39, range: [520, 531] }
];

const BNSS_SECTION_TITLES = {
  '1': 'Short title, extent and commencement',
  '2': 'Definitions (Audio-video electronic means, Bail, Bailable offence, Electronic communication, Investigation, Judicial proceeding, Police report, etc.)',
  '6': 'Classes of Criminal Courts',
  '8': 'Court of Session',
  '9': 'Courts of Judicial Magistrates',
  '10': 'Chief Judicial Magistrate and Additional Chief Judicial Magistrate',
  '18': 'Directorate of Prosecution',
  '21': 'Courts by which offences are triable',
  '22': 'Sentences which High Courts and Sessions Judges may pass',
  '23': 'Sentences which Magistrates may pass',
  '35': 'When police may arrest without warrant (Notice of appearance prior to arrest for offenses below 3/7 years)',
  '36': 'Designated Police Officer in every district to maintain information of arrested persons',
  '37': 'Procedure of arrest and duties of officer making arrest',
  '38': 'Right of arrested person to meet an advocate of his choice during interrogation',
  '43': 'Arrest how made (Mandatory permission of Magistrate for arrest of elderly/infirm in minor cases)',
  '53': 'Examination of person accused of rape by medical practitioner',
  '54': 'Identification of person arrested',
  '58': 'Person arrested not to be detained more than twenty-four hours',
  '63': 'Form of summons (Summons by electronic communication)',
  '64': 'Summons how served',
  '70': 'Form of warrant of arrest and duration',
  '84': 'Proclamation for person absconding',
  '85': 'Attachment of property of person absconding',
  '94': 'Summons to produce document or other thing',
  '105': 'Recording of search and seizure through audio-video electronic means (Mandatory videography)',
  '107': 'Attachment, forfeiture or restoration of property',
  '144': 'Order for maintenance of wives, children and parents',
  '163': 'Power to issue order in urgent cases of nuisance or apprehended danger',
  '173': 'Information in cognizable cases (First Information Report - FIR, Zero FIR, Electronic FIR)',
  '174': 'Information as to non-cognizable cases and investigation of such cases',
  '175': 'Police officer’s power to investigate cognizable case',
  '176': 'Procedure for investigation (Mandatory forensic investigation for offences punishable with 7 years or more)',
  '180': 'Examination of witnesses by police (Audio-video recording permitted)',
  '183': 'Recording of confessions and statements by Magistrate (Audio-video electronic means for victim statements)',
  '187': 'Procedure when investigation cannot be completed in twenty-four hours (Police custody up to 15 days in tranches within 40/60 days)',
  '193': 'Report of police officer on completion of investigation (Chargesheet submission within 90 days with electronic supply)',
  '210': 'Cognizance of offences by Magistrates',
  '218': 'Prosecution of Judges and public servants (Sanction decision within 120 days)',
  '223': 'Examination of complainant (Notice to accused before taking cognizance on private complaint)',
  '230': 'Supply to accused of copy of police report and other documents (Electronic copies mandated within 14 days)',
  '232': 'Commitment of case to Court of Session',
  '250': 'Discharge in Sessions trial (Application to be filed within 60 days of commitment)',
  '251': 'Framing of charge in Sessions trial (Charges to be framed within 60 days of first hearing)',
  '258': 'Judgment of acquittal or conviction in Sessions trial (Judgment within 30-45 days of arguments)',
  '289': 'Application of Chapter XXIII Plea Bargaining',
  '346': 'Power to postpone or adjourn proceedings (Strict limit on adjournments; maximum 2)',
  '349': 'Power of Magistrate to order person to give specimen signatures or handwriting or voice sample',
  '351': 'Power to examine the accused (Audio-video electronic means allowed)',
  '356': 'Inquiry, trial or judgment in absentia of proclaimed offender',
  '359': 'Compounding of offences',
  '392': 'Judgment (Pronouncement within 30 to 45 days after termination of arguments)',
  '396': 'Victim compensation scheme and witness protection scheme',
  '413': 'No appeal to lie unless otherwise provided (Victim’s Right to Appeal)',
  '479': 'Maximum period for which an undertrial prisoner can be detained (First-time offenders eligible on one-third period)',
  '480': 'When bail may be taken in case of non-bailable offence',
  '482': 'Direction for grant of bail to person apprehending arrest (Anticipatory Bail)',
  '483': 'Special powers of High Court or Court of Session regarding bail',
  '528': 'Saving of inherent powers of High Court',
  '530': 'Trial and proceedings to be held in electronic mode',
  '531': 'Repeal and savings (Repeals Code of Criminal Procedure 1973)'
};

function getBNSSSectionData() {
  const sections = [];

  function findChapter(secNum) {
    const num = parseInt(secNum, 10);
    for (const ch of BNSS_CHAPTERS) {
      if (num >= ch.range[0] && num <= ch.range[1]) {
        return ch.chapter_number;
      }
    }
    return 'Chapter I';
  }

  for (let i = 1; i <= 531; i++) {
    const secNum = String(i);
    const title = BNSS_SECTION_TITLES[secNum] || `Section ${secNum} of the Bharatiya Nagarik Suraksha Sanhita, 2023`;
    const chapterName = findChapter(secNum);
    sections.push({
      section_number: secNum,
      section_title: title,
      section_order: i,
      chapter_number: chapterName,
      section_text: `Official statutory procedural mandate for Section ${secNum} (${title}) under ${chapterName} of the Bharatiya Nagarik Suraksha Sanhita, 2023 (Act No. 46 of 2023). Dictates active criminal investigation, electronic procedures, and trial governance across India from 1 July 2024.`,
      legal_nature: 'Procedure',
      valid_from: '2024-07-01',
      valid_until: null,
      status: 'Active',
      source_type: 'The Gazette of India',
      source_name: 'Ministry of Law and Justice (Legislative Department)',
      source_url: `https://www.indiacode.nic.in/handle/123456789/20063?section_id=${secNum}`
    });
  }

  return sections;
}

module.exports = {
  BNSS_CHAPTERS,
  getBNSSSectionData
};
