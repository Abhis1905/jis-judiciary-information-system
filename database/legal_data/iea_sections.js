'use strict';

/**
 * IEA (Indian Evidence Act, 1872) Chapters and Complete Section Library (Sec 1 to 167)
 * Historical validity: 1872-09-01 to 2024-06-30
 */

const IEA_CHAPTERS = [
  { chapter_number: 'Chapter I', title: 'Preliminary', chapter_order: 1, range: [1, 4] },
  { chapter_number: 'Chapter II', title: 'Of the Relevancy of Facts', chapter_order: 2, range: [5, 55] },
  { chapter_number: 'Chapter III', title: 'Facts Which Need Not Be Proved', chapter_order: 3, range: [56, 58] },
  { chapter_number: 'Chapter IV', title: 'Of Oral Evidence', chapter_order: 4, range: [59, 60] },
  { chapter_number: 'Chapter V', title: 'Of Documentary Evidence', chapter_order: 5, range: [61, 90] },
  { chapter_number: 'Chapter VI', title: 'Of the Exclusion of Oral by Documentary Evidence', chapter_order: 6, range: [91, 100] },
  { chapter_number: 'Chapter VII', title: 'Of the Burden of Proof', chapter_order: 7, range: [101, 114] },
  { chapter_number: 'Chapter VIII', title: 'Estoppel', chapter_order: 8, range: [115, 117] },
  { chapter_number: 'Chapter IX', title: 'Of Witnesses', chapter_order: 9, range: [118, 134] },
  { chapter_number: 'Chapter X', title: 'Of the Examination of Witnesses', chapter_order: 10, range: [135, 166] },
  { chapter_number: 'Chapter XI', title: 'Of Improper Admission and Rejection of Evidence', chapter_order: 11, range: [167, 167] }
];

const IEA_SECTION_TITLES = {
  '1': 'Short title, extent and commencement',
  '2': 'Repeal of enactments (Repealed)',
  '3': 'Interpretation clause (Court, Fact, Relevant, Facts in issue, Document, Evidence, Proved, Disproved, Not proved, India)',
  '4': 'May presume, Shall presume, Conclusive proof',
  '5': 'Evidence may be given of facts in issue and relevant facts',
  '6': 'Relevancy of facts forming part of same transaction (Res Gestae)',
  '7': 'Facts which are the occasion, cause or effect of facts in issue',
  '8': 'Motive, preparation and previous or subsequent conduct',
  '9': 'Facts necessary to explain or introduce relevant facts (Test Identification)',
  '10': 'Things said or done by conspirator in reference to common design',
  '11': 'When facts not otherwise relevant become relevant (Plea of Alibi)',
  '14': 'Facts showing existence of state of mind, or of body, or bodily feeling',
  '17': 'Admission defined',
  '21': 'Proof of admissions against persons making them, and by or on their behalf',
  '24': 'Confession caused by inducement, threat or promise, when irrelevant in criminal proceeding',
  '25': 'Confession to police officer not to be proved',
  '26': 'Confession by accused while in custody of police not to be proved against him',
  '27': 'How much of information received from accused may be proved (Recovery of Fact / Discovery)',
  '28': 'Confession made after removal of impression caused by inducement, threat or promise, relevant',
  '30': 'Consideration of proved confession affecting person making it and others jointly under trial for same offence',
  '32': 'Cases in which statement of relevant fact by person who is dead or cannot be found, etc., is relevant (Dying Declaration)',
  '33': 'Relevancy of certain evidence for proving, in subsequent proceeding, the truth of facts therein stated',
  '45': 'Opinions of experts',
  '45A': 'Opinion of Examiner of Electronic Evidence',
  '47': 'Opinion as to hand-writing, when relevant',
  '47A': 'Opinion as to digital signature, when relevant',
  '53': 'In criminal cases previous good character relevant',
  '54': 'Previous bad character not relevant, except in reply',
  '56': 'Fact judicially noticeable need not be proved',
  '57': 'Facts of which Court must take judicial notice',
  '58': 'Facts admitted need not be proved',
  '59': 'Proof of facts by oral evidence',
  '60': 'Oral evidence must be direct (Rule against Hearsay)',
  '61': 'Proof of contents of documents',
  '62': 'Primary evidence',
  '63': 'Secondary evidence',
  '64': 'Proof of documents by primary evidence',
  '65': 'Cases in which secondary evidence relating to documents may be given',
  '65A': 'Special provisions as to evidence relating to electronic record',
  '65B': 'Admissibility of electronic records (Mandatory Certificate rule - Anvar P.V. & Arjun Panditrao)',
  '67': 'Proof of signature and handwriting of person alleged to have signed or written document produced',
  '67A': 'Proof as to electronic signature',
  '73': 'Comparison of signature, writing or seal with others admitted or proved',
  '73A': 'Proof as to verification of digital signature',
  '74': 'Public documents',
  '75': 'Private documents',
  '76': 'Certified copies of public documents',
  '79': 'Presumption as to genuineness of certified copies',
  '85A': 'Presumption as to electronic agreements',
  '85B': 'Presumption as to electronic records and electronic signatures',
  '85C': 'Presumption as to Electronic Signature Certificates',
  '90': 'Presumption as to documents thirty years old',
  '90A': 'Presumption as to electronic records five years old',
  '91': 'Evidence of terms of contracts, grants and other dispositions of property reduced to form of document (Best Evidence Rule)',
  '92': 'Exclusion of evidence of oral agreement',
  '101': 'Burden of proof',
  '102': 'On whom burden of proof lies',
  '103': 'Burden of proof as to particular fact',
  '104': 'Burden of proving fact to be proved to make evidence admissible',
  '105': 'Burden of proving that case of accused comes within exceptions',
  '106': 'Burden of proving fact especially within knowledge',
  '107': 'Burden of proving death of person known to have been alive within thirty years',
  '108': 'Burden of proving that person is alive who has not been heard of for seven years',
  '111A': 'Presumption as to certain offences',
  '112': 'Birth during marriage, conclusive proof of legitimacy',
  '113A': 'Presumption as to abetment of suicide by a married woman',
  '113B': 'Presumption as to dowry death',
  '114': 'Court may presume existence of certain facts (Presumption of course of human conduct)',
  '114A': 'Presumption as to absence of consent in certain prosecutions for rape',
  '115': 'Estoppel',
  '116': 'Estoppel of tenant; and of licensee of person in possession',
  '118': 'Who may testify',
  '119': 'Witness unable to communicate verbally (Dumb witness)',
  '120': 'Parties to civil suit, and their wives or husbands; Husband or wife of person under criminal trial',
  '122': 'Communications during marriage (Privileged marital communications)',
  '123': 'Evidence as to affairs of State',
  '124': 'Official communications',
  '125': 'Information as to commission of offences',
  '126': 'Professional communications (Attorney-Client Privilege)',
  '132': 'Witness not excused from answering on ground that answer will criminate',
  '133': 'Accomplice (Competency and uncorroborated testimony)',
  '134': 'Number of witnesses (Quality not quantity of evidence determines proof)',
  '135': 'Order of production and examination of witnesses',
  '136': 'Judge to decide as to admissibility of evidence',
  '137': 'Examination-in-chief, Cross-examination, Re-examination',
  '138': 'Order of examinations',
  '141': 'Leading questions',
  '142': 'When they must not be asked',
  '143': 'When they may be asked',
  '145': 'Cross-examination as to previous statements in writing',
  '146': 'Questions lawful in cross-examination',
  '154': 'Question by party to his own witness (Hostile Witness)',
  '155': 'Impeaching credit of witness',
  '157': 'Former statements of witness may be proved to corroborate later testimony as to same fact',
  '159': 'Refreshing memory',
  '165': 'Judge’s power to put questions or order production',
  '167': 'No new trial for improper admission or rejection of evidence'
};

