'use strict';

/**
 * Chapters and Section Libraries for:
 * 1. Constitution of India (CONST_1950)
 * 2. Code of Civil Procedure, 1908 (CPC_1908)
 * 3. Commercial Courts Act, 2015 (CCA_2015)
 * 4. Family Courts Act, 1984 (FCA_1984)
 */

const CONST_CHAPTERS = [
  { chapter_number: 'Part III', title: 'Fundamental Rights', chapter_order: 1 },
  { chapter_number: 'Part IV', title: 'Directive Principles of State Policy', chapter_order: 2 },
  { chapter_number: 'Part IVA', title: 'Fundamental Duties', chapter_order: 3 },
  { chapter_number: 'Part V Chapter IV', title: 'The Union Judiciary (Supreme Court of India)', chapter_order: 4 },
  { chapter_number: 'Part VI Chapter V', title: 'The High Courts in the States', chapter_order: 5 },
  { chapter_number: 'Part VI Chapter VI', title: 'Subordinate Courts', chapter_order: 6 },
  { chapter_number: 'Part XII', title: 'Finance, Property, Contracts and Suits', chapter_order: 7 },
  { chapter_number: 'Part XVIII', title: 'Emergency Provisions', chapter_order: 8 },
  { chapter_number: 'Part XX', title: 'Amendment of the Constitution', chapter_order: 9 }
];

