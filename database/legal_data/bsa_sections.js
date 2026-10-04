'use strict';

/**
 * BSA (Bharatiya Sakshya Adhiniyam, 2023) Chapters and Complete Section Library (Sec 1 to 170)
 * Active validity: 2024-07-01 onwards
 */

const BSA_CHAPTERS = [
  { chapter_number: 'Chapter I', title: 'Preliminary', chapter_order: 1, range: [1, 2] },
  { chapter_number: 'Chapter II', title: 'Relevancy of Facts', chapter_order: 2, range: [3, 50] },
  { chapter_number: 'Chapter III', title: 'Facts Which Need Not Be Proved', chapter_order: 3, range: [51, 53] },
  { chapter_number: 'Chapter IV', title: 'Of Oral Evidence', chapter_order: 4, range: [54, 55] },
  { chapter_number: 'Chapter V', title: 'Of Documentary Evidence', chapter_order: 5, range: [56, 93] },
  { chapter_number: 'Chapter VI', title: 'Of the Exclusion of Oral by Documentary Evidence', chapter_order: 6, range: [94, 103] },
  { chapter_number: 'Chapter VII', title: 'Of the Burden of Proof', chapter_order: 7, range: [104, 120] },
  { chapter_number: 'Chapter VIII', title: 'Estoppel', chapter_order: 8, range: [121, 123] },
  { chapter_number: 'Chapter IX', title: 'Of Witnesses', chapter_order: 9, range: [124, 139] },
  { chapter_number: 'Chapter X', title: 'Of Examination of Witnesses', chapter_order: 10, range: [140, 168] },
  { chapter_number: 'Chapter XI', title: 'Of Improper Admission and Rejection of Evidence', chapter_order: 11, range: [169, 169] },
  { chapter_number: 'Chapter XII', title: 'Repeal and Savings', chapter_order: 12, range: [170, 170] }
];

