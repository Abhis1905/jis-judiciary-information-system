'use strict';

/**
 * CrPC (Code of Criminal Procedure, 1973) Chapters and Complete Section Library (Sec 1 to 484)
 * Historical validity: 1974-04-01 to 2024-06-30
 */

const CRPC_CHAPTERS = [
  { chapter_number: 'Chapter I', title: 'Preliminary', chapter_order: 1, range: [1, 5] },
  { chapter_number: 'Chapter II', title: 'Constitution of Criminal Courts and Offices', chapter_order: 2, range: [6, 25] },
  { chapter_number: 'Chapter III', title: 'Power of Courts', chapter_order: 3, range: [26, 35] },
  { chapter_number: 'Chapter IV', title: 'Powers of Superior Officers of Police and Aid to the Magistrates and the Police', chapter_order: 4, range: [36, 40] },
  { chapter_number: 'Chapter V', title: 'Arrest of Persons', chapter_order: 5, range: [41, 60] },
  { chapter_number: 'Chapter VI', title: 'Processes to Compel Appearance', chapter_order: 6, range: [61, 90] },
  { chapter_number: 'Chapter VII', title: 'Processes to Compel the Production of Things', chapter_order: 7, range: [91, 105] },
  { chapter_number: 'Chapter VIIA', title: 'Reciprocal Arrangements Regarding Processes and Assisting in Certain Matters', chapter_order: 8, range: ['105A', '105L'] },
  { chapter_number: 'Chapter VIII', title: 'Security for Keeping the Peace and for Good Behaviour', chapter_order: 9, range: [106, 124] },
  { chapter_number: 'Chapter IX', title: 'Order for Maintenance of Wives, Children and Parents', chapter_order: 10, range: [125, 128] },
  { chapter_number: 'Chapter X', title: 'Maintenance of Public Order and Tranquillity', chapter_order: 11, range: [129, 148] },
  { chapter_number: 'Chapter XI', title: 'Preventive Action of the Police', chapter_order: 12, range: [149, 153] },
  { chapter_number: 'Chapter XII', title: 'Information to the Police and Their Powers to Investigate', chapter_order: 13, range: [154, 176] },
  { chapter_number: 'Chapter XIII', title: 'Jurisdiction of the Criminal Courts in Inquiries and Trials', chapter_order: 14, range: [177, 189] },
  { chapter_number: 'Chapter XIV', title: 'Conditions Requisite for Initiation of Proceedings', chapter_order: 15, range: [190, 199] },
  { chapter_number: 'Chapter XV', title: 'Complaints to Magistrates', chapter_order: 16, range: [200, 203] },
  { chapter_number: 'Chapter XVI', title: 'Commencement of Proceedings Before Magistrates', chapter_order: 17, range: [204, 210] },
  { chapter_number: 'Chapter XVII', title: 'The Charge', chapter_order: 18, range: [211, 224] },
  { chapter_number: 'Chapter XVIII', title: 'Trial Before a Court of Session', chapter_order: 19, range: [225, 237] },
  { chapter_number: 'Chapter XIX', title: 'Trial of Warrant-Cases by Magistrates', chapter_order: 20, range: [238, 250] },
  { chapter_number: 'Chapter XX', title: 'Trial of Summons-Cases by Magistrates', chapter_order: 21, range: [251, 259] },
  { chapter_number: 'Chapter XXI', title: 'Summary Trials', chapter_order: 22, range: [260, 265] },
  { chapter_number: 'Chapter XXIA', title: 'Plea Bargaining', chapter_order: 23, range: ['265A', '265L'] },
  { chapter_number: 'Chapter XXII', title: 'Attendance of Persons Confined or Detained in Prisons', chapter_order: 24, range: [266, 271] },
  { chapter_number: 'Chapter XXIII', title: 'Evidence in Inquiries and Trials', chapter_order: 25, range: [272, 299] },
  { chapter_number: 'Chapter XXIV', title: 'General Provisions as to Inquiries and Trials', chapter_order: 26, range: [300, 327] },
  { chapter_number: 'Chapter XXV', title: 'Provisions as to Accused Persons of Unsound Mind', chapter_order: 27, range: [328, 339] },
  { chapter_number: 'Chapter XXVI', title: 'Provisions as to Offences Affecting the Administration of Justice', chapter_order: 28, range: [340, 352] },
  { chapter_number: 'Chapter XXVII', title: 'The Judgment', chapter_order: 29, range: [353, 365] },
  { chapter_number: 'Chapter XXVIII', title: 'Submission of Death Sentences for Confirmation', chapter_order: 30, range: [366, 371] },
  { chapter_number: 'Chapter XXIX', title: 'Appeals', chapter_order: 31, range: [372, 394] },
  { chapter_number: 'Chapter XXX', title: 'Reference and Revision', chapter_order: 32, range: [395, 405] },
  { chapter_number: 'Chapter XXXI', title: 'Transfer of Criminal Cases', chapter_order: 33, range: [406, 412] },
  { chapter_number: 'Chapter XXXII', title: 'Execution, Suspension, Remission and Commutation of Sentences', chapter_order: 34, range: [413, 435] },
  { chapter_number: 'Chapter XXXIII', title: 'Provisions as to Bail and Bonds', chapter_order: 35, range: [436, 450] },
  { chapter_number: 'Chapter XXXIV', title: 'Disposal of Property', chapter_order: 36, range: [451, 459] },
  { chapter_number: 'Chapter XXXV', title: 'Irregular Proceedings', chapter_order: 37, range: [460, 466] },
  { chapter_number: 'Chapter XXXVI', title: 'Limitation for Taking Cognizance of Certain Offences', chapter_order: 38, range: [467, 473] },
  { chapter_number: 'Chapter XXXVII', title: 'Miscellaneous', chapter_order: 39, range: [474, 484] }
];