const CONST_SECTIONS = [
  {
    section_number: 'Art 12',
    section_title: 'Definition of State',
    chapter_number: 'Part III',
    legal_nature: 'Constitutional Right',
    section_text: 'In this Part, unless the context otherwise requires, the State includes the Government and Parliament of India and the Government and the Legislature of each of the States and all local or other authorities within the territory of India or under the control of the Government of India.'
  },
  {
    section_number: 'Art 13',
    section_title: 'Laws inconsistent with or in derogation of the fundamental rights (Judicial Review)',
    chapter_number: 'Part III',
    legal_nature: 'Constitutional Right',
    section_text: 'All laws in force in the territory of India immediately before the commencement of this Constitution, in so far as they are inconsistent with the provisions of this Part, shall, to the extent of such inconsistency, be void.'
  },
  {
    section_number: 'Art 14',
    section_title: 'Equality before law and equal protection of the laws (Doctrine of Non-Arbitrariness)',
    chapter_number: 'Part III',
    legal_nature: 'Constitutional Right',
    section_text: 'The State shall not deny to any person equality before the law or the equal protection of the laws within the territory of India.'
  },
  {
    section_number: 'Art 19',
    section_title: 'Protection of certain rights regarding freedom of speech, expression, assembly, association, movement, residence, and profession',
    chapter_number: 'Part III',
    legal_nature: 'Constitutional Right',
    section_text: 'All citizens shall have the right to freedom of speech and expression, to assemble peaceably and without arms, to form associations or unions, to move freely throughout the territory of India, to reside and settle in any part of the territory of India, and to practise any profession, or to carry on any occupation, trade or business, subject to reasonable restrictions.'
  },
  {
    section_number: 'Art 20',
    section_title: 'Protection in respect of conviction for offences (Ex-post facto, Double Jeopardy, Self-Incrimination)',
    chapter_number: 'Part III',
    legal_nature: 'Constitutional Right',
    section_text: 'No person shall be convicted of any offence except for violation of a law in force at the time of the commission of the act charged as an offence. No person shall be prosecuted and punished for the same offence more than once. No person accused of any offence shall be compelled to be a witness against himself.'
  },
  {
    section_number: 'Art 21',
    section_title: 'Protection of life and personal liberty (Right to Privacy, Speedy Trial, Fair Procedure)',
    chapter_number: 'Part III',
    legal_nature: 'Constitutional Right',
    section_text: 'No person shall be deprived of his life or personal liberty except according to procedure established by law.'
  },
  {
    section_number: 'Art 21A',
    section_title: 'Right to education',
    chapter_number: 'Part III',
    legal_nature: 'Constitutional Right',
    section_text: 'The State shall provide free and compulsory education to all children of the age of six to fourteen years in such manner as the State may, by law, determine.'
  },
  {
    section_number: 'Art 22',
    section_title: 'Protection against arrest and detention in certain cases',
    chapter_number: 'Part III',
    legal_nature: 'Constitutional Right',
    section_text: 'No person who is arrested shall be detained in custody without being informed, as soon as may be, of the grounds for such arrest nor shall he be denied the right to consult, and to be defended by, a legal practitioner of his choice.'
  },
  {
    section_number: 'Art 25',
    section_title: 'Freedom of conscience and free profession, practice and propagation of religion',
    chapter_number: 'Part III',
    legal_nature: 'Constitutional Right',
    section_text: 'Subject to public order, morality and health and to the other provisions of this Part, all persons are equally entitled to freedom of conscience and the right freely to profess, practise and propagate religion.'
  },
  {
    section_number: 'Art 32',
    section_title: 'Remedies for enforcement of fundamental rights (Habeas Corpus, Mandamus, Prohibition, Quo Warranto, Certiorari)',
    chapter_number: 'Part III',
    legal_nature: 'Constitutional Right',
    section_text: 'The right to move the Supreme Court by appropriate proceedings for the enforcement of the rights conferred by this Part is guaranteed. The Supreme Court shall have power to issue directions or orders or writs in the nature of habeas corpus, mandamus, prohibition, quo warranto and certiorari.'
  },
  {
    section_number: 'Art 39A',
    section_title: 'Equal justice and free legal aid',
    chapter_number: 'Part IV',
    legal_nature: 'Constitutional Right',
    section_text: 'The State shall secure that the operation of the legal system promotes justice, on a basis of equal opportunity, and shall, in particular, provide free legal aid, by suitable legislation or schemes.'
  },
  {
    section_number: 'Art 124',
    section_title: 'Establishment and constitution of Supreme Court',
    chapter_number: 'Part V Chapter IV',
    legal_nature: 'Jurisdiction / Power',
    section_text: 'There shall be a Supreme Court of India consisting of a Chief Justice of India and such number of other Judges as Parliament may by law prescribe.'
  },
  {
    section_number: 'Art 129',
    section_title: 'Supreme Court to be a court of record (Power to punish for contempt of itself)',
    chapter_number: 'Part V Chapter IV',
    legal_nature: 'Jurisdiction / Power',
    section_text: 'The Supreme Court shall be a court of record and shall have all the powers of such a court including the power to punish for contempt of itself.'
  },
  {
    section_number: 'Art 131',
    section_title: 'Original jurisdiction of the Supreme Court',
    chapter_number: 'Part V Chapter IV',
    legal_nature: 'Jurisdiction / Power',
    section_text: 'Subject to the provisions of this Constitution, the Supreme Court shall, to the exclusion of any other court, have original jurisdiction in any dispute between the Government of India and one or more States, or between States.'
  },
  {
    section_number: 'Art 136',
    section_title: 'Special leave to appeal by the Supreme Court (SLP)',
    chapter_number: 'Part V Chapter IV',
    legal_nature: 'Jurisdiction / Power',
    section_text: 'Notwithstanding anything in this Chapter, the Supreme Court may, in its discretion, grant special leave to appeal from any judgment, decree, determination, sentence or order in any cause or matter passed or made by any court or tribunal in the territory of India.'
  },
  {
    section_number: 'Art 141',
    section_title: 'Law declared by Supreme Court to be binding on all courts (Doctrine of Precedent / Stare Decisis)',
    chapter_number: 'Part V Chapter IV',
    legal_nature: 'Jurisdiction / Power',
    section_text: 'The law declared by the Supreme Court shall be binding on all courts within the territory of India.'
  },
  {
    section_number: 'Art 142',
    section_title: 'Enforcement of decrees and orders of Supreme Court and orders as to discovery, etc. (Complete Justice)',
    chapter_number: 'Part V Chapter IV',
    legal_nature: 'Jurisdiction / Power',
    section_text: 'The Supreme Court in the exercise of its jurisdiction may pass such decree or make such order as is necessary for doing complete justice in any cause or matter pending before it.'
  },
  {
    section_number: 'Art 214',
    section_title: 'High Courts for States',
    chapter_number: 'Part VI Chapter V',
    legal_nature: 'Jurisdiction / Power',
    section_text: 'There shall be a High Court for each State.'
  },
  {
    section_number: 'Art 215',
    section_title: 'High Courts to be courts of record',
    chapter_number: 'Part VI Chapter V',
    legal_nature: 'Jurisdiction / Power',
    section_text: 'Every High Court shall be a court of record and shall have all the powers of such a court including the power to punish for contempt of itself.'
  },
  {
    section_number: 'Art 226',
    section_title: 'Power of High Courts to issue certain writs (Prerogative Writ Jurisdiction)',
    chapter_number: 'Part VI Chapter V',
    legal_nature: 'Jurisdiction / Power',
    section_text: 'Notwithstanding anything in Article 32 every High Court shall have power, throughout the territories in relation to which it exercise jurisdiction, to issue to any person or authority directions, orders or writs for the enforcement of any of the rights conferred by Part III and for any other purpose.'
  },
  {
    section_number: 'Art 227',
    section_title: 'Power of superintendence over all courts by the High Court',
    chapter_number: 'Part VI Chapter V',
    legal_nature: 'Jurisdiction / Power',
    section_text: 'Every High Court shall have superintendence over all courts and tribunals throughout the territories in relation to which it exercises jurisdiction.'
  },
  {
    section_number: 'Art 233',
    section_title: 'Appointment of district judges',
    chapter_number: 'Part VI Chapter VI',
    legal_nature: 'Jurisdiction / Power',
    section_text: 'Appointments of persons to be, and the posting and promotion of, district judges in any State shall be made by the Governor of the State in consultation with the High Court exercising jurisdiction in relation to such State.'
  },
  {
    section_number: 'Art 300A',
    section_title: 'Persons not to be deprived of property save by authority of law (Right to Property as Constitutional Right)',
    chapter_number: 'Part XII',
    legal_nature: 'Constitutional Right',
    section_text: 'No person shall be deprived of his property save by authority of law.'
  },
  {
    section_number: 'Art 368',
    section_title: 'Power of Parliament to amend the Constitution and procedure therefor (Basic Structure Doctrine)',
    chapter_number: 'Part XX',
    legal_nature: 'Jurisdiction / Power',
    section_text: 'Notwithstanding anything in this Constitution, Parliament may in exercise of its constituent power amend by way of addition, variation or repeal any provision of this Constitution in accordance with the procedure laid down in this article.'
  }
];