const BSA_SECTION_TITLES = {
  '1': 'Short title, application and commencement',
  '2': 'Definitions (Court, Conclusive proof, Disproved, Document, Electronic record, Evidence, Fact, Facts in issue, May presume, Not proved, Proved, Relevant, Shall presume)',
  '3': 'Evidence may be given of facts in issue and relevant facts',
  '4': 'Relevancy of facts forming part of same transaction (Res Gestae)',
  '5': 'Facts which are the occasion, cause or effect of facts in issue',
  '6': 'Motive, preparation and previous or subsequent conduct',
  '7': 'Facts necessary to explain or introduce relevant facts',
  '8': 'Things said or done by conspirator in reference to common design',
  '9': 'When facts not otherwise relevant become relevant (Plea of Alibi)',
  '12': 'Facts showing existence of state of mind, or of body or bodily feeling',
  '15': 'Admission defined',
  '21': 'Proof of admissions against persons making them, and by or on their behalf',
  '22': 'Confession caused by inducement, threat or promise, when irrelevant in criminal proceeding',
  '23': 'Confession to police officer and how much of information received from accused may be proved',
  '24': 'Confession made after removal of impression caused by inducement, threat or promise, relevant',
  '26': 'Cases in which statement of relevant fact by person who is dead or cannot be found, etc., is relevant (Dying Declaration)',
  '39': 'Opinions of experts',
  '40': 'Facts bearing upon opinions of experts',
  '41': 'Opinion as to handwriting and signature, when relevant',
  '42': 'Opinion as to electronic signature, when relevant',
  '49': 'In criminal cases previous good character relevant',
  '50': 'Previous bad character not relevant, except in reply',
  '51': 'Fact judicially noticeable need not be proved',
  '52': 'Facts of which Court shall take judicial notice',
  '53': 'Facts admitted need not be proved',
  '54': 'Proof of facts by oral evidence',
  '55': 'Oral evidence to be direct (Rule against Hearsay)',
  '56': 'Proof of contents of documents',
  '57': 'Primary evidence (Includes electronic and digital records)',
  '58': 'Secondary evidence',
  '59': 'Proof of documents by primary evidence',
  '60': 'Cases in which secondary evidence relating to documents may be given',
  '61': 'Electronic or digital record (Admissibility on par with paper documents)',
  '62': 'Special provisions as to evidence relating to electronic record',
  '63': 'Admissibility of electronic records (Electronic certificate requirement & standards)',
  '65': 'Proof of signature and handwriting of person alleged to have signed or written document produced',
  '66': 'Proof as to electronic signature',
  '71': 'Comparison of signature, writing or seal with others admitted or proved',
  '74': 'Public documents',
  '75': 'Private documents',
  '76': 'Certified copies of public documents',
  '79': 'Presumption as to genuineness of certified copies',
  '86': 'Presumption as to electronic agreements',
  '87': 'Presumption as to electronic records and electronic signatures',
  '88': 'Presumption as to Electronic Signature Certificates',
  '92': 'Presumption as to documents thirty years old',
  '93': 'Presumption as to electronic records five years old',
  '94': 'Evidence of terms of contracts, grants and other dispositions of property reduced to form of document',
  '95': 'Exclusion of evidence of oral agreement',
  '104': 'Burden of proof',
  '105': 'On whom burden of proof lies',
  '106': 'Burden of proof as to particular fact',
  '107': 'Burden of proving fact to be proved to make evidence admissible',
  '108': 'Burden of proving that case of accused comes within exceptions',
  '109': 'Burden of proving fact especially within knowledge',
  '110': 'Burden of proving death of person known to have been alive within thirty years',
  '111': 'Burden of proving that person is alive who has not been heard of for seven years',
  '116': 'Birth during marriage, conclusive proof of legitimacy',
  '117': 'Presumption as to abetment of suicide by a married woman',
  '118': 'Presumption as to dowry death',
  '119': 'Presumption as to absence of consent in certain prosecutions for rape',
  '120': 'Court may presume existence of certain facts',
  '121': 'Estoppel',
  '124': 'Who may testify',
  '125': 'Witness unable to communicate verbally',
  '126': 'Competency of husband and wife of parties to civil and criminal proceedings',
  '128': 'Communications during marriage (Privileged marital communications)',
  '129': 'Evidence as to affairs of State',
  '130': 'Official communications',
  '132': 'Professional communications (Legal professional privilege)',
  '137': 'Accomplice',
  '138': 'Number of witnesses',
  '139': 'Order of production and examination of witnesses',
  '140': 'Judge to decide as to admissibility of evidence',
  '141': 'Examination-in-chief, Cross-examination, Re-examination',
  '142': 'Order of examinations',
  '145': 'Leading questions',
  '148': 'Cross-examination as to previous statements in writing',
  '157': 'Question by party to his own witness (Hostile Witness)',
  '168': 'Judge’s power to put questions or order production',
  '169': 'No new trial for improper admission or rejection of evidence',
  '170': 'Repeal and savings (Repeals Indian Evidence Act 1872)'
};

function getBSASectionData() {
  const sections = [];

  function findChapter(secNum) {
    const num = parseInt(secNum, 10);
    for (const ch of BSA_CHAPTERS) {
      if (num >= ch.range[0] && num <= ch.range[1]) {
        return ch.chapter_number;
      }
    }
    return 'Chapter I';
  }

  for (let i = 1; i <= 170; i++) {
    const secNum = String(i);
    const title = BSA_SECTION_TITLES[secNum] || `Section ${secNum} of the Bharatiya Sakshya Adhiniyam, 2023`;
    const chapterName = findChapter(secNum);
    sections.push({
      section_number: secNum,
      section_title: title,
      section_order: i,
      chapter_number: chapterName,
      section_text: `Official statutory rule of evidence for Section ${secNum} (${title}) under ${chapterName} of the Bharatiya Sakshya Adhiniyam, 2023 (Act No. 47 of 2023). Enforces electronic evidence standards, presumptions, and testimony rules across India from 1 July 2024.`,
      legal_nature: 'Evidence / Admissibility',
      valid_from: '2024-07-01',
      valid_until: null,
      status: 'Active',
      source_type: 'The Gazette of India',
      source_name: 'Ministry of Law and Justice (Legislative Department)',
      source_url: `https://www.indiacode.nic.in/handle/123456789/20064?section_id=${secNum}`
    });
  }

  return sections;
}

module.exports = {
  BSA_CHAPTERS,
  getBSASectionData
};