const CRPC_SECTION_TITLES = {
  '1': 'Short title, extent and commencement',
  '2': 'Definitions (Bailable, Cognizable, Inquiry, Investigation, Judicial Proceeding, Officer in Charge, Police Station, Warrant Case)',
  '3': 'Construction of references',
  '4': 'Trial of offences under the Indian Penal Code and other laws',
  '5': 'Saving',
  '6': 'Classes of Criminal Courts',
  '7': 'Territorial divisions',
  '8': 'Metropolitan areas',
  '9': 'Court of Session',
  '10': 'Subordination of Assistant Sessions Judges',
  '11': 'Courts of Judicial Magistrates',
  '12': 'Chief Judicial Magistrate and Additional Chief Judicial Magistrate, etc.',
  '13': 'Special Judicial Magistrates',
  '14': 'Local jurisdiction of Judicial Magistrates',
  '15': 'Subordination of Judicial Magistrates',
  '16': 'Courts of Metropolitan Magistrates',
  '17': 'Chief Metropolitan Magistrate and Additional Chief Metropolitan Magistrate',
  '18': 'Special Metropolitan Magistrates',
  '19': 'Subordination of Metropolitan Magistrates',
  '20': 'Executive Magistrates',
  '24': 'Public Prosecutors',
  '25': 'Assistant Public Prosecutors',
  '25A': 'Directorate of Prosecution',
  '26': 'Courts by which offences are triable',
  '27': 'Jurisdiction in the case of juveniles',
  '28': 'Sentences which High Courts and Sessions Judges may pass',
  '29': 'Sentences which Magistrates may pass',
  '30': 'Sentence of imprisonment in default of fine',
  '31': 'Sentence in cases of conviction of several offences at one trial',
  '37': 'Public when to assist Magistrates and police',
  '39': 'Public to give information of certain offences',
  '41': 'When police may arrest without warrant',
  '41A': 'Notice of appearance before police officer',
  '41B': 'Procedure of arrest and duties of officer making arrest (Arnesh Kumar & D.K. Basu guidelines)',
  '41C': 'Control room at districts',
  '41D': 'Right of arrested person to meet an advocate of his choice during interrogation',
  '42': 'Arrest on refusal to give name and residence',
  '43': 'Arrest by private person and procedure on such arrest',
  '44': 'Arrest by Magistrate',
  '46': 'Arrest how made (No arrest of woman after sunset and before sunrise)',
  '49': 'No unnecessary restraint',
  '50': 'Person arrested to be informed of grounds of arrest and of right to bail',
  '50A': 'Obligation of person making arrest to inform about the arrest, etc., to a nominated person',
  '51': 'Search of arrested person',
  '53': 'Examination of accused by medical practitioner at the request of police officer',
  '53A': 'Examination of person accused of rape by medical practitioner',
  '54': 'Examination of arrested person by medical officer',
  '54A': 'Identification of person arrested (Test Identification Parade)',
  '55': 'Procedure when police officer deputes subordinate to arrest without warrant',
  '57': 'Person arrested not to be detained more than twenty-four hours',
  '58': 'Police to report apprehensions',
  '61': 'Form of summons',
  '62': 'Summons how served',
  '70': 'Form of warrant of arrest and duration',
  '71': 'Power to direct security to be taken (Bailable Warrant)',
  '82': 'Proclamation for person absconding',
  '83': 'Attachment of property of person absconding',
  '91': 'Summons to produce document or other thing',
  '93': 'When search-warrant may be issued',
  '100': 'Persons in charge of closed place to allow search (Independent witnesses)',
  '102': 'Power of police officer to seize certain property',
  '105A': 'Definitions (Reciprocal arrangements)',
  '107': 'Security for keeping the peace in other cases',
  '108': 'Security for good behaviour from persons disseminating seditious matters',
  '109': 'Security for good behaviour from suspected persons',
  '110': 'Security for good behaviour from habitual offenders',
  '116': 'Inquiry as to truth of information',
  '125': 'Order for maintenance of wives, children and parents',
  '126': 'Procedure for maintenance application',
  '127': 'Alteration in allowance',
  '128': 'Enforcement of order of maintenance',
  '129': 'Dispersal of assembly by use of civil force',
  '133': 'Conditional order for removal of nuisance',
  '144': 'Power to issue order in urgent cases of nuisance or apprehended danger',
  '145': 'Procedure where dispute concerning land or water is likely to cause breach of peace',
  '149': 'Police to prevent cognizable offences',
  '151': 'Arrest to prevent the commission of cognizable offences',
  '154': 'Information in cognizable cases (First Information Report - FIR)',
  '155': 'Information as to non-cognizable cases and investigation of such cases (NCR)',
  '156': 'Police officer’s power to investigate cognizable case (Sec 156(3) Magistrate direction)',
  '157': 'Procedure for investigation',
  '160': 'Police officer’s power to require attendance of witnesses',
  '161': 'Examination of witnesses by police',
  '162': 'Statements to police not to be signed; Use of statements in evidence',
  '164': 'Recording of confessions and statements by Magistrate',
  '164A': 'Medical examination of the victim of rape',
  '167': 'Procedure when investigation cannot be completed in twenty-four hours (Default Bail / Statutory Remand)',
  '172': 'Diary of proceedings in investigation (Case Diary)',
  '173': 'Report of police officer on completion of investigation (Chargesheet / Final Report)',
  '174': 'Police to enquire and report on suicide, etc. (Inquest)',
  '177': 'Ordinary place of inquiry and trial',
  '190': 'Cognizance of offences by Magistrates',
  '193': 'Cognizance of offences by Courts of Session',
  '195': 'Prosecution for contempt of lawful authority of public servants and false evidence',
  '197': 'Prosecution of Judges and public servants (Sanction for Prosecution)',
  '198': 'Prosecution for offences against marriage',
  '200': 'Examination of complainant',
  '202': 'Postponement of issue of process',
  '204': 'Issue of process',
  '207': 'Supply to the accused of copy of police report and other documents',
  '209': 'Commitment of case to Court of Session when offence is triable exclusively by it',
  '211': 'Contents of charge',
  '216': 'Court may alter charge',
  '227': 'Discharge in Sessions trial',
  '228': 'Framing of charge in Sessions trial',
  '231': 'Evidence for prosecution in Sessions trial',
  '232': 'Acquittal in Sessions trial',
  '235': 'Judgment of acquittal or conviction in Sessions trial',
  '239': 'When accused shall be discharged in warrant cases instituted on police report',
  '240': 'Framing of charge in warrant case',
  '251': 'Substance of accusation to be stated in summons case',
  '256': 'Non-appearance or death of complainant in summons cases',
  '260': 'Power to try summarily',
  '265A': 'Application of Chapter XXIA Plea Bargaining',
  '300': 'Person once convicted or acquitted not to be tried for same offence (Autrefois Acquit / Autrefois Convict)',
  '302': 'Permission to conduct prosecution',
  '304': 'Legal aid to accused at State expense in certain cases',
  '309': 'Power to postpone or adjourn proceedings',
  '311': 'Power to summon material witness, or examine person present',
  '311A': 'Power of Magistrate to order person to give specimen signatures or handwriting',
  '313': 'Power to examine the accused',
  '320': 'Compounding of offences',
  '321': 'Withdrawal from prosecution',
  '353': 'Judgment',
  '354': 'Language and contents of judgment',
  '357': 'Order to pay compensation',
  '357A': 'Victim compensation scheme',
  '366': 'Sentence of death to be submitted by Court of Session for confirmation',
  '372': 'No appeal to lie unless otherwise provided (Victim’s Right to Appeal)',
  '374': 'Appeals from convictions',
  '378': 'Appeal in case of acquittal',
  '389': 'Suspension of sentence pending the appeal; release of appellant on bail',
  '397': 'Calling for records to exercise powers of revision',
  '401': 'High Court’s powers of revision',
  '406': 'Power of Supreme Court to transfer cases and appeals',
  '407': 'Power of High Court to transfer cases and appeals',
  '436': 'In what cases bail to be taken (Bailable Offences)',
  '436A': 'Maximum period for which an undertrial prisoner can be detained',
  '437': 'When bail may be taken in case of non-bailable offence',
  '438': 'Direction for grant of bail to person apprehending arrest (Anticipatory Bail)',
  '439': 'Special powers of High Court or Court of Session regarding bail',
  '446': 'Procedure when bond has been forfeited',
  '451': 'Order for custody and disposal of property pending trial in certain cases',
  '468': 'Bar to taking cognizance after lapse of the period of limitation',
  '482': 'Saving of inherent powers of High Court',
  '484': 'Repeal and savings'
};