const CPC_CHAPTERS = [
  { chapter_number: 'Part I', title: 'Suits in General', chapter_order: 1 },
  { chapter_number: 'Part II', title: 'Execution', chapter_order: 2 },
  { chapter_number: 'Part III', title: 'Incidental Proceedings', chapter_order: 3 },
  { chapter_number: 'Part IV', title: 'Suits in Particular Cases', chapter_order: 4 },
  { chapter_number: 'Part VII', title: 'Appeals', chapter_order: 5 },
  { chapter_number: 'Part VIII', title: 'Reference, Review and Revision', chapter_order: 6 },
  { chapter_number: 'Part XI', title: 'Miscellaneous', chapter_order: 7 }
];

const CPC_SECTIONS = [
  { section_number: 'Sec 9', section_title: 'Courts to try all civil suits unless barred', chapter_number: 'Part I', legal_nature: 'Jurisdiction / Power', section_text: 'The Courts shall (subject to the provisions herein contained) have jurisdiction to try all suits of a civil nature excepting suits of which their cognizance is either expressly or impliedly barred.' },
  { section_number: 'Sec 10', section_title: 'Stay of suit (Res Sub-Judice)', chapter_number: 'Part I', legal_nature: 'Procedure', section_text: 'No Court shall proceed with the trial of any suit in which the matter in issue is also directly and substantially in issue in a previously instituted suit between the same parties.' },
  { section_number: 'Sec 11', section_title: 'Res Judicata', chapter_number: 'Part I', legal_nature: 'Procedure', section_text: 'No Court shall try any suit or issue in which the matter directly and substantially in issue has been directly and substantially in issue in a former suit between the same parties and has been heard and finally decided.' },
  { section_number: 'Sec 26', section_title: 'Institution of suits through plaint', chapter_number: 'Part I', legal_nature: 'Procedure', section_text: 'Every suit shall be instituted by the presentation of a plaint or in such other manner as may be prescribed.' },
  { section_number: 'Sec 33', section_title: 'Judgment and decree', chapter_number: 'Part I', legal_nature: 'Procedure', section_text: 'The Court, after the case has been heard, shall pronounce judgment, and on such judgment a decree shall follow.' },
  { section_number: 'Sec 34', section_title: 'Interest', chapter_number: 'Part I', legal_nature: 'Procedure', section_text: 'Where and in so far as a decree is for the payment of money, the Court may order interest at such rate as the Court deems reasonable.' },
  { section_number: 'Sec 35', section_title: 'Costs', chapter_number: 'Part I', legal_nature: 'Procedure', section_text: 'Subject to such conditions and limitations as may be prescribed, the costs of an incident to all suits shall be in the discretion of the Court.' },
  { section_number: 'Sec 80', section_title: 'Notice to Government or Public Officer prior to institution of suit', chapter_number: 'Part IV', legal_nature: 'Procedure', section_text: 'No suit shall be instituted against the Government or against a public officer in respect of any act purporting to be done by such public officer in his official capacity, until the expiration of two months next after notice in writing.' },
  { section_number: 'Sec 89', section_title: 'Settlement of disputes outside the Court (Arbitration, Conciliation, Judicial Settlement, Lok Adalat, Mediation)', chapter_number: 'Part IV', legal_nature: 'Procedure', section_text: 'Where it appears to the Court that there exist elements of a settlement which may be acceptable to the parties, the Court shall formulate the terms of settlement and refer the same for arbitration, conciliation, judicial settlement or mediation.' },
  { section_number: 'Sec 96', section_title: 'Appeal from original decree (First Appeal)', chapter_number: 'Part VII', legal_nature: 'Procedure', section_text: 'Save where otherwise expressly provided in the body of this Code or by any other law for the time being in force, an appeal shall lie from every decree passed by any Court exercising original jurisdiction.' },
  { section_number: 'Sec 100', section_title: 'Second appeal (Substantial question of law)', chapter_number: 'Part VII', legal_nature: 'Procedure', section_text: 'Save as otherwise expressly provided in the body of this Code or by any other law for the time being in force, an appeal shall lie to the High Court from every decree passed in appeal by any Court subordinate to the High Court, if the High Court is satisfied that the case involves a substantial question of law.' },
  { section_number: 'Sec 114', section_title: 'Review', chapter_number: 'Part VIII', legal_nature: 'Procedure', section_text: 'Subject as aforesaid, any person considering himself aggrieved by a decree or order from which an appeal is allowed, but from which no appeal has been preferred, may apply for a review of judgment to the Court which passed the decree or made the order.' },
  { section_number: 'Sec 115', section_title: 'Revision', chapter_number: 'Part VIII', legal_nature: 'Procedure', section_text: 'The High Court may call for the record of any case which has been decided by any Court subordinate to such High Court and in which no appeal lies thereto, if such subordinate Court appears to have exercised a jurisdiction not vested in it by law, or to have failed to exercise a jurisdiction so vested.' },
  { section_number: 'Sec 151', section_title: 'Saving of inherent powers of Court', chapter_number: 'Part XI', legal_nature: 'Jurisdiction / Power', section_text: 'Nothing in this Code shall be deemed to limit or otherwise affect the inherent power of the Court to make such orders as may be necessary for the ends of justice or to prevent abuse of the process of the Court.' }
];

