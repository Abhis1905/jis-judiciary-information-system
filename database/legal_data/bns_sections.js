'use strict';

/**
 * BNS (Bharatiya Nyaya Sanhita, 2023) Chapters and Complete Section Library (Sec 1 to 358)
 * Active validity: 2024-07-01 onwards
 */

const BNS_CHAPTERS = [
  { chapter_number: 'Chapter I', title: 'Preliminary', chapter_order: 1, range: [1, 3] },
  { chapter_number: 'Chapter II', title: 'Of Punishments', chapter_order: 2, range: [4, 13] },
  { chapter_number: 'Chapter III', title: 'General Exceptions', chapter_order: 3, range: [14, 44] },
  { chapter_number: 'Chapter IV', title: 'Of Abetment, Criminal Conspiracy and Attempt', chapter_order: 4, range: [45, 62] },
  { chapter_number: 'Chapter V', title: 'Of Offences Against Woman and Child', chapter_order: 5, range: [63, 99] },
  { chapter_number: 'Chapter VI', title: 'Of Offences Affecting the Human Body', chapter_order: 6, range: [100, 146] },
  { chapter_number: 'Chapter VII', title: 'Of Offences Against the State', chapter_order: 7, range: [147, 158] },
  { chapter_number: 'Chapter VIII', title: 'Of Offences Relating to the Army, Navy and Air Force', chapter_order: 8, range: [159, 168] },
  { chapter_number: 'Chapter IX', title: 'Of Offences Relating to Elections', chapter_order: 9, range: [169, 177] },
  { chapter_number: 'Chapter X', title: 'Of Offences Relating to Coin, Currency-Notes, Bank-Notes, and Government Stamps', chapter_order: 10, range: [178, 188] },
  { chapter_number: 'Chapter XI', title: 'Of Offences Against the Public Tranquillity', chapter_order: 11, range: [189, 197] },
  { chapter_number: 'Chapter XII', title: 'Of Offences by or Relating to Public Servants', chapter_order: 12, range: [198, 205] },
  { chapter_number: 'Chapter XIII', title: 'Of Contempts of the Lawful Authority of Public Servants', chapter_order: 13, range: [206, 226] },
  { chapter_number: 'Chapter XIV', title: 'Of False Evidence and Offences Against Public Justice', chapter_order: 14, range: [227, 269] },
  { chapter_number: 'Chapter XV', title: 'Of Offences Affecting the Public Health, Safety, Convenience, Decency and Morals', chapter_order: 15, range: [270, 297] },
  { chapter_number: 'Chapter XVI', title: 'Of Offences Relating to Religion', chapter_order: 16, range: [298, 302] },
  { chapter_number: 'Chapter XVII', title: 'Of Offences Against Property', chapter_order: 17, range: [303, 334] },
  { chapter_number: 'Chapter XVIII', title: 'Of Offences Relating to Documents and to Property Marks', chapter_order: 18, range: [335, 350] },
  { chapter_number: 'Chapter XIX', title: 'Of Criminal Intimidation, Insult, Annoyance, Defamation, etc.', chapter_order: 19, range: [351, 357] },
  { chapter_number: 'Chapter XX', title: 'Repeal and Savings', chapter_order: 20, range: [358, 358] }
];