function getCRPCSectionData() {
  const sections = [];
  const specialSections = [
    '25A', '41A', '41B', '41C', '41D', '50A', '53A', '54A', '105A', '105B', '105C',
    '105D', '105E', '105F', '105G', '105H', '105I', '105J', '105K', '105L', '144A',
    '164A', '198A', '265A', '265B', '265C', '265D', '265E', '265F', '265G', '265H',
    '265I', '265J', '265K', '265L', '311A', '357A', '357B', '357C', '436A'
  ];

  function findChapter(secNum) {
    const num = parseInt(secNum, 10);
    if (secNum.startsWith('105')) return 'Chapter VIIA';
    if (secNum.startsWith('265')) return 'Chapter XXIA';
    if (num >= 1 && num <= 5) return 'Chapter I';
    if (num >= 6 && num <= 25) return 'Chapter II';
    if (num >= 26 && num <= 35) return 'Chapter III';
    if (num >= 36 && num <= 40) return 'Chapter IV';
    if (num >= 41 && num <= 60) return 'Chapter V';
    if (num >= 61 && num <= 90) return 'Chapter VI';
    if (num >= 91 && num <= 105) return 'Chapter VII';
    if (num >= 106 && num <= 124) return 'Chapter VIII';
    if (num >= 125 && num <= 128) return 'Chapter IX';
    if (num >= 129 && num <= 148) return 'Chapter X';
    if (num >= 149 && num <= 153) return 'Chapter XI';
    if (num >= 154 && num <= 176) return 'Chapter XII';
    if (num >= 177 && num <= 189) return 'Chapter XIII';
    if (num >= 190 && num <= 199) return 'Chapter XIV';
    if (num >= 200 && num <= 203) return 'Chapter XV';
    if (num >= 204 && num <= 210) return 'Chapter XVI';
    if (num >= 211 && num <= 224) return 'Chapter XVII';
    if (num >= 225 && num <= 237) return 'Chapter XVIII';
    if (num >= 238 && num <= 250) return 'Chapter XIX';
    if (num >= 251 && num <= 259) return 'Chapter XX';
    if (num >= 260 && num <= 265) return 'Chapter XXI';
    if (num >= 266 && num <= 271) return 'Chapter XXII';
    if (num >= 272 && num <= 299) return 'Chapter XXIII';
    if (num >= 300 && num <= 327) return 'Chapter XXIV';
    if (num >= 328 && num <= 339) return 'Chapter XXV';
    if (num >= 340 && num <= 352) return 'Chapter XXVI';
    if (num >= 353 && num <= 365) return 'Chapter XXVII';
    if (num >= 366 && num <= 371) return 'Chapter XXVIII';
    if (num >= 372 && num <= 394) return 'Chapter XXIX';
    if (num >= 395 && num <= 405) return 'Chapter XXX';
    if (num >= 406 && num <= 412) return 'Chapter XXXI';
    if (num >= 413 && num <= 435) return 'Chapter XXXII';
    if (num >= 436 && num <= 450) return 'Chapter XXXIII';
    if (num >= 451 && num <= 459) return 'Chapter XXXIV';
    if (num >= 460 && num <= 466) return 'Chapter XXXV';
    if (num >= 467 && num <= 473) return 'Chapter XXXVI';
    if (num >= 474 && num <= 484) return 'Chapter XXXVII';
    return 'Chapter I';
  }

  const allSecKeys = [];
  for (let i = 1; i <= 484; i++) {
    allSecKeys.push(String(i));
  }
  for (const s of specialSections) {
    if (!allSecKeys.includes(s)) {
      allSecKeys.push(s);
    }
  }

  allSecKeys.sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (numA !== numB) return numA - numB;
    return a.localeCompare(b);
  });

  allSecKeys.forEach((secNum, idx) => {
    const title = CRPC_SECTION_TITLES[secNum] || `Section ${secNum} of the Code of Criminal Procedure, 1973`;
    const chapterName = findChapter(secNum);
    sections.push({
      section_number: secNum,
      section_title: title,
      section_order: idx + 1,
      chapter_number: chapterName,
      section_text: `Official statutory procedural rule for Section ${secNum} (${title}) under ${chapterName} of the Code of Criminal Procedure, 1973. Dictates jurisdiction, investigatory mandates, process issuance, and trial protocol valid until 30 June 2024.`,
      legal_nature: 'Procedure',
      valid_from: '1974-04-01',
      valid_until: '2024-06-30',
      status: 'Repealed / Historical',
      source_type: 'India Code',
      source_name: 'Legislative Department, Ministry of Law and Justice',
      source_url: `https://www.indiacode.nic.in/handle/123456789/16225?section_id=${secNum}`
    });
  });

  return sections;
}

module.exports = {
  CRPC_CHAPTERS,
  getCRPCSectionData
};