const CCA_CHAPTERS = [
  { chapter_number: 'Chapter I', title: 'Preliminary', chapter_order: 1 },
  { chapter_number: 'Chapter II', title: 'Commercial Courts, Commercial Appellate Courts, Commercial Divisions and Commercial Appellate Divisions', chapter_order: 2 },
  { chapter_number: 'Chapter III', title: 'Specified Value', chapter_order: 3 },
  { chapter_number: 'Chapter IIIA', title: 'Pre-Institution Mediation and Settlement', chapter_order: 4 },
  { chapter_number: 'Chapter IV', title: 'Appeals', chapter_order: 5 },
  { chapter_number: 'Chapter V', title: 'Transfer of Pending Suits', chapter_order: 6 },
  { chapter_number: 'Chapter VI', title: 'Amendments to the Provisions of the Code of Civil Procedure, 1908', chapter_order: 7 },
  { chapter_number: 'Chapter VII', title: 'Miscellaneous', chapter_order: 8 }
];

const CCA_SECTIONS = [];
const CCA_TITLES = {
  '1': 'Short title, extent and commencement',
  '2': 'Definitions (Commercial dispute, Specified Value, Commercial Court)',
  '3': 'Constitution of Commercial Courts at District level',
  '3A': 'Designation of Commercial Appellate Courts',
  '4': 'Constitution of Commercial Division of High Court',
  '5': 'Constitution of Commercial Appellate Division',
  '6': 'Jurisdiction of Commercial Court',
  '7': 'Jurisdiction of Commercial Divisions of High Courts',
  '8': 'Bar against revision application or petition against an interlocutory order',
  '9': 'Transfer of suit if counterclaim in a commercial dispute is of Specified Value',
  '10': 'Jurisdiction in respect of arbitration matters',
  '11': 'Bar of jurisdiction of Commercial Courts and Commercial Divisions',
  '12': 'Determination of Specified Value',
  '12A': 'Pre-Institution Mediation and Settlement (Mandatory pre-litigation mediation unless urgent interim relief sought)',
  '13': 'Appeals from decrees of Commercial Courts and Commercial Divisions (60-day limitation)',
  '14': 'Expeditious disposal of appeals (Disposal within 6 months)',
  '15': 'Transfer of pending cases',
  '16': 'Amendments to the Code of Civil Procedure, 1908 in its application to commercial disputes',
  '17': 'Collection and disclosure of data by Commercial Courts, Commercial Appellate Courts and Commercial Divisions',
  '18': 'Power of High Court to issue directions',
  '19': 'Infrastructure facilities',
  '20': 'Training and continuous education',
  '21': 'Act to have overriding effect',
  '22': 'Power to remove difficulties',
  '23': 'Repeal and savings'
};
for (let i = 1; i <= 23; i++) {
  const s = String(i);
  let ch = 'Chapter I';
  if (i >= 3 && i <= 11) ch = 'Chapter II';
  if (i === 12) ch = 'Chapter III';
  if (s === '12A' || i === 12) ch = 'Chapter IIIA';
  if (i >= 13 && i <= 14) ch = 'Chapter IV';
  if (i === 15) ch = 'Chapter V';
  if (i === 16) ch = 'Chapter VI';
  if (i >= 17) ch = 'Chapter VII';
  CCA_SECTIONS.push({
    section_number: s,
    section_title: CCA_TITLES[s] || `Section ${s} of the Commercial Courts Act, 2015`,
    chapter_number: ch,
    legal_nature: 'Procedure',
    section_text: `Statutory mandate for Section ${s} (${CCA_TITLES[s]}) under Commercial Courts Act, 2015 governing adjudication, specified valuation thresholds, and expedited dispute resolution in Indian commercial litigation.`
  });
}
// Add 12A
CCA_SECTIONS.splice(12, 0, {
  section_number: '12A',
  section_title: CCA_TITLES['12A'],
  chapter_number: 'Chapter IIIA',
  legal_nature: 'Procedure',
  section_text: `Statutory mandate for Section 12A of the Commercial Courts Act, 2015 governing mandatory pre-institution mediation prior to filing commercial suits without urgent interim relief.`
});

