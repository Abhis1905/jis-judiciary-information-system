'use strict';

/**
 * Procedural Classifications from Statutory First Schedules (CrPC / BNSS)
 */

const PROCEDURAL_CLASSIFICATIONS = [
  // IPC Offenses
  {
    act_code: 'IPC_1860',
    section_number: '302',
    cognizable: 'Cognizable',
    bailable: 'Non-Bailable',
    compoundable: 'Non-Compoundable',
    court_competent: 'Court of Session',
    punishment_summary: 'Death or Imprisonment for life, and fine',
    schedule_reference: 'First Schedule to Code of Criminal Procedure, 1973',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/16225'
  },
  {
    act_code: 'IPC_1860',
    section_number: '304',
    cognizable: 'Cognizable',
    bailable: 'Non-Bailable',
    compoundable: 'Non-Compoundable',
    court_competent: 'Court of Session',
    punishment_summary: 'Imprisonment for life or imprisonment up to 10 years, and fine',
    schedule_reference: 'First Schedule to Code of Criminal Procedure, 1973',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/16225'
  },
  {
    act_code: 'IPC_1860',
    section_number: '304A',
    cognizable: 'Cognizable',
    bailable: 'Bailable',
    compoundable: 'Non-Compoundable',
    court_competent: 'Magistrate of the first class',
    punishment_summary: 'Imprisonment up to 2 years, or fine, or both',
    schedule_reference: 'First Schedule to Code of Criminal Procedure, 1973',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/16225'
  },
  {
    act_code: 'IPC_1860',
    section_number: '304B',
    cognizable: 'Cognizable',
    bailable: 'Non-Bailable',
    compoundable: 'Non-Compoundable',
    court_competent: 'Court of Session',
    punishment_summary: 'Imprisonment not less than 7 years, extending up to imprisonment for life',
    schedule_reference: 'First Schedule to Code of Criminal Procedure, 1973',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/16225'
  },
  {
    act_code: 'IPC_1860',
    section_number: '307',
    cognizable: 'Cognizable',
    bailable: 'Non-Bailable',
    compoundable: 'Non-Compoundable',
    court_competent: 'Court of Session',
    punishment_summary: 'Imprisonment up to 10 years and fine; if hurt caused, imprisonment for life or up to 10 years',
    schedule_reference: 'First Schedule to Code of Criminal Procedure, 1973',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/16225'
  },
  {
    act_code: 'IPC_1860',
    section_number: '323',
    cognizable: 'Non-Cognizable',
    bailable: 'Bailable',
    compoundable: 'Compoundable',
    court_competent: 'Any Magistrate',
    punishment_summary: 'Imprisonment up to 1 year, or fine up to 1,000 rupees, or both',
    schedule_reference: 'First Schedule to Code of Criminal Procedure, 1973',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/16225'
  },
  {
    act_code: 'IPC_1860',
    section_number: '324',
    cognizable: 'Cognizable',
    bailable: 'Non-Bailable',
    compoundable: 'Compoundable with permission of Court',
    court_competent: 'Any Magistrate',
    punishment_summary: 'Imprisonment up to 3 years, or fine, or both',
    schedule_reference: 'First Schedule to Code of Criminal Procedure, 1973',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/16225'
  },
  {
    act_code: 'IPC_1860',
    section_number: '325',
    cognizable: 'Cognizable',
    bailable: 'Bailable',
    compoundable: 'Compoundable with permission of Court',
    court_competent: 'Any Magistrate',
    punishment_summary: 'Imprisonment up to 7 years, and fine',
    schedule_reference: 'First Schedule to Code of Criminal Procedure, 1973',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/16225'
  },
  {
    act_code: 'IPC_1860',
    section_number: '326A',
    cognizable: 'Cognizable',
    bailable: 'Non-Bailable',
    compoundable: 'Non-Compoundable',
    court_competent: 'Court of Session',
    punishment_summary: 'Imprisonment not less than 10 years, extending to life, and fine',
    schedule_reference: 'First Schedule to Code of Criminal Procedure, 1973',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/16225'
  },
  {
    act_code: 'IPC_1860',
    section_number: '354',
    cognizable: 'Cognizable',
    bailable: 'Non-Bailable',
    compoundable: 'Non-Compoundable',
    court_competent: 'Any Magistrate',
    punishment_summary: 'Imprisonment not less than 1 year extending to 5 years, and fine',
    schedule_reference: 'First Schedule to Code of Criminal Procedure, 1973',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/16225'
  },
  {
    act_code: 'IPC_1860',
    section_number: '376',
    cognizable: 'Cognizable',
    bailable: 'Non-Bailable',
    compoundable: 'Non-Compoundable',
    court_competent: 'Court of Session (Presided by Woman Judge where practicable)',
    punishment_summary: 'Rigorous imprisonment not less than 10 years extending to life, and fine',
    schedule_reference: 'First Schedule to Code of Criminal Procedure, 1973',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/16225'
  },
  {
    act_code: 'IPC_1860',
    section_number: '379',
    cognizable: 'Cognizable',
    bailable: 'Non-Bailable',
    compoundable: 'Compoundable with permission of Court',
    court_competent: 'Any Magistrate',
    punishment_summary: 'Imprisonment up to 3 years, or fine, or both',
    schedule_reference: 'First Schedule to Code of Criminal Procedure, 1973',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/16225'
  },
  {
    act_code: 'IPC_1860',
    section_number: '392',
    cognizable: 'Cognizable',
    bailable: 'Non-Bailable',
    compoundable: 'Non-Compoundable',
    court_competent: 'Magistrate of the first class',
    punishment_summary: 'Rigorous imprisonment up to 10 years (14 years if on highway between sunset and sunrise), and fine',
    schedule_reference: 'First Schedule to Code of Criminal Procedure, 1973',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/16225'
  },
  {
    act_code: 'IPC_1860',
    section_number: '406',
    cognizable: 'Cognizable',
    bailable: 'Non-Bailable',
    compoundable: 'Compoundable with permission of Court',
    court_competent: 'Magistrate of the first class',
    punishment_summary: 'Imprisonment up to 3 years, or fine, or both',
    schedule_reference: 'First Schedule to Code of Criminal Procedure, 1973',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/16225'
  },
  {
    act_code: 'IPC_1860',
    section_number: '420',
    cognizable: 'Cognizable',
    bailable: 'Non-Bailable',
    compoundable: 'Compoundable with permission of Court',
    court_competent: 'Magistrate of the first class',
    punishment_summary: 'Imprisonment up to 7 years, and fine',
    schedule_reference: 'First Schedule to Code of Criminal Procedure, 1973',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/16225'
  },
  {
    act_code: 'IPC_1860',
    section_number: '498A',
    cognizable: 'Cognizable',
    bailable: 'Non-Bailable',
    compoundable: 'Non-Compoundable',
    court_competent: 'Magistrate of the first class',
    punishment_summary: 'Imprisonment up to 3 years, and fine',
    schedule_reference: 'First Schedule to Code of Criminal Procedure, 1973',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/16225'
  },
  {
    act_code: 'IPC_1860',
    section_number: '500',
    cognizable: 'Non-Cognizable',
    bailable: 'Bailable',
    compoundable: 'Compoundable',
    court_competent: 'Court of Session / Magistrate of the first class',
    punishment_summary: 'Simple imprisonment up to 2 years, or fine, or both',
    schedule_reference: 'First Schedule to Code of Criminal Procedure, 1973',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/16225'
  },

  // BNS Offenses
  {
    act_code: 'BNS_2023',
    section_number: '103',
    cognizable: 'Cognizable',
    bailable: 'Non-Bailable',
    compoundable: 'Non-Compoundable',
    court_competent: 'Court of Session',
    punishment_summary: 'Death or Imprisonment for life, and fine (Also applies to mob lynching by group of 5 or more)',
    schedule_reference: 'First Schedule to Bharatiya Nagarik Suraksha Sanhita, 2023',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/20063'
  },
  {
    act_code: 'BNS_2023',
    section_number: '105',
    cognizable: 'Cognizable',
    bailable: 'Non-Bailable',
    compoundable: 'Non-Compoundable',
    court_competent: 'Court of Session',
    punishment_summary: 'Imprisonment for life or imprisonment up to 10 years, and fine',
    schedule_reference: 'First Schedule to Bharatiya Nagarik Suraksha Sanhita, 2023',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/20063'
  },
  {
    act_code: 'BNS_2023',
    section_number: '106',
    cognizable: 'Cognizable',
    bailable: 'Bailable',
    compoundable: 'Non-Compoundable',
    court_competent: 'Magistrate of the first class / Court of Session',
    punishment_summary: 'Imprisonment up to 5 years (up to 10 years for hit and run without reporting to police/magistrate)',
    schedule_reference: 'First Schedule to Bharatiya Nagarik Suraksha Sanhita, 2023',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/20063'
  },
  {
    act_code: 'BNS_2023',
    section_number: '80',
    cognizable: 'Cognizable',
    bailable: 'Non-Bailable',
    compoundable: 'Non-Compoundable',
    court_competent: 'Court of Session',
    punishment_summary: 'Imprisonment not less than 7 years, extending to imprisonment for life',
    schedule_reference: 'First Schedule to Bharatiya Nagarik Suraksha Sanhita, 2023',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/20063'
  },
  {
    act_code: 'BNS_2023',
    section_number: '109',
    cognizable: 'Cognizable',
    bailable: 'Non-Bailable',
    compoundable: 'Non-Compoundable',
    court_competent: 'Court of Session',
    punishment_summary: 'Imprisonment up to 10 years and fine; if hurt caused, imprisonment for life or up to 10 years',
    schedule_reference: 'First Schedule to Bharatiya Nagarik Suraksha Sanhita, 2023',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/20063'
  },
  {
    act_code: 'BNS_2023',
    section_number: '64',
    cognizable: 'Cognizable',
    bailable: 'Non-Bailable',
    compoundable: 'Non-Compoundable',
    court_competent: 'Court of Session',
    punishment_summary: 'Rigorous imprisonment not less than 10 years extending to life, and fine',
    schedule_reference: 'First Schedule to Bharatiya Nagarik Suraksha Sanhita, 2023',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/20063'
  },
  {
    act_code: 'BNS_2023',
    section_number: '70',
    cognizable: 'Cognizable',
    bailable: 'Non-Bailable',
    compoundable: 'Non-Compoundable',
    court_competent: 'Court of Session',
    punishment_summary: 'Rigorous imprisonment not less than 20 years or imprisonment for life for remainder of natural life',
    schedule_reference: 'First Schedule to Bharatiya Nagarik Suraksha Sanhita, 2023',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/20063'
  },
  {
    act_code: 'BNS_2023',
    section_number: '303',
    cognizable: 'Cognizable',
    bailable: 'Non-Bailable',
    compoundable: 'Compoundable with permission of Court',
    court_competent: 'Any Magistrate',
    punishment_summary: 'Imprisonment up to 3 years, or fine, or both; community service for petty theft under 5,000 on return of value',
    schedule_reference: 'First Schedule to Bharatiya Nagarik Suraksha Sanhita, 2023',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/20063'
  },
  {
    act_code: 'BNS_2023',
    section_number: '304',
    cognizable: 'Cognizable',
    bailable: 'Non-Bailable',
    compoundable: 'Non-Compoundable',
    court_competent: 'Any Magistrate',
    punishment_summary: 'Imprisonment up to 3 years, and fine',
    schedule_reference: 'First Schedule to Bharatiya Nagarik Suraksha Sanhita, 2023',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/20063'
  },
  {
    act_code: 'BNS_2023',
    section_number: '318',
    cognizable: 'Cognizable',
    bailable: 'Non-Bailable',
    compoundable: 'Compoundable with permission of Court',
    court_competent: 'Magistrate of the first class',
    punishment_summary: 'Imprisonment up to 7 years, and fine',
    schedule_reference: 'First Schedule to Bharatiya Nagarik Suraksha Sanhita, 2023',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/20063'
  },
  {
    act_code: 'BNS_2023',
    section_number: '85',
    cognizable: 'Cognizable',
    bailable: 'Non-Bailable',
    compoundable: 'Non-Compoundable',
    court_competent: 'Magistrate of the first class',
    punishment_summary: 'Imprisonment up to 3 years, and fine',
    schedule_reference: 'First Schedule to Bharatiya Nagarik Suraksha Sanhita, 2023',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/20063'
  },
  {
    act_code: 'BNS_2023',
    section_number: '356',
    cognizable: 'Non-Cognizable',
    bailable: 'Bailable',
    compoundable: 'Compoundable',
    court_competent: 'Magistrate of the first class',
    punishment_summary: 'Simple imprisonment up to 2 years, or fine, or both, or community service',
    schedule_reference: 'First Schedule to Bharatiya Nagarik Suraksha Sanhita, 2023',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/20063'
  }
];

module.exports = {
  PROCEDURAL_CLASSIFICATIONS
};
