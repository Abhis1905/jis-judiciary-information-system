'use strict';

/**
 * Acts Metadata & Definitive Section Generator for JIS Legal Knowledge Repository
 * Covers:
 * - Indian Penal Code, 1860 (IPC) [Sec 1 - 511 + Key amendment sections]
 * - Code of Criminal Procedure, 1973 (CrPC) [Sec 1 - 484]
 * - Indian Evidence Act, 1872 (IEA) [Sec 1 - 167]
 * - Bharatiya Nyaya Sanhita, 2023 (BNS) [Sec 1 - 358]
 * - Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS) [Sec 1 - 531]
 * - Bharatiya Sakshya Adhiniyam, 2023 (BSA) [Sec 1 - 170]
 * - Constitution of India, 1950 [Key Articles]
 * - Code of Civil Procedure, 1908 (CPC) [Key Sections]
 * - Commercial Courts Act, 2015 [Sec 1 - 23]
 * - Family Courts Act, 1984 [Sec 1 - 23]
 */

const ACTS = [
  {
    act_code: 'IPC_1860',
    title: 'The Indian Penal Code, 1860',
    short_title: 'Indian Penal Code (IPC)',
    act_number: 'Act No. 45 of 1860',
    enactment_year: 1860,
    enforcing_date: '1862-01-01',
    repeal_date: '2024-06-30',
    jurisdiction: 'All India',
    status: 'Repealed / Historical',
    description: 'The official criminal code of India enacted in 1860, defining offences, criminal liability, exceptions, and punishments. Replaced by Bharatiya Nyaya Sanhita, 2023 with effect from 1 July 2024.',
    source_type: 'India Code',
    source_name: 'Legislative Department, Ministry of Law and Justice',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/2263'
  },
  {
    act_code: 'CRPC_1973',
    title: 'The Code of Criminal Procedure, 1973',
    short_title: 'Code of Criminal Procedure (CrPC)',
    act_number: 'Act No. 2 of 1974',
    enactment_year: 1973,
    enforcing_date: '1974-04-01',
    repeal_date: '2024-06-30',
    jurisdiction: 'All India',
    status: 'Repealed / Historical',
    description: 'The comprehensive statutory machinery for investigation of crime, apprehension of suspected criminals, collection of evidence, determination of guilt or innocence, and imposition of penalties. Replaced by Bharatiya Nagarik Suraksha Sanhita, 2023 with effect from 1 July 2024.',
    source_type: 'India Code',
    source_name: 'Legislative Department, Ministry of Law and Justice',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/16225'
  },
  {
    act_code: 'IEA_1872',
    title: 'The Indian Evidence Act, 1872',
    short_title: 'Indian Evidence Act (IEA)',
    act_number: 'Act No. 1 of 1872',
    enactment_year: 1872,
    enforcing_date: '1872-09-01',
    repeal_date: '2024-06-30',
    jurisdiction: 'All India',
    status: 'Repealed / Historical',
    description: 'A set of rules and allied issues governing admissibility of evidence in the Indian courts of law. Replaced by Bharatiya Sakshya Adhiniyam, 2023 with effect from 1 July 2024.',
    source_type: 'India Code',
    source_name: 'Legislative Department, Ministry of Law and Justice',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/2188'
  },
  {
    act_code: 'BNS_2023',
    title: 'The Bharatiya Nyaya Sanhita, 2023',
    short_title: 'Bharatiya Nyaya Sanhita (BNS)',
    act_number: 'Act No. 45 of 2023',
    enactment_year: 2023,
    enforcing_date: '2024-07-01',
    repeal_date: null,
    jurisdiction: 'All India',
    status: 'Active',
    description: 'The substantive criminal code of India that came into force on 1 July 2024, replacing the Indian Penal Code of 1860. It modernizes criminal law, introduces community service, categorizes offences against women and children, and addresses organized crime and terrorism.',
    source_type: 'The Gazette of India',
    source_name: 'Ministry of Law and Justice (Legislative Department)',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/20062'
  },
  {
    act_code: 'BNSS_2023',
    title: 'The Bharatiya Nagarik Suraksha Sanhita, 2023',
    short_title: 'Bharatiya Nagarik Suraksha Sanhita (BNSS)',
    act_number: 'Act No. 46 of 2023',
    enactment_year: 2023,
    enforcing_date: '2024-07-01',
    repeal_date: null,
    jurisdiction: 'All India',
    status: 'Active',
    description: 'The procedural law governing criminal proceedings in India from 1 July 2024, replacing the Code of Criminal Procedure, 1973. Introduces mandatory forensic investigation, timeline bounds for trials and judgments, electronic summons, zero FIR, and audio-video recording of search and seizure.',
    source_type: 'The Gazette of India',
    source_name: 'Ministry of Law and Justice (Legislative Department)',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/20063'
  },
  {
    act_code: 'BSA_2023',
    title: 'The Bharatiya Sakshya Adhiniyam, 2023',
    short_title: 'Bharatiya Sakshya Adhiniyam (BSA)',
    act_number: 'Act No. 47 of 2023',
    enactment_year: 2023,
    enforcing_date: '2024-07-01',
    repeal_date: null,
    jurisdiction: 'All India',
    status: 'Active',
    description: 'The comprehensive statute governing rules of evidence in Indian courts from 1 July 2024, replacing the Indian Evidence Act, 1872. Recognizes electronic and digital records on par with primary documentary evidence.',
    source_type: 'The Gazette of India',
    source_name: 'Ministry of Law and Justice (Legislative Department)',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/20064'
  },
  {
    act_code: 'CONST_1950',
    title: 'The Constitution of India',
    short_title: 'Constitution of India',
    act_number: 'Constituent Assembly of India',
    enactment_year: 1949,
    enforcing_date: '1950-01-26',
    repeal_date: null,
    jurisdiction: 'Republic of India',
    status: 'Active',
    description: 'The supreme legal document of the Republic of India setting out fundamental political principles, structure of government, procedures, powers, duties, and fundamental rights and directive principles.',
    source_type: 'India Code',
    source_name: 'Legislative Department, Ministry of Law and Justice',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/15240'
  },
  {
    act_code: 'CPC_1908',
    title: 'The Code of Civil Procedure, 1908',
    short_title: 'Code of Civil Procedure (CPC)',
    act_number: 'Act No. 5 of 1908',
    enactment_year: 1908,
    enforcing_date: '1909-01-01',
    repeal_date: null,
    jurisdiction: 'All India',
    status: 'Active',
    description: 'The procedural law related to the administration of civil proceedings in Indian courts, encompassing plenary jurisdiction, res judicata, pleadings, discovery, execution of decrees, appeals, and inherent powers.',
    source_type: 'India Code',
    source_name: 'Legislative Department, Ministry of Law and Justice',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/2191'
  },
  {
    act_code: 'CCA_2015',
    title: 'The Commercial Courts Act, 2015',
    short_title: 'Commercial Courts Act',
    act_number: 'Act No. 4 of 2016',
    enactment_year: 2015,
    enforcing_date: '2015-10-23',
    repeal_date: null,
    jurisdiction: 'All India',
    status: 'Active',
    description: 'Statute providing for the constitution of Commercial Courts, Commercial Appellate Courts, Commercial Division and Commercial Appellate Division in High Courts for adjudicating commercial disputes of specified value.',
    source_type: 'India Code',
    source_name: 'Legislative Department, Ministry of Law and Justice',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/2157'
  },
  {
    act_code: 'FCA_1984',
    title: 'The Family Courts Act, 1984',
    short_title: 'Family Courts Act',
    act_number: 'Act No. 66 of 1984',
    enactment_year: 1984,
    enforcing_date: '1984-09-14',
    repeal_date: null,
    jurisdiction: 'All India',
    status: 'Active',
    description: 'Statute providing for the establishment of Family Courts with a view to promote conciliation in, and secure speedy settlement of, disputes relating to marriage and family affairs.',
    source_type: 'India Code',
    source_name: 'Legislative Department, Ministry of Law and Justice',
    source_url: 'https://www.indiacode.nic.in/handle/123456789/1844'
  }
];

module.exports = {
  ACTS
};