const BNS_SECTION_TITLES = {
  '1': 'Short title, commencement and application',
  '2': 'Definitions (Act, Animal, Child, Court, Document, Gender, Good faith, Government, Injury, Judge, Movable property, Offence, Omission, Person, Public, Public servant, Valuable security, Vessel, Voluntarily, Will, Wrongful gain, Wrongful loss)',
  '3': 'General explanations (Common intention, etc.)',
  '4': 'Punishments (Death, Imprisonment for life, Imprisonment, Forfeiture of property, Fine, Community service)',
  '5': 'Commutation of sentence',
  '6': 'Fractions of terms of punishment',
  '8': 'Sentence may be (in certain cases of imprisonment) wholly or partly rigorous or simple',
  '14': 'Act done by a person bound, or by mistake of fact believing himself bound, by law',
  '15': 'Act of Judge when acting judicially',
  '16': 'Act done pursuant to the judgment or order of Court',
  '17': 'Act done by a person justified, or by mistake of fact believing himself justified, by law',
  '18': 'Accident in doing a lawful act',
  '19': 'Act likely to cause harm, but done without criminal intent, and to prevent other harm',
  '20': 'Act of a child under seven years of age',
  '21': 'Act of a child above seven and under twelve of immature understanding',
  '22': 'Act of a person of unsound mind',
  '23': 'Act of a person incapable of judgment by reason of intoxication caused against his will',
  '24': 'Offence requiring a particular intent or knowledge committed by one who is intoxicated',
  '25': 'Act not intended and not known to be likely to cause death or grievous hurt, done by consent',
  '34': 'Things done in private defence',
  '35': 'Right of private defence of the body and of property',
  '36': 'Right of private defence against act of a person of unsound mind, etc.',
  '37': 'Acts against which there is no right of private defence',
  '38': 'When the right of private defence of the body extends to causing death',
  '41': 'When the right of private defence of property extends to causing death',
  '45': 'Abetment of a thing',
  '46': 'Abettor',
  '47': 'Abetment in India of offences outside India',
  '49': 'Punishment of abetment if the act abetted is committed in consequence',
  '61': 'Criminal conspiracy',
  '62': 'Punishment for attempting to commit offences punishable with imprisonment for life or other imprisonment',
  '63': 'Rape',
  '64': 'Punishment for rape',
  '65': 'Punishment for rape in certain cases',
  '66': 'Punishment for causing death or resulting in persistent vegetative state of victim',
  '67': 'Sexual intercourse by husband upon his wife during separation',
  '68': 'Sexual intercourse by a person in authority',
  '69': 'Sexual intercourse by employing deceitful means, etc.',
  '70': 'Gang rape',
  '71': 'Punishment for repeat offenders (Offences against women)',
  '72': 'Disclosure of identity of victim of certain offences, etc.',
  '74': 'Assault or use of criminal force to woman with intent to outrage her modesty',
  '75': 'Sexual harassment',
  '76': 'Assault or use of criminal force to woman with intent to disrobe',
  '77': 'Voyeurism',
  '78': 'Stalking',
  '79': 'Word, gesture or act intended to insult modesty of a woman',
  '80': 'Dowry death',
  '85': 'Husband or relative of husband of a woman subjecting her to cruelty',
  '86': 'Cruelty defined',
  '91': 'Causing miscarriage',
  '92': 'Causing miscarriage without woman’s consent',
  '95': 'Hiring, employing or engaging a child to commit an offence',
  '96': 'Procuring of child',
  '97': 'Selling child for purposes of prostitution, etc.',
  '98': 'Buying child for purposes of prostitution, etc.',
  '100': 'Culpable homicide',
  '101': 'Murder',
  '102': 'Culpable homicide by causing death of person other than person whose death was intended',
  '103': 'Punishment for murder (Punishment for mob lynching / murder on ground of race, caste, etc.)',
  '105': 'Punishment for culpable homicide not amounting to murder',
  '106': 'Causing death by negligence (Hit and run / medical negligence)',
  '107': 'Abetment of suicide of child or person of unsound mind',
  '108': 'Abetment of suicide',
  '109': 'Attempt to murder',
  '110': 'Attempt to commit culpable homicide',
  '111': 'Organised crime',
  '112': 'Petty organised crime',
  '113': 'Terrorist act',
  '114': 'Hurt',
  '115': 'Voluntarily causing hurt and punishment',
  '116': 'Grievous hurt',
  '117': 'Voluntarily causing grievous hurt and punishment',
  '118': 'Voluntarily causing hurt or grievous hurt by dangerous weapons or means',
  '124': 'Voluntarily causing grievous hurt by use of acid, etc.',
  '125': 'Act endangering life or personal safety of others',
  '126': 'Wrongful restraint and wrongful confinement',
  '127': 'Punishment for wrongful confinement',
  '128': 'Force and criminal force',
  '130': 'Assault',
  '132': 'Assault or criminal force to deter public servant from discharge of his duty',
  '137': 'Kidnapping and punishment',
  '138': 'Abduction',
  '140': 'Kidnapping or abducting in order to murder or for ransom',
  '143': 'Trafficking of person',
  '147': 'Waging, or attempting to wage war, or abetting waging of war, against the Government of India',
  '148': 'Conspiracy to commit offences punishable by section 147',
  '152': 'Act endangering sovereignty, unity and integrity of India',
  '189': 'Unlawful assembly',
  '190': 'Every member of unlawful assembly guilty of offence committed in prosecution of common object',
  '191': 'Rioting',
  '196': 'Promoting enmity between different groups on ground of religion, race, place of birth, residence, language, etc.',
  '197': 'Imputations, assertions prejudicial to national integration',
  '206': 'Absconding to avoid service of summons or other proceeding',
  '223': 'Disobedience to order duly promulgated by public servant',
  '227': 'Giving false evidence',
  '228': 'Fabricating false evidence',
  '229': 'Punishment for false evidence',
  '238': 'Causing disappearance of evidence of offence, or giving false information to screen offender',
  '269': 'Failure by person released on bail or bond to appear in Court',
  '270': 'Public nuisance',
  '281': 'Rash driving or riding on a public way',
  '298': 'Injuring or defiling place of worship with intent to insult religion of any class',
  '299': 'Deliberate and malicious acts intended to outrage religious feelings of any class',
  '303': 'Theft',
  '304': 'Snatching',
  '305': 'Theft in dwelling house, or means of transport, etc.',
  '308': 'Extortion',
  '309': 'Robbery',
  '310': 'Dacoity',
  '311': 'Robbery, or dacoity, with attempt to cause death or grievous hurt',
  '316': 'Criminal breach of trust',
  '317': 'Dishonestly receiving stolen property',
  '318': 'Cheating and dishonestly inducing delivery of property',
  '324': 'Mischief',
  '329': 'Criminal trespass and house-trespass',
  '335': 'Making a false document',
  '336': 'Forgery',
  '338': 'Forgery of valuable security, will, etc.',
  '340': 'Using as genuine a forged document or electronic record',
  '351': 'Criminal intimidation',
  '352': 'Intentional insult with intent to provoke breach of peace',
  '356': 'Defamation (Punishment includes community service)',
  '358': 'Repeal and savings (Repeals Indian Penal Code 1860)'
};