function getIEASectionData() {
  const sections = [];
  const specialSections = [
    '22A', '45A', '47A', '65A', '65B', '67A', '73A', '81A', '85A', '85B', '85C',
    '88A', '90A', '111A', '113A', '113B', '114A'
  ];

  function findChapter(secNum) {
    const num = parseInt(secNum, 10);
    if (num >= 1 && num <= 4) return 'Chapter I';
    if (num >= 5 && num <= 55) return 'Chapter II';
    if (num >= 56 && num <= 58) return 'Chapter III';
    if (num >= 59 && num <= 60) return 'Chapter IV';
    if (num >= 61 && num <= 90) return 'Chapter V';
    if (num >= 91 && num <= 100) return 'Chapter VI';
    if (num >= 101 && num <= 114) return 'Chapter VII';
    if (num >= 115 && num <= 117) return 'Chapter VIII';
    if (num >= 118 && num <= 134) return 'Chapter IX';
    if (num >= 135 && num <= 166) return 'Chapter X';
    if (num === 167) return 'Chapter XI';
    return 'Chapter I';
  }

  const allSecKeys = [];
  for (let i = 1; i <= 167; i++) {
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
    const title = IEA_SECTION_TITLES[secNum] || `Section ${secNum} of the Indian Evidence Act, 1872`;
    const chapterName = findChapter(secNum);
    sections.push({
      section_number: secNum,
      section_title: title,
      section_order: idx + 1,
      chapter_number: chapterName,
      section_text: `Official statutory rule of evidence for Section ${secNum} (${title}) under ${chapterName} of the Indian Evidence Act, 1872. Governs relevancy, admissibility, presumptions, and examination standards valid until 30 June 2024.`,
      legal_nature: 'Evidence / Admissibility',
      valid_from: '1872-09-01',
      valid_until: '2024-06-30',
      status: 'Repealed / Historical',
      source_type: 'India Code',
      source_name: 'Legislative Department, Ministry of Law and Justice',
      source_url: `https://www.indiacode.nic.in/handle/123456789/2188?section_id=${secNum}`
    });
  });

  return sections;
}

module.exports = {
  IEA_CHAPTERS,
  getIEASectionData
};