const FCA_CHAPTERS = [
  { chapter_number: 'Chapter I', title: 'Preliminary', chapter_order: 1 },
  { chapter_number: 'Chapter II', title: 'Family Courts', chapter_order: 2 },
  { chapter_number: 'Chapter III', title: 'Jurisdiction', chapter_order: 3 },
  { chapter_number: 'Chapter IV', title: 'Procedure', chapter_order: 4 },
  { chapter_number: 'Chapter V', title: 'Appeals and Revisions', chapter_order: 5 },
  { chapter_number: 'Chapter VI', title: 'Miscellaneous', chapter_order: 6 }
];

const FCA_SECTIONS = [];
const FCA_TITLES = {
  '1': 'Short title, extent and commencement',
  '2': 'Definitions',
  '3': 'Establishment of Family Courts',
  '4': 'Appointment of Judges',
  '5': 'Association of social welfare agencies, etc.',
  '6': 'Counsellors, officers and other staff of Family Courts',
  '7': 'Jurisdiction (Matrimonial suits, child custody, guardianship, maintenance)',
  '8': 'Exclusion of jurisdiction and pending proceedings',
  '9': 'Duty of Family Court to make efforts for settlement / conciliation',
  '10': 'Procedure generally (Application of CPC and CrPC)',
  '11': 'Proceedings to be held in camera',
  '12': 'Assistance of medical and welfare experts',
  '13': 'Right to legal representation (With permission of Family Court)',
  '14': 'Application of Indian Evidence Act, 1872 (Relaxation of strict evidence rules)',
  '15': 'Record of oral evidence',
  '16': 'Evidence of formal character on affidavit',
  '17': 'Judgment',
  '18': 'Execution of decrees and orders',
  '19': 'Appeal to High Court (30-day limitation; Bench of two Judges)',
  '20': 'Act to have overriding effect',
  '21': 'Power of High Court to make rules',
  '22': 'Power of Central Government to make rules',
  '23': 'Power of State Government to make rules'
};
for (let i = 1; i <= 23; i++) {
  const s = String(i);
  let ch = 'Chapter I';
  if (i >= 3 && i <= 6) ch = 'Chapter II';
  if (i >= 7 && i <= 8) ch = 'Chapter III';
  if (i >= 9 && i <= 18) ch = 'Chapter IV';
  if (i === 19) ch = 'Chapter V';
  if (i >= 20) ch = 'Chapter VI';
  FCA_SECTIONS.push({
    section_number: s,
    section_title: FCA_TITLES[s] || `Section ${s} of the Family Courts Act, 1984`,
    chapter_number: ch,
    legal_nature: 'Procedure',
    section_text: `Statutory mandate for Section ${s} (${FCA_TITLES[s]}) under Family Courts Act, 1984 governing family court jurisdiction, conciliatory dispute resolution, and appellate review.`
  });
}

module.exports = {
  CONST_CHAPTERS,
  CONST_SECTIONS,
  CPC_CHAPTERS,
  CPC_SECTIONS,
  CCA_CHAPTERS,
  CCA_SECTIONS,
  FCA_CHAPTERS,
  FCA_SECTIONS
};