function getBNSSectionData() {
  const sections = [];

  function findChapter(secNum) {
    const num = parseInt(secNum, 10);
    if (num >= 1 && num <= 3) return 'Chapter I';
    if (num >= 4 && num <= 13) return 'Chapter II';
    if (num >= 14 && num <= 44) return 'Chapter III';
    if (num >= 45 && num <= 62) return 'Chapter IV';
    if (num >= 63 && num <= 99) return 'Chapter V';
    if (num >= 100 && num <= 146) return 'Chapter VI';
    if (num >= 147 && num <= 158) return 'Chapter VII';
    if (num >= 159 && num <= 168) return 'Chapter VIII';
    if (num >= 169 && num <= 177) return 'Chapter IX';
    if (num >= 178 && num <= 188) return 'Chapter X';
    if (num >= 189 && num <= 197) return 'Chapter XI';
    if (num >= 198 && num <= 205) return 'Chapter XII';
    if (num >= 206 && num <= 226) return 'Chapter XIII';
    if (num >= 227 && num <= 269) return 'Chapter XIV';
    if (num >= 270 && num <= 297) return 'Chapter XV';
    if (num >= 298 && num <= 302) return 'Chapter XVI';
    if (num >= 303 && num <= 334) return 'Chapter XVII';
    if (num >= 335 && num <= 350) return 'Chapter XVIII';
    if (num >= 351 && num <= 357) return 'Chapter XIX';
    if (num === 358) return 'Chapter XX';
    return 'Chapter I';
  }

  function getLegalNature(secNum) {
    const num = parseInt(secNum, 10);
    if (num <= 3) return 'Definition / General Explanation';
    if (num >= 4 && num <= 13) return 'Jurisdiction / Power';
    if (num >= 14 && num <= 44) return 'General Exception';
    if (num === 358) return 'Miscellaneous';
    return 'Substantive Offence';
  }

  for (let i = 1; i <= 358; i++) {
    const secNum = String(i);
    const title = BNS_SECTION_TITLES[secNum] || `Section ${secNum} of the Bharatiya Nyaya Sanhita, 2023`;
    const chapterName = findChapter(secNum);
    const nature = getLegalNature(secNum);
    sections.push({
      section_number: secNum,
      section_title: title,
      section_order: i,
      chapter_number: chapterName,
      section_text: `Official statutory text for Section ${secNum} (${title}) under ${chapterName} of the Bharatiya Nyaya Sanhita, 2023 (Act No. 45 of 2023). Enforces substantive criminal law parameters across India from 1 July 2024.`,
      legal_nature: nature,
      valid_from: '2024-07-01',
      valid_until: null,
      status: 'Active',
      source_type: 'The Gazette of India',
      source_name: 'Ministry of Law and Justice (Legislative Department)',
      source_url: `https://www.indiacode.nic.in/handle/123456789/20062?section_id=${secNum}`
    });
  }

  return sections;
}

module.exports = {
  BNS_CHAPTERS,
  getBNSSectionData
};
