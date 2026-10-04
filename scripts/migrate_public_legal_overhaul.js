'use strict';

/**
 * Migration & Authentic Legal Data Enrichment Script
 * - Adds petitioner_arguments, respondent_arguments, court_reasoning to legal_judgments
 * - Creates judgment_documents table
 * - Cleans up boilerplate factual_summary, synthetic case numbers, and date mismatches on REAL_VERIFIED records
 * - Enriches flagship REAL_VERIFIED judgments with authentic, source-derived facts, arguments, and reasoning
 * - Links the 11 verified official Supreme Court PDFs in uploads/legal_judgments/ to judgment_documents
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../config/db');

// 40 Real SC cases from scAdditionalList with their authentic dates & real benches where verified
const SC_ADDITIONAL_DATE_FIXES = [
  { name: 'Romesh Sharma v. State (NCT of Delhi)', cite: '(2002) 1 SCC 547', date: '2001-12-10' },
  { name: 'Sharad Birdhichand Sarda v. State of Maharashtra', cite: '(1984) 4 SCC 116', date: '1984-07-17', bench: 'S. Murtaza Fazal Ali, A. Varadarajan, Sabyasachi Mukharji', case_number: 'Criminal Appeal No. 745 of 1983' },
  { name: 'Kishore Singh Ravinder Dev v. State of Rajasthan', cite: '(1981) 1 SCC 627', date: '1980-11-20', bench: 'V.R. Krishna Iyer, R.S. Pathak' },
  { name: 'Prem Shankar Shukla v. Delhi Administration', cite: '(1980) 3 SCC 526', date: '1980-04-29', bench: 'V.R. Krishna Iyer, R.S. Pathak, O. Chinnappa Reddy' },
  { name: 'Nandini Satpathy v. P.L. Dani', cite: '(1978) 2 SCC 424', date: '1978-04-07', bench: 'V.R. Krishna Iyer, Jaswant Singh, V.D. Tulzapurkar' },
  { name: 'Khatri (II) v. State of Bihar (Bhagalpur Blinding Case)', cite: '(1981) 1 SCC 627', date: '1980-12-19', bench: 'P.N. Bhagwati, A.P. Sen' },
  { name: 'Sheela Barse v. State of Maharashtra', cite: '(1983) 2 SCC 96', date: '1983-02-15', bench: 'P.N. Bhagwati, R.S. Pathak, Amarendra Nath Sen' },
  { name: 'Rudal Sah v. State of Bihar', cite: '(1983) 4 SCC 141', date: '1983-08-01', bench: 'Y.V. Chandrachud (CJI), Ranganath Misra, Amarendra Nath Sen', case_number: 'Writ Petition (Criminal) No. 1387 of 1982' },
  { name: 'Nilabati Behera v. State of Orissa', cite: '(1993) 2 SCC 746', date: '1993-03-24', bench: 'J.S. Verma, Dr. A.S. Anand, N. Venkatachala', case_number: 'Writ Petition (Criminal) No. 488 of 1988' },
  { name: 'State of Haryana v. Bhajan Lal', cite: '1992 Supp (1) SCC 335', date: '1990-11-21', bench: 'S. Ratnavel Pandian, K. Jayachandra Reddy', case_number: 'Civil Appeal No. 5412 of 1990' },
  { name: 'State of U.P. v. Deoman Upadhyaya', cite: '1960 AIR 1125', date: '1960-05-06', bench: 'B.P. Sinha (CJI), S.K. Das, J.L. Kapur, K. Subba Rao, J.C. Shah' },
  { name: 'Pulukuri Kottaya v. King-Emperor', cite: 'AIR 1947 PC 67', date: '1947-01-14', bench: 'Sir John Beaumont, Sir Madhavan Nair' },
  { name: 'Pakala Narayana Swami v. King-Emperor', cite: 'AIR 1939 PC 47', date: '1939-01-20', bench: 'Lord Atkin, Lord Thankerton, Lord Wright, Sir George Rankin, M.R. Jayakar' },
  { name: 'Kashmira Singh v. State of M.P.', cite: '1952 AIR 159', date: '1952-03-04', bench: 'Saiyid Fazl Ali, Vivian Bose, Ghulam Hasan' },
  { name: 'State of Maharashtra v. Damu', cite: '(2000) 6 SCC 269', date: '2000-05-02', bench: 'K.T. Thomas, D.P. Mohapatra' },
  { name: 'Babu v. State of Kerala', cite: '(2010) 9 SCC 189', date: '2010-08-11', bench: 'P. Sathasivam, Dr. B.S. Chauhan' },
  { name: 'State of Rajasthan v. Darshan Singh', cite: '(2012) 5 SCC 789', date: '2012-05-28', bench: 'Dr. B.S. Chauhan, Dipak Misra' },
  { name: 'Pradeep Kumar Verma v. State of Bihar', cite: '(2007) 7 SCC 413', date: '2007-08-20', bench: 'Arijit Pasayat, D.K. Jain' },
  { name: 'Central Bureau of Investigation v. V.C. Shukla (Jain Hawala Case)', cite: '(1998) 3 SCC 410', date: '1998-03-02', bench: 'M.K. Mukherjee, S.P. Kurdukar' },
  { name: 'Brij Bhushan v. State of Delhi', cite: '1950 AIR 129', date: '1950-05-26', bench: 'H.J. Kania (CJI), Saiyid Fazl Ali, M. Patanjali Sastri, Mehr Chand Mahajan, B.K. Mukherjea, S.R. Das' },
  { name: 'Tata Cellular v. Union of India', cite: '(1994) 6 SCC 651', date: '1994-07-26', bench: 'M.N. Venkatachaliah (CJI), S. Mohan, Dr. A.S. Anand', case_number: 'Civil Appeal No. 4988 of 1994' },
  { name: 'K. Veeraswami v. Union of India', cite: '(1991) 3 SCC 655', date: '1991-07-25', bench: 'B.C. Ray, L.M. Sharma, M.N. Venkatachaliah, J.S. Verma, S.C. Agrawal' },
  { name: 'T.N. Godavarman Thirumulpad v. Union of India', cite: '(1997) 2 SCC 267', date: '1996-12-12', bench: 'J.S. Verma, B.N. Kirpal', case_number: 'Writ Petition (Civil) No. 202 of 1995' },
  { name: 'M.C. Mehta v. Kamal Nath (Span Motels Case)', cite: '(1997) 1 SCC 388', date: '1996-12-13', bench: 'Kuldip Singh, S. Saghir Ahmad' },
  { name: 'M.P. Oil Extraction v. State of M.P.', cite: '(1997) 7 SCC 592', date: '1997-07-16', bench: 'G.N. Ray, G.B. Pattanaik' },
  { name: 'National Legal Services Authority (NALSA) v. Union of India', cite: '(2014) 5 SCC 438', date: '2014-04-15', bench: 'K.S. Radhakrishnan, A.K. Sikri', case_number: 'Writ Petition (Civil) No. 400 of 2012' },
  { name: 'Indian Young Lawyers Association v. State of Kerala (Sabarimala Case)', cite: '(2019) 11 SCC 1', date: '2018-09-28', bench: 'Dipak Misra (CJI), Rohinton F. Nariman, A.M. Khanwilkar, D.Y. Chandrachud, Indu Malhotra', case_number: 'Writ Petition (Civil) No. 373 of 2006' },
  { name: 'Jarnail Singh v. Lachhmi Narain Gupta', cite: '(2018) 10 SCC 396', date: '2018-09-26', bench: 'Dipak Misra (CJI), Kurian Joseph, Rohinton F. Nariman, Sanjay Kishan Kaul, Indu Malhotra', case_number: 'Special Leave Petition (Civil) No. 30621 of 2011' },
  { name: 'K.S. Puttaswamy (Aadhaar-5J) v. Union of India', cite: '(2019) 1 SCC 1', date: '2018-09-26', bench: 'Dipak Misra (CJI), A.K. Sikri, A.M. Khanwilkar, D.Y. Chandrachud, Ashok Bhushan', case_number: 'Writ Petition (Civil) No. 494 of 2012' },
  { name: 'Rojer Mathew v. South Indian Bank Ltd.', cite: '(2020) 6 SCC 1', date: '2019-11-13', bench: 'Ranjan Gogoi (CJI), N.V. Ramana, D.Y. Chandrachud, Deepak Gupta, Sanjiv Khanna' },
  { name: 'Madras Bar Association v. Union of India', cite: '(2021) 7 SCC 369', date: '2021-07-14', bench: 'L. Nageswara Rao, Hemant Gupta, S. Ravindra Bhat' },
  { name: 'Jacob Puliyel v. Union of India', cite: '(2022) 8 SCC 744', date: '2022-05-02', bench: 'L. Nageswara Rao, B.R. Gavai' },
  { name: 'Supriyo @ Supriya Chakraborty v. Union of India', cite: '(2023) 10 SCC 1', date: '2023-10-17', bench: 'D.Y. Chandrachud (CJI), Sanjay Kishan Kaul, S. Ravindra Bhat, Hima Kohli, P.S. Narasimha', case_number: 'Writ Petition (Civil) No. 1011 of 2022' },
  { name: 'Cox and Kings Ltd. v. SAP India Pvt. Ltd.', cite: '(2024) 4 SCC 1', date: '2023-12-06', bench: 'D.Y. Chandrachud (CJI), Hrishikesh Roy, P.S. Narasimha, J.B. Pardiwala, Manoj Misra', case_number: 'Arbitration Petition (Civil) No. 38 of 2020' },
  { name: 'N.N. Global Mercantile Pvt. Ltd. v. Indo Unique Flame Ltd.', cite: '(2024) 6 SCC 1', date: '2023-12-13', bench: 'D.Y. Chandrachud (CJI), Sanjiv Khanna, B.R. Gavai, Surya Kant, J.B. Pardiwala, Manoj Misra, Satish Chandra Sharma' },
  { name: 'Mineral Area Development Authority v. Steel Authority of India Ltd.', cite: '2024 INSC 544', date: '2024-07-25', bench: 'D.Y. Chandrachud (CJI), Hrishikesh Roy, Abhay S. Oka, B.V. Nagarathna, J.B. Pardiwala, Manoj Misra, Ujjal Bhuyan, Satish Chandra Sharma, Augustine George Masih' },
  { name: 'A.R. Antulay v. R.S. Nayak', cite: '(1988) 2 SCC 602', date: '1988-04-29', bench: 'Sabyasachi Mukharji, Ranganath Misra, G.L. Oza, B.C. Ray, K.N. Singh, S. Natarajan, M.N. Venkatachaliah' },
  { name: 'Mithu v. State of Punjab', cite: '(1983) 2 SCC 277', date: '1983-04-07', bench: 'Y.V. Chandrachud (CJI), S. Murtaza Fazal Ali, V.D. Tulzapurkar, O. Chinnappa Reddy, A. Varadarajan' },
  { name: 'Gian Kaur v. State of Punjab', cite: '(1996) 2 SCC 648', date: '1996-03-21', bench: 'J.S. Verma, G.N. Ray, N.P. Singh, Faizan Uddin, G.T. Nanavati' },
  { name: 'S.P. Gupta v. Union of India (First Judges Case)', cite: '1981 Supp SCC 87', date: '1981-12-30', bench: 'P.N. Bhagwati, A.C. Gupta, S. Murtaza Fazal Ali, V.D. Tulzapurkar, D.A. Desai, R.S. Pathak, E.S. Venkataramiah' }
];

// Authentic, verified, source-derived enrichment for Flagship Supreme Court & High Court Judgments
const ENRICHED_JUDGMENTS = [
  {
    case_name: 'Kesavananda Bharati Sripadagalvaru v. State of Kerala',
    case_number: 'Writ Petition (Civil) No. 135 of 1970',
    factual_summary: 'His Holiness Kesavananda Bharati Sripadagalvaru, head of the Edneer Mutt in Kasaragod district of Kerala, filed a writ petition under Article 32 challenging the Kerala Land Reforms (Amendment) Act, 1969 and the Kerala Land Reforms (Amendment) Act, 1971, under which the State sought to acquire land belonging to the religious mutt. During the pendency of the petition, Parliament enacted the 24th, 25th, and 29th Constitutional Amendment Acts to overcome the ruling in Golak Nath (1967) and immunize land reform statutes placed in the Ninth Schedule from judicial review under Part III. A 13-Judge Constitution Bench—the largest in the history of the Supreme Court of India—was constituted to hear the constitutional challenge.',
    petitioner_arguments: 'Lead counsel Nani Palkhivala contended that the power to "amend" the Constitution under Article 368 is a derivative, limited power and does not include the power to destroy or abrogate the essential features or basic framework of the Constitution. Relying on implied limitations inherent in a written constitution, the petitioners argued that Parliament, as a creature of the Constitution, cannot convert a democratic republic governed by the rule of law and fundamental rights into an authoritarian regime or strip citizens of core liberties under Part III.',
    respondent_arguments: 'The Union of India and the State of Kerala contended that the constituent power of Parliament under Article 368 is plenary, sovereign, and subject to no implied substantive limitations once the procedural requirements of Article 368 are satisfied. They argued that following the 24th Amendment, a constitutional amendment is not "law" within the meaning of Article 13(2), and Parliament must possess unrestricted flexibility to implement socio-economic directives under Part IV of the Constitution.',
    court_reasoning: 'By a 7:6 majority, the 13-Judge Bench overruled Golak Nath on the narrow question of whether Article 13(2) bars amendments to Part III, holding that the 24th Constitutional Amendment is valid and Parliament has wide power to amend any provision of the Constitution, including Fundamental Rights. Crucially, however, the majority (speaking through Chief Justice Sikri, Justice Shelat, Justice Grover, Justice Hegde, Justice Mukherjea, Justice Jaganmohan Reddy, and the pivotal concurring opinion of Justice H.R. Khanna) held that the expression "amendment" in Article 368 cannot be construed to empower Parliament to alter, emasculate, or destroy the "Basic Structure" or fundamental framework of the Constitution—such as supremacy of the Constitution, republican and democratic form of government, secular character, separation of powers, federal character, and judicial review.'
  },
  {
    case_name: 'Justice K.S. Puttaswamy (Retd.) v. Union of India',
    case_number: 'Writ Petition (Civil) No. 494 of 2012',
    factual_summary: 'Justice K.S. Puttaswamy, a retired Judge of the Karnataka High Court, filed a writ petition in 2012 challenging the constitutional validity of the Aadhaar biometric identification project, which collected iris scans and fingerprints without statutory backing at the time. During arguments on interim orders in 2015, the Attorney General for India contended that the Constitution of India does not guarantee a fundamental right to privacy, citing early larger-bench decisions in M.P. Sharma v. Satish Chandra (8-Judge Bench, 1954) and Kharak Singh v. State of U.P. (6-Judge Bench, 1962). The question of whether the right to privacy is a fundamental right was referred to a Nine-Judge Constitution Bench.',
    petitioner_arguments: 'Counsel for the petitioners argued that privacy is an inalienable natural right inhering in human dignity and autonomy, forming the bedrock of personal liberty under Article 21 and the freedoms under Article 19. They submitted that M.P. Sharma was decided solely in the context of search warrants under Article 20(3) and Kharak Singh relied on the discredited silo theory of A.K. Gopalan, which had long been overruled in R.C. Cooper (1970) and Maneka Gandhi (1978).',
    respondent_arguments: 'The Union of India argued that the framers of the Constitution consciously omitted a general right to privacy during Constituent Assembly debates, that privacy is an amorphous common-law concept unsuitable for elevation into an enforceable fundamental right, and that M.P. Sharma and Kharak Singh bindingly foreclosed any claim of a constitutional right to privacy under Part III.',
    court_reasoning: 'In six concurring opinions, the Nine-Judge Bench unanimously overruled M.P. Sharma to the extent it held that the Constitution does not protect privacy, and overruled Kharak Singh insofar as it declined to recognize privacy under Article 21. The Court reasoned that Fundamental Rights are not isolated silos (reaffirming Maneka Gandhi) and that dignity, bodily integrity, decisional autonomy, and informational self-determination are intrinsic to life and personal liberty under Article 21 and the freedoms under Part III. Any state intrusion into privacy must satisfy the three-fold test of (i) legality (existence of a valid law), (ii) legitimate state aim, and (iii) proportionality.'
  },
  {
    case_name: 'Maneka Gandhi v. Union of India',
    case_number: 'Writ Petition (Civil) No. 231 of 1977',
    factual_summary: 'The petitioner, journalist Maneka Gandhi, was issued a passport in June 1976 under the Passports Act, 1967. On 2 July 1977, the Regional Passport Officer, New Delhi ordered her to surrender her passport within seven days, stating that the Central Government had decided to impound it "in the public interest" under Section 10(3)(c) of the Passports Act. When the petitioner requested a statement of reasons, the Ministry of External Affairs declined to furnish reasons "in the interests of the general public" under Section 10(5). She invoked Article 32 challenging the impounding order as arbitrary and violative of Articles 14, 19(1)(a), 19(1)(g), and 21.',
    petitioner_arguments: 'The petitioner contended that the right to go abroad is part of "personal liberty" under Article 21 (as recognized in Satwant Singh Sawhney), that Section 10(3)(c) confers uncanalised and arbitrary power violating Article 14, that impounding her passport without prior notice or hearing violated the cardinal rule of natural justice (audi alteram partem), and that the order directly restricted her freedom of speech and profession abroad under Articles 19(1)(a) and 19(1)(g).',
    respondent_arguments: 'The Union of India argued that under A.K. Gopalan (1950), Article 21 requires only a "procedure established by enacted law" regardless of its fairness, that the rule of audi alteram partem must be excluded where immediate impounding is needed to prevent a person from leaving the country, and that the petitioner was likely to be required to give evidence before the Shah Commission of Inquiry.',
    court_reasoning: 'Delivering a watershed 7-Judge Constitution Bench ruling, Justice P.N. Bhagwati (with Beg CJI, Chandrachud, Krishna Iyer, Untwalia, and Fazal Ali JJ.) decisively buried the compartmentalized theory of A.K. Gopalan. The Court held that Articles 14, 19, and 21 are not mutually exclusive islands but weave together a "Golden Triangle" of constitutional protection. A "procedure established by law" depriving a person of personal liberty under Article 21 cannot be any arbitrary enacted procedure; it must be "right and just and fair, and not arbitrary, fanciful or oppressive," otherwise it would be no procedure at all and would fall foul of Article 14. While reading down Section 10(3)(c) to incorporate a post-decisional hearing in urgent cases, the Court recorded the Attorney General’s undertaking to grant the petitioner a full hearing.'
  },
  {
    case_name: 'Navtej Singh Johar v. Union of India',
    case_number: 'Writ Petition (Criminal) No. 76 of 2016',
    factual_summary: 'Five prominent LGBTQ+ citizens—dancer Navtej Singh Johar, journalist Sunil Mehra, chef Ritu Dalmia, hotelier Aman Nath, and businesswoman Ayesha Kapur—directly approached the Supreme Court under Article 32 seeking a declaration that Section 377 of the Indian Penal Code, 1860 is unconstitutional insofar as it criminalizes consensual sexual conduct between adults of the same sex in private. Earlier, a 2-Judge Bench in Suresh Kumar Koushal v. Naz Foundation (2014) had reversed the Delhi High Court’s 2009 Naz Foundation judgment on the ground that LGBTQ+ persons constituted a "minuscule fraction" of the population.',
    petitioner_arguments: 'The petitioners argued that sexual orientation is an innate, natural facet of human identity and that criminalizing consensual adult intimacy under Section 377 reduces LGBTQ+ citizens to "unapprehended felons," violating human dignity, bodily autonomy, and privacy under Article 21, non-discrimination on grounds of sex under Article 15, freedom of expression under Article 19(1)(a), and equality before the law under Article 14.',
    respondent_arguments: 'The Union of India left the constitutional validity of Section 377 (insofar as it applied to consensual adult conduct) to the wisdom of the Court, while intervenors opposing the petitions argued that Section 377 reflected societal morality, protected public health, and should only be modified by Parliament rather than judicial invalidation.',
    court_reasoning: 'The Five-Judge Constitution Bench unanimously overruled Suresh Kumar Koushal (2014) and read down Section 377 IPC to decriminalize all consensual sexual acts between adults in private. Applying the Puttaswamy privacy and dignity principles alongside the doctrine of manifest arbitrariness, the Court held that fundamental rights do not depend on majoritarian approval or numerical strength; constitutional morality must always prevail over social morality. Section 377 continues to remain in force only with respect to non-consensual sexual acts, acts involving minors, and bestiality.'
  },
  {
    case_name: 'D.K. Basu v. State of West Bengal',
    case_number: 'Writ Petition (Criminal) No. 592 of 1987',
    factual_summary: 'D.K. Basu, Executive Chairman of Legal Aid Services, West Bengal, addressed a letter dated 26 August 1986 to the Chief Justice of India drawing attention to news reports regarding repeated deaths in police lock-ups and custody, requesting that the letter be treated as a Writ Petition under public interest litigation and that binding norms be formulated to curb custodial torture and fabricated "encounters" or lock-up suicides.',
    petitioner_arguments: 'The petitioner and Amicus Curiae Dr. A.M. Singhvi submitted that custodial violence and lock-up deaths strike at the very root of the Rule of Law, that existing statutory provisions are routinely circumvented through unrecorded "informal detention" prior to formal arrest, and that transparent, verifiable procedural safeguards at the point of arrest are essential to enforce Articles 21 and 22(1).',
    respondent_arguments: 'Various State Governments filed affidavits asserting that departmental inquiries and criminal prosecutions were initiated whenever custodial deaths occurred, and contended that rigid procedural formalities might hamper crime investigation.',
    court_reasoning: 'Justice Dr. A.S. Anand (with Justice Kuldip Singh) held that custodial torture is a naked violation of human dignity and a calculated assault on civilization that cannot be justified by investigative expediency. The Court laid down 11 mandatory preventive requirements to be strictly followed in all cases of arrest or detention nationwide—including visible name tags for arresting officers, preparation of a Memo of Arrest attested by a family member or respectable local witness and countersigned by the arrestee, intimation to a friend or relative within 8–12 hours, inspection Memo recording pre-existing injuries, medical examination every 48 hours, and transmission of copies to the Area Magistrate. Furthermore, the Court held that public law monetary compensation under Articles 32 and 226 is an independent strict-liability remedy for established custodial violations.'
  },
  {
    case_name: 'Lalita Kumari v. Government of Uttar Pradesh',
    case_number: 'Writ Petition (Criminal) No. 68 of 2008',
    factual_summary: 'Lalita Kumari, a minor girl, was kidnapped in Uttar Pradesh in May 2008. Her father Bhola Kamat submitted a written complaint at the local police station, wait-listed without an FIR until the Superintendent of Police was approached, and even after registration of the FIR no steps were taken to trace the child or apprehend the accused. In view of conflicting two-judge and three-judge bench rulings on whether a police officer is bound to register an FIR immediately upon receiving information of a cognizable offence or may conduct a preliminary inquiry first, the matter was referred to a Five-Judge Constitution Bench.',
    petitioner_arguments: 'Counsel for the petitioner contended that the use of the word "shall" in Section 154(1) of the Code of Criminal Procedure, 1973 is mandatory in character, leaving no discretion to the officer-in-charge of a police station to refuse or defer registration of an FIR once the complaint discloses a cognizable offence.',
    respondent_arguments: 'Several State Governments argued that mandatory immediate registration of an FIR without any preliminary verification exposes citizens and public servants to frivolous, vindictive, or politically motivated complaints and arbitrary arrest, and urged that police officers should possess discretion to conduct an antecedent inquiry.',
    court_reasoning: 'Chief Justice P. Sathasivam, speaking for the unanimous Five-Judge Constitution Bench, held that legislative intent in Section 154(1) CrPC is unambiguous: registration of an FIR is mandatory if the information given to the police discloses the commission of a cognizable offence, and no preliminary inquiry is permissible in such a situation. The Court distinguished between the registration of an FIR and the power to arrest, emphasizing that compulsory registration of an FIR ensures transparency and judicial oversight without compelling immediate arrest under Section 41 CrPC. A preliminary inquiry (strictly time-bound not exceeding 7 days, later extended to 15 days/6 weeks for specified categories) is permissible only to ascertain whether the information reveals a cognizable offence in five narrow categories: (a) matrimonial/family disputes, (b) commercial offences, (c) medical negligence cases, (d) corruption inquiries, and (e) cases of abnormal, unexplained delay of over 3 months in reporting.'
  },
  {
    case_name: 'Arnesh Kumar v. State of Bihar',
    case_number: 'Criminal Appeal No. 1277 of 2014',
    factual_summary: 'The appellant husband was married to Respondent No. 2 in July 2007. Following matrimonial discord, the wife lodged an FIR alleging dowry demands under Section 498A of the Indian Penal Code and Section 4 of the Dowry Prohibition Act, 1961 (offences punishable with imprisonment up to three years and two years respectively). Apprehending automatic arrest by the police, the appellant applied for anticipatory bail, which was rejected by the Sessions Court and the Patna High Court, prompting his appeal to the Supreme Court.',
    petitioner_arguments: 'The appellant argued that he and his aged relatives faced mechanical and humiliating arrest on unverified allegations in a matrimonial dispute, despite the statutory amendments introduced in Section 41(1)(b) and Section 41A of the CrPC prohibiting routine arrest for offences punishable with imprisonment up to seven years.',
    respondent_arguments: 'The State of Bihar and the complainant opposed anticipatory bail on the ground that specific allegations of dowry demand and harassment had been levelled in the FIR requiring custodial interrogation.',
    court_reasoning: 'Granting bail and issuing nationwide binding directions, Justice Chandramauli Kumar Prasad held that arrest brings humiliation, curtails freedom, and casts permanent scars; police officers must not mechanically arrest an accused merely because an FIR is registered for an offence punishable with imprisonment up to seven years. Under Section 41(1)(b) CrPC, the police officer must record concrete reasons and materials satisfying the statutory checklist (necessity to prevent further offence, proper investigation, or preventing tampering with evidence), and where arrest is not required, must issue a Notice of Appearance under Section 41A within two weeks. Equally, Judicial Magistrates must not mechanically authorize remand without scrutinizing the police officer’s Section 41 checklist; failure by either police officers or Magistrates renders them liable to departmental action and proceedings for contempt of court.'
  },
  {
    case_name: 'Bachan Singh v. State of Punjab',
    case_number: 'Criminal Appeal No. 273 of 1979',
    factual_summary: 'Bachan Singh was convicted and sentenced to death under Section 302 of the Indian Penal Code by the Sessions Judge for the brutal murder of three young family members (Desa Singh, Durga Bai, and Veeran Bai) using an axe while they were asleep, after having previously served a life sentence for murdering his own wife. The Punjab and Haryana High Court confirmed the death sentence. In appeal before a Five-Judge Constitution Bench, he challenged the constitutional validity of the death penalty under Section 302 IPC and the sentencing procedure under Section 354(3) of the CrPC, 1973.',
    petitioner_arguments: 'The appellant argued that the irrevocable taking of human life by the State extinguishes all fundamental freedoms under Article 19(1), serves no penological purpose that life imprisonment cannot achieve, and that Section 302 IPCread with Section 354(3) CrPC vests unguided, standardless discretion in judges to choose between life and death in violation of Articles 14 and 21.',
    respondent_arguments: 'The State of Punjab and the Union of India submitted that the framers of the Constitution expressly recognized the existence of capital punishment in Article 21 ("deprived of his life... according to procedure established by law"), Article 72, and Article 134, and that Section 354(3) CrPC reverses the legislative policy by making life imprisonment the norm and death sentence an exception requiring "special reasons."',
    court_reasoning: 'By a 4:1 majority (Justice P.N. Bhagwati dissenting), the Five-Judge Constitution Bench upheld the constitutional validity of the death penalty under Section 302 IPC and Section 354(3) CrPC. Justice R.S. Sarkaria held that under the 1973 Code, life imprisonment is the rule and death sentence is the exception, and judges must weigh both aggravating circumstances (relating to the crime) and mitigating circumstances (relating to the criminal) in an individualized sentencing hearing under Section 235(2) CrPC. The Court laid down the foundational "Rarest of Rare" doctrine: a real and abiding concern for the dignity of human life postulates resistance to taking a life through law’s instrumentality, and that ought not to be done save in the rarest of rare cases when the alternative option is unquestionably foreclosed.'
  },
  {
    case_name: 'Shayara Bano v. Union of India',
    case_number: 'Writ Petition (Civil) No. 118 of 2016',
    factual_summary: 'Shayara Bano, married to Rizwan Ahmed for 15 years, was divorced by her husband in October 2015 through a talaqnama pronouncing "talaq, talaq, talaq" at one sitting in the presence of two witnesses (Talaq-e-Biddat or instant irrevocable triple talaq). She filed a writ petition under Article 32 seeking a declaration that the practice of Talaq-e-Biddat, polygamy, and nikah halala violated her fundamental rights under Articles 14, 15, 21, and 25 of the Constitution.',
    petitioner_arguments: 'The petitioner, supported by women’s rights organizations and the Union of India, argued that Talaq-e-Biddat is neither sanctioned by the Holy Quran nor an essential religious practice under Article 25, and that permitting a husband to unilaterally and capriciously sever a marriage without cause, arbitration, or reconciliation is manifestly arbitrary and gender-discriminatory under Articles 14 and 15.',
    respondent_arguments: 'The All India Muslim Personal Law Board (AIMPLB) and the respondent husband contended that although Talaq-e-Biddat is considered sinful in theology, it is recognized as valid in Hanafi sunni personal law, that uncodified Muslim Personal Law (Shariat) does not constitute "laws in force" under Article 13, and that reform of personal law falls exclusively within the legislative domain.',
    court_reasoning: 'By a 3:2 majority (Justices Rohinton F. Nariman, U.U. Lalit, and Kurian Joseph forming the majority; Chief Justice J.S. Khehar and Justice S. Abdul Nazeer dissenting), the Five-Judge Constitution Bench set aside the practice of Talaq-e-Biddat as void, illegal, and unconstitutional. Justices Nariman and Lalit held that the Muslim Personal Law (Shariat) Application Act, 1937 codified and recognized triple talaq as a statutory rule of decision subject to Part III, and struck down Section 2 of the 1937 Act to that extent as "manifestly arbitrary" under Article 14. Justice Kurian Joseph concurred in the result, holding that Talaq-e-Biddat is directly contrary to the Quranic mandate of reconciliation and therefore lacks legal sanctity even under Shariat.'
  },
  {
    case_name: 'Joseph Shine v. Union of India',
    case_number: 'Writ Petition (Criminal) No. 194 of 2017',
    factual_summary: 'Joseph Shine, a non-resident Indian hailing from Kerala, filed a public interest writ petition under Article 32 challenging the constitutional validity of Section 497 of the Indian Penal Code, 1860 (which criminalized adultery committed by a man with the wife of another man without the husband’s consent or connivance, while exempting the wife from prosecution as an abettor) along with Section 198(2) of the Code of Criminal Procedure, 1973 (which permitted only the husband of the woman to lodge a complaint). A Five-Judge Constitution Bench reconsidered the earlier verdicts in Yusuf Abdul Aziz (1954), Sowmithri Vishnu (1985), and V. Revathi (1988).',
    petitioner_arguments: 'The petitioner argued that Section 497 IPC was an archaic Victorian-era provision premised on the doctrine of coverture, treating a married woman as the chattel or property of her husband—evident from the statutory rule that no offence was committed if the husband "consented or connived" at the sexual intercourse, and that a wife had no corresponding right to prosecute an adulterous husband.',
    respondent_arguments: 'The Union of India opposed decriminalization, contending that the sanctity of the institution of marriage is a vital social interest and that diluting the penal deterrence of Section 497 IPC would weaken matrimonial stability and family bonds in Indian society.',
    court_reasoning: 'The Five-Judge Constitution Bench unanimously struck down Section 497 IPC and Section 198(2) CrPC as unconstitutional and overruled Yusuf Abdul Aziz, Sowmithri Vishnu, and V. Revathi. Writing separate concurring opinions, CJI Dipak Misra, Justice R.F. Nariman, Justice D.Y. Chandrachud, and Justice Indu Malhotra held that Section 497 is manifestly arbitrary under Article 14, perpetuates deeply entrenched patriarchal stereotypes offending non-discrimination under Article 15(1), and strips a woman of her sexual agency, autonomy, and dignity under Article 21. The Court further held that criminal law cannot be deployed to police private consensual matrimonial fidelity, though adultery legitimately continues to be a civil ground for dissolution of marriage.'
  },
  {
    case_name: 'Anvar P.V. v. P.K. Basheer',
    case_number: 'Civil Appeal No. 4226 of 2012',
    factual_summary: 'In the 2011 Kerala Legislative Assembly elections for the Eranad constituency, respondent P.K. Basheer was declared elected. The appellant, Anvar P.V., filed an election petition challenging the election on grounds of corrupt practices under Section 123(4) of the Representation of the People Act, 1951, relying heavily on compact discs (CDs) containing audio and video recordings of alleged defamatory election speeches transferred from mobile phones and computers, without producing any certificate under Section 65B(4) of the Indian Evidence Act, 1872.',
    petitioner_arguments: 'The appellant relied on the two-judge bench decision in State (NCT of Delhi) v. Navjot Sandhu (Parliament Attack Case, 2005) to contend that even in the absence of a certificate under Section 65B(4), secondary electronic evidence could still be proved under the general provisions of Sections 63 and 65 of the Indian Evidence Act through oral testimony.',
    respondent_arguments: 'The respondent argued that Section 65B, beginning with a non-obstante clause ("Notwithstanding anything contained in this Act"), was enacted as a self-contained special code governing electronic records, and failure to produce the mandatory certificate under Section 65B(4) rendered the copied CDs wholly inadmissible.',
    court_reasoning: 'A Three-Judge Bench speaking through Justice Kurian Joseph overruled Navjot Sandhu on this point and invoked the maxim generalia specialibus non derogant (a special law overrides a general law). The Court held that Sections 65A and 65B constitute a complete code for the admissibility of electronic evidence; Sections 63 and 65 have no application to secondary outputs of electronic records (such as CDs, VCDs, pen drives, or printouts). Unless the original electronic device itself is physically produced in court as primary evidence under Section 62, any secondary electronic record is inadmissible in evidence unless accompanied by a valid certificate strictly complying with Section 65B(4).'
  },
  {
    case_name: 'Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal',
    case_number: 'Civil Appeal Nos. 20825-20826 of 2017',
    factual_summary: 'In an election petition challenging the return of the appellant to the Maharashtra Legislative Assembly from the Jalna constituency on the ground that his nomination papers were filed after the statutory deadline of 3:00 PM, the Bombay High Court relied on video-camera recordings (VCDs) maintained by the Returning Officer and Election Commission. The officials produced the VCDs on judicial summons but failed to furnish a formal written certificate under Section 65B(4) of the Indian Evidence Act despite repeated requests. A Three-Judge Bench was convened to resolve the conflict between Anvar P.V. v. P.K. Basheer (2014) and a two-judge bench order in Shafhi Mohammad v. State of Himachal Pradesh (2018).',
    petitioner_arguments: 'The appellant argued that under Anvar P.V., the statutory mandate of Section 65B(4) is an absolute condition precedent to admissibility, and in the absence of a written Section 65B(4) certificate, the oral testimony of the Returning Officer could not cure the defect to invalidate an election.',
    respondent_arguments: 'The respondents argued, relying on Shafhi Mohammad (2018) and Tomaso Bruno (2015), that where a party is not in possession of the electronic device from which the document is produced—such as an election petitioner summoning records from a hostile or indifferent public authority—the requirement of a Section 65B(4) certificate should be relaxed as procedural.',
    court_reasoning: 'Justice Rohinton F. Nariman, writing for the Three-Judge Bench, reaffirmed Anvar P.V. and overruled Shafhi Mohammad and clarified Tomaso Bruno. The Court held that a certificate under Section 65B(4) is a mandatory condition precedent whenever secondary evidence of an electronic record is tendered. However, addressing the practical impossibility where a third party or public authority refuses to issue the certificate despite application, the Court held that the trial court has ample power under Section 165 of the Evidence Act, Order XVI of the CPC, and Section 91/311 of the CrPC to summon the person in control of the device and compel production of the Section 65B(4) certificate; once a party has done everything in its power to summon the certificate from an official department, the law does not compel the impossible (lex non cogit ad impossibilia).'
  },
  {
    case_name: 'Satender Kumar Antil v. Central Bureau of Investigation',
    case_number: 'Special Leave Petition (Criminal) No. 5191 of 2021',
    factual_summary: 'The Central Bureau of Investigation (CBI) investigated the petitioner and filed a charge-sheet before the Special Court without arresting him during the entire course of investigation, as he had cooperated pursuant to notices issued. However, upon taking cognizance, the trial court issued non-bailable warrants and insisted on his physical remand to custody as a pre-condition for entertaining his regular bail application. Taking cognizance of widespread non-compliance with arrest and bail safeguards across Indian trial courts and the resulting overcrowding of prisons with undertrials, the Supreme Court undertook a comprehensive classification of offences for bail jurisprudence.',
    petitioner_arguments: 'Counsel for the petitioner submitted that where an investigating agency consciously chooses not to arrest an accused during investigation and files a charge-sheet, compelling the accused to surrender into prison custody merely because cognizance has been taken under Section 170 CrPC turns the presumption of innocence on its head and violates Article 21.',
    respondent_arguments: 'The Additional Solicitor General appearing for the CBI assisted the Court in categorizing offences, submitting that while non-arrested accused in ordinary offences need not be remanded upon filing of the charge-sheet, stringent statutory twin conditions in special enactments (such as NDPS, PMLA, UAPA, and Companies Act) must continue to apply.',
    court_reasoning: 'A Two-Judge Bench of Justice Sanjay Kishan Kaul and Justice M.M. Sundresh reaffirmed the constitutional canon that "Bail is the rule and jail is the exception." Categorizing offences into four classes—Category A (offences punishable with 7 years or less not falling in B & D), Category B (other IPC/general offences punishable with death, life, or over 7 years), Category C (special Acts containing stringent twin bail conditions), and Category D (economic offences not covered by special Acts)—the Court held that under Section 170 CrPC, the word "custody" does not obligate the officer to arrest an accused at the time of filing the charge-sheet. For Category A offences, upon appearance pursuant to summons, bail applications must be decided without taking the accused into physical custody. The Court directed all High Courts and State Governments to strictly enforce Sections 41 and 41A CrPC, grant default bail under Section 167(2) CrPC without frustration, dispose of bail applications within two weeks (and anticipatory bail within six weeks), and recommended that the Union of India consider enacting a standalone "Bail Act."'
  },
  {
    case_name: 'Association for Democratic Reforms v. Union of India (Electoral Bonds Case)',
    case_number: 'Writ Petition (Civil) No. 880 of 2017',
    factual_summary: 'Through the Finance Act, 2017 and notification dated 2 January 2018, the Union Government introduced the Electoral Bond Scheme, 2018, creating bearer banking instruments issued by the State Bank of India (SBI) that allowed individuals and corporations to donate unlimited sums to political parties with total donor anonymity. Concurrently, amendments to Section 182 of the Companies Act, 2013 removed the earlier cap of 7.5% of net profits on corporate political donations and eliminated the requirement for companies to disclose the names of political parties to which contributions were made in their Profit and Loss accounts; Section 29C of the Representation of the People Act, 1951 exempted Electoral Bond receipts from disclosure to the Election Commission. Association for Democratic Reforms (ADR) and other petitioners challenged the scheme before a Five-Judge Constitution Bench.',
    petitioner_arguments: 'The petitioners contended that anonymous, unlimited corporate funding of political parties violates the voter’s fundamental right to information under Article 19(1)(a), creates an opaque channel for quid pro quo arrangements between wealthy corporations and the ruling political dispensation, and destroys the level playing field essential to free and fair elections.',
    respondent_arguments: 'The Union of India argued that the Electoral Bond Scheme was an economic and electoral policy measure designed to curb the circulation of unaccounted "black money" and cash in elections by routing contributions through formal banking channels, while donor confidentiality was necessary to protect contributors from political victimization or retribution by rival parties.',
    court_reasoning: 'The Five-Judge Constitution Bench unanimously struck down the Electoral Bond Scheme, 2018 and the accompanying amendments to the Representation of the People Act, the Companies Act, and the Income Tax Act as unconstitutional. Writing the lead opinion, Chief Justice D.Y. Chandrachud held that information about the funding of political parties is essential for the effective exercise of the franchise, as economic inequality leads to differing levels of political engagement and creates a legitimate apprehension of policy capture and quid pro quo; hence, the scheme infringed Article 19(1)(a). Applying the four-pronged proportionality standard, the Court held that curbing black money is not a ground traceable to Article 19(2), and even assuming a legitimate purpose, complete anonymity was not the least restrictive means since statutory channels like Electoral Trusts already permitted banked contributions without hiding donor identity from voters. Furthermore, permitting unlimited corporate donations by both profit-making and loss-making shell companies was struck down as manifestly arbitrary under Article 14. SBI was directed to immediately stop issuing Electoral Bonds and furnish complete details of all bonds purchased and redeemed since 2019 to the Election Commission of India for publication on its official website.'
  },
  {
    case_name: 'Vishaka v. State of Rajasthan',
    case_number: 'Writ Petition (Criminal) Nos. 666-670 of 1992',
    factual_summary: 'In 1992, Bhanwari Devi, a grassroots social worker (Saathin) employed under the Women’s Development Programme of the Government of Rajasthan, was brutally gang-raped in retaliation for her official efforts to prevent a child marriage in an influential family in village Bhateri. Faced with institutional apathy and the complete absence of domestic legislation addressing workplace sexual harassment, a coalition of women’s rights groups led by "Vishaka" filed a writ petition under Article 32 seeking the enforcement of the fundamental rights of working women under Articles 14, 15, 19(1)(g), and 21.',
    petitioner_arguments: 'The petitioners argued that sexual harassment at the workplace is a pervasive violation of gender equality, the right to practice a profession or occupation in a safe environment under Article 19(1)(g), and the right to life with dignity under Article 21, and urged the Court to invoke international conventions (specifically CEDAW, ratified by India in 1993) to fill the legislative vacuum.',
    respondent_arguments: 'The Solicitor General of India appearing for the Union of India and counsel for the State of Rajasthan supported the formulation of effective workplace norms and assisted the Court in drafting preventive and redressal mechanisms.',
    court_reasoning: 'Chief Justice J.S. Verma (with Justice Sujata V. Manohar and Justice B.N. Kirpal) held that each incident of sexual harassment of a woman at the workplace results in a direct violation of the Fundamental Rights of Gender Equality and the Right to Life and Liberty under Articles 14, 15, and 21, as well as the logical corollary under Article 19(1)(g) to a safe working environment. Relying on Articles 51(c) and 253, the Court held that in the absence of enacted domestic law occupying the field, international conventions and norms (including Articles 11 and 24 of CEDAW) consistent with the spirit of Part III must be read into Fundamental Rights to enlarge their meaning and content. Exercising power under Article 32 read with Article 141, the Court promulgated the historic 12-point "Vishaka Guidelines"—defining sexual harassment, imposing preventive duties on all public and private employers, and mandating the creation of a Complaints Committee headed by a woman with at least half female membership and an independent third-party NGO representative—which operated as binding law of the land until Parliament enacted the Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013.'
  },
  {
    case_name: 'Common Cause (A Regd. Society) v. Union of India',
    case_number: 'Writ Petition (Civil) No. 215 of 2005',
    factual_summary: 'Common Cause, a registered society, filed a public interest writ petition under Article 32 seeking a declaration that the fundamental right to life with dignity under Article 21 includes the "right to die with dignity" for terminally ill patients or persons in a persistent vegetative state (PVS) with no hope of recovery, and sought legal recognition for "Advance Medical Directives" (Living Wills) allowing adult persons of sound mind to refuse artificial life-prolonging treatment.',
    petitioner_arguments: 'The petitioner contended that forcing a terminally ill patient in irreversible agony or a persistent vegetative state to undergo invasive mechanical ventilation and artificial life support against their expressed wishes prolongs the process of dying rather than preserving meaningful life, violating bodily self-determination, privacy, and human dignity under Article 21.',
    respondent_arguments: 'The Union of India expressed concern that legalizing Advance Directives could be misused by unscrupulous relatives seeking inheritance or wishing to avoid medical expenses, and noted that medical science cannot always predict with certainty whether a patient’s condition is irreversible.',
    court_reasoning: 'A Five-Judge Constitution Bench (Chief Justice Dipak Misra, Justice A.K. Sikri, Justice A.M. Khanwilkar, Justice D.Y. Chandrachud, and Justice Ashok Bhushan) unanimously held that the right to live with human dignity under Article 21 encompasses the smoothing of the dying process and the right to die with dignity for a terminally ill patient or a person in a persistent vegetative state. Clarifying Gian Kaur v. State of Punjab (1996) and affirming Aruna Ramchandra Shanbaug (2011), the Court drew a fundamental constitutional distinction between active euthanasia (which entails an overt act to end life and remains unlawful) and passive euthanasia (withholding or withdrawing life-support treatment that merely prolongs biological death). The Court recognized the fundamental right of a competent adult to execute an Advance Medical Directive (Living Will) refusing medical treatment and laid down strict procedural safeguards involving Medical Boards to prevent abuse.'
  },
  {
    case_name: 'Indian Young Lawyers Association v. State of Kerala (Sabarimala Case)',
    case_number: 'Writ Petition (Civil) No. 373 of 2006',
    factual_summary: 'The Indian Young Lawyers Association and five women lawyers filed a writ petition under Article 32 challenging the validity of Rule 3(b) of the Kerala Hindu Places of Public Worship (Authorization of Entry) Rules, 1965 and the customary practice enforced by the Travancore Devaswom Board barring women between the ages of 10 and 50 years (menstruating age) from entering the Lord Ayyappa Temple at Sabarimala in Kerala.',
    petitioner_arguments: 'The petitioners argued that the blanket exclusion of women aged 10 to 50 years based solely on the biological physiological characteristic of menstruation is derogatory to the dignity of women, violates equality and non-discrimination under Articles 14 and 15(1), amounts to a form of untouchability prohibited under Article 17, and infringes Hindu women’s equal freedom of religion and worship under Article 25(1).',
    respondent_arguments: 'The Travancore Devaswom Board and the Tantri argued that the exclusion was not rooted in misogyny or impurity, but in the unique celibate (Naishtika Brahmachari) nature of the presiding deity at Sabarimala, and that devotees of Lord Ayyappa constitute a separate religious denomination protected under Article 26(b) in managing its own affairs in matters of religion.',
    court_reasoning: 'By a 4:1 majority (CJI Dipak Misra, Justice A.M. Khanwilkar, Justice R.F. Nariman, and Justice D.Y. Chandrachud in the majority; Justice Indu Malhotra dissenting), the Five-Judge Constitution Bench struck down Rule 3(b) of the 1965 Rules as ultra vires Section 3 of the parent Act and violative of Part III of the Constitution. The majority held that devotees of Lord Ayyappa are Hindus and do not satisfy the rigorous three-fold constitutional test to constitute a separate "religious denomination" under Article 26; that the right to worship under Article 25(1) is conferred equally upon "all persons" without gender discrimination; and that excluding women on the basis of biological menstruation is neither an essential religious practice of Hinduism nor compatible with constitutional morality and dignity under Articles 14, 15, and 21.'
  },
  {
    case_name: 'K.S. Puttaswamy (Aadhaar-5J) v. Union of India',
    case_number: 'Writ Petition (Civil) No. 494 of 2012',
    factual_summary: 'Following the Nine-Judge Bench ruling in Puttaswamy (2017) declaring privacy a fundamental right, a Five-Judge Constitution Bench heard 31 batched petitions challenging the constitutional validity of the Aadhaar (Targeted Delivery of Financial and Other Subsidies, Benefits and Services) Act, 2016, its passage as a Money Bill under Article 110, and various executive circulars mandating the linking of Aadhaar with welfare subsidies, PAN cards, income tax returns, bank accounts, mobile SIM cards, and school admissions.',
    petitioner_arguments: 'The petitioners argued that the Aadhaar project created a centralized biometric surveillance architecture violating informational privacy and bodily autonomy under Article 21, caused exclusion of marginalized citizens from food rations due to biometric authentication failures, was unconstitutionally passed as a Money Bill to bypass the Rajya Sabha, and enabled private corporate profiling under Section 57 of the Aadhaar Act.',
    respondent_arguments: 'The Union of India and UIDAI contended that the Aadhaar Act collected minimal demographic and biometric data in encrypted silos, prevented leakage and duplication in welfare delivery affecting hundreds of millions of beneficiaries (protecting their socio-economic right to food and dignity under Article 21), and had Section 7 (targeted subsidies funded from the Consolidated Fund of India) as its core heart, justifying certification as a Money Bill under Article 110.',
    court_reasoning: 'By a 4:1 majority (Justice A.K. Sikri writing for CJI Dipak Misra, Justice A.M. Khanwilkar, and himself; Justice Ashok Bhushan concurring; Justice D.Y. Chandrachud dissenting), the Five-Judge Bench upheld the core constitutional validity of the Aadhaar Act, 2016 while striking down or reading down specific overbroad provisions. Applying the Puttaswamy proportionality test, the majority held that mandatory Aadhaar authentication under Section 7 for government subsidies and welfare benefits drawn from the Consolidated Fund of India serves a compelling state interest of targeted socio-economic welfare, subject to strict direction that no deserving child or citizen shall be denied benefits due to biometric authentication failure. Section 139AA of the Income Tax Act (linking Aadhaar with PAN) was also upheld. However, the Court struck down Section 57 insofar as it permitted private corporations, telecom companies, and banks to demand Aadhaar authentication—thus invalidating mandatory linking of Aadhaar with bank accounts and mobile SIM cards—and struck down Section 33(2) (national security disclosure without judicial oversight) and Section 47 (bar on individual criminal complaints), while reducing metadata retention from 5 years to 6 months.'
  },
  {
    case_name: 'Sharad Birdhichand Sarda v. State of Maharashtra',
    case_number: 'Criminal Appeal No. 745 of 1983',
    factual_summary: 'Manju married the appellant, Sharad Birdhichand Sarda, a chemical engineer in Pune, in February 1982. Four months after the marriage, on the night of 11–12 June 1982, she was found dead in her matrimonial bedroom due to potassium cyanide poisoning. There was no eyewitness to the administration of poison. Based entirely on circumstantial evidence—including letters written by the deceased expressing marital unhappiness and the appellant’s opportunity and alleged motive—the Sessions Court convicted the appellant under Section 302 IPC and awarded the death sentence, which was confirmed by the Bombay High Court.',
    petitioner_arguments: 'The appellant argued that the prosecution failed to exclude the reasonable hypothesis of suicide, that Manju’s letters showed deep depression and emotional distress rather than any threat to her life by the husband, and that the High Court impermissibly used a false plea in the accused’s Section 313 CrPC examination to supply a missing link in the prosecution’s chain of circumstances.',
    respondent_arguments: 'The State of Maharashtra contended that the deceased was last seen alive in the company of the appellant in their bedroom, that potassium cyanide was accessible to the appellant as a chemical engineer, and that the cumulative chain of circumstances pointed to homicidal poisoning.',
    court_reasoning: 'Acquitting the appellant and reversing the courts below, a Three-Judge Bench speaking through Justice S. Murtaza Fazal Ali laid down the classic "Five Golden Principles" (the Panchsheel) of circumstantial evidence in Indian criminal law: (1) the circumstances from which the conclusion of guilt is to be drawn must be fully established ("must or should" and not "may be" established); (2) the facts so established should be consistent only with the hypothesis of the guilt of the accused; (3) the circumstances should be of a conclusive nature and tendency; (4) they should exclude every possible hypothesis except the one to be proved; and (5) there must be a chain of evidence so complete as not to leave any reasonable ground for a conclusion consistent with the innocence of the accused. Where two views are reasonably possible on the evidence—one pointing to homicide and the other to suicide—the view favourable to the accused must be adopted.'
  },
  {
    case_name: 'State of Haryana v. Bhajan Lal',
    case_number: 'Civil Appeal No. 5412 of 1990',
    factual_summary: 'Following the 1987 Haryana Legislative Assembly elections, Dharam Pal presented a complaint against former Chief Minister Bhajan Lal alleging accumulation of disproportionate assets under Section 5(1)(e) of the Prevention of Corruption Act, 1947 and Sections 161 and 165 of the IPC. The Officer on Special Duty in the new Chief Minister’s Secretariat forwarded the complaint to the Superintendent of Police with an endorsement to register a case and investigate immediately, and the SHO registered an FIR. Before the investigation could proceed, the Punjab and Haryana High Court quashed the entire FIR and criminal proceedings in writ jurisdiction under Article 226 on the ground that the allegations were politically motivated.',
    petitioner_arguments: 'The State of Haryana contended that the High Court erred in quashing the FIR at the threshold stage before any evidence was collected, as the complaint disclosed cognizable offences of corruption and the police possessed an unfettered statutory right under Sections 154 and 156(1) CrPC to investigate.',
    respondent_arguments: 'Respondent Bhajan Lal contended that the complaint was actuated by intense political vendetta by his political rival Devi Lal, and further argued that under the first proviso to Section 5A(1) of the Prevention of Corruption Act, 1947, an Inspector of Police had no statutory authority to investigate the offence without a specific reasoned order of a Magistrate of the First Class.',
    court_reasoning: 'A Two-Judge Bench of Justice S. Ratnavel Pandian and Justice K. Jayachandra Reddy set aside the High Court’s blanket quashing of the FIR while quashing the investigation conducted by the unauthorized Inspector for non-compliance with Section 5A(1). In a landmark exposition of Section 482 CrPC and Article 226, the Court formulated seven illustrative categories of cases where the extraordinary power to quash an FIR or complaint may be exercised: (1) where the allegations in the FIR, even if taken at face value and accepted in their entirety, do not prima facie constitute any offence; (2) where the allegations do not disclose a cognizable offence justifying police investigation under Section 156(1); (3) where uncontroverted allegations and evidence do not disclose the commission of any offence; (4) where the FIR relates only to a non-cognizable offence without a Magistrate’s order under Section 155(2); (5) where the allegations are so absurd and inherently improbable that no prudent person can ever reach a just conclusion that there is sufficient ground for proceeding; (6) where there is an express legal bar engrafted in the Code or the concerned Act; and (7) where a criminal proceeding is manifestly attended with mala fide or maliciously instituted with an ulterior motive for wreaking vengeance.'
  },
  {
    case_name: 'Naz Foundation v. Government of NCT of Delhi',
    case_number: 'Writ Petition (Civil) No. 7455 of 2001',
    factual_summary: 'Naz Foundation (India) Trust, a non-governmental organization working in the field of HIV/AIDS intervention and sexual health, filed a public interest writ petition before the High Court of Delhi challenging the constitutional validity of Section 377 of the Indian Penal Code, 1860 to the extent it penalized consensual sexual acts between adults in private, demonstrating through field data that fear of police harassment and extortion under Section 377 drove vulnerable communities underground and obstructed public health HIV prevention programmes.',
    petitioner_arguments: 'The petitioner contended that Section 377 IPC was based on obsolete Judeo-Christian moral conceptions rather than any legitimate constitutional interest, violated the right to dignity, privacy, and health under Article 21, and discriminated on the ground of sexual orientation prohibited within the sweep of "sex" under Article 15(1).',
    respondent_arguments: 'While the Ministry of Home Affairs argued that deleting Section 377 would open the floodgates to delinquent behaviour and offend public morality, the National AIDS Control Organization (NACO) under the Ministry of Health and Family Welfare filed an affidavit supporting the petitioner’s submission that criminalization under Section 377 severely impeded HIV/AIDS prevention outreach.',
    court_reasoning: 'A Division Bench of Chief Justice Ajit Prakash Shah and Justice S. Muralidhar delivered a pathbreaking human rights judgment reading down Section 377 IPC to declare that insofar as it criminalizes consensual sexual acts of adults in private, it violates Articles 21, 14, and 15 of the Constitution. Drawing on Dr. B.R. Ambedkar’s concept of "Constitutional Morality" from the Constituent Assembly Debates, the Delhi High Court held that popular or majoritarian moral disapproval can never furnish a compelling state interest to curtail fundamental rights of a minority, and that inclusiveness is an foundational value of the Indian Constitution.'
  }
];

// 11 Verified Official Supreme Court PDFs in uploads/legal_judgments/
const VERIFIED_PDF_DOCUMENTS = [
  {
    case_name: 'Justice K.S. Puttaswamy (Retd.) v. Union of India',
    original_filename: 'SC_2017_Puttaswamy_Privacy_9J_WP_C_494_2012.pdf',
    source_url: 'https://api.sci.gov.in/supremecourt/2012/35071/35071_2012_Judgement_24-Aug-2017.pdf',
    source_name: 'Supreme Court of India Official Judgment Repository (sci.gov.in)'
  },
  {
    case_name: 'Maneka Gandhi v. Union of India',
    original_filename: 'SC_1978_Maneka_Gandhi_v_Union_of_India_JUDIS_5154.pdf',
    source_url: 'https://api.sci.gov.in/jonew/judis/5154.pdf',
    source_name: 'Supreme Court of India Official JUDIS Archive (sci.gov.in)'
  },
  {
    case_name: 'Navtej Singh Johar v. Union of India',
    original_filename: 'SC_2018_Navtej_Singh_Johar_v_Union_of_India_WP_Crl_76_2016.pdf',
    source_url: 'https://api.sci.gov.in/supremecourt/2016/14961/14961_2016_Judgement_06-Sep-2018.pdf',
    source_name: 'Supreme Court of India Official Judgment Repository (sci.gov.in)'
  },
  {
    case_name: 'Lalita Kumari v. Government of Uttar Pradesh',
    original_filename: 'SC_2013_Lalita_Kumari_v_Govt_of_UP_JUDIS_40960.pdf',
    source_url: 'https://api.sci.gov.in/jonew/judis/40960.pdf',
    source_name: 'Supreme Court of India Official JUDIS Archive (sci.gov.in)'
  },
  {
    case_name: 'Arnesh Kumar v. State of Bihar',
    original_filename: 'SC_2014_Arnesh_Kumar_v_State_of_Bihar_JUDIS_41736.pdf',
    source_url: 'https://api.sci.gov.in/jonew/judis/41736.pdf',
    source_name: 'Supreme Court of India Official JUDIS Archive (sci.gov.in)'
  },
  {
    case_name: 'Joseph Shine v. Union of India',
    original_filename: 'SC_2018_Joseph_Shine_v_Union_of_India_WP_Crl_194_2017.pdf',
    source_url: 'https://api.sci.gov.in/supremecourt/2017/32550/32550_2017_Judgement_27-Sep-2018.pdf',
    source_name: 'Supreme Court of India Official Judgment Repository (sci.gov.in)'
  },
  {
    case_name: 'Satender Kumar Antil v. Central Bureau of Investigation',
    original_filename: 'SC_2022_Satender_Kumar_Antil_v_CBI_SLP_Crl_5191_2021.pdf',
    source_url: 'https://api.sci.gov.in/supremecourt/2021/15122/15122_2021_2_1501_36552_Judgement_11-Jul-2022.pdf',
    source_name: 'Supreme Court of India Official Judgment Repository (sci.gov.in)'
  },
  {
    case_name: 'Association for Democratic Reforms v. Union of India (Electoral Bonds Case)',
    original_filename: 'SC_2024_ADR_Electoral_Bonds_Case_WP_C_880_2017.pdf',
    source_url: 'https://api.sci.gov.in/supremecourt/2017/27935/27935_2017_1_1501_50573_Judgement_15-Feb-2024.pdf',
    source_name: 'Supreme Court of India Official Judgment Repository (sci.gov.in)'
  },
  {
    case_name: 'Common Cause (A Regd. Society) v. Union of India',
    original_filename: 'SC_2018_Common_Cause_v_Union_of_India_WP_C_215_2005.pdf',
    source_url: 'https://api.sci.gov.in/supremecourt/2005/9123/9123_2005_Judgement_09-Mar-2018.pdf',
    source_name: 'Supreme Court of India Official Judgment Repository (sci.gov.in)'
  },
  {
    case_name: 'Indian Young Lawyers Association v. State of Kerala (Sabarimala Case)',
    original_filename: 'SC_2018_Indian_Young_Lawyers_Sabarimala_WP_C_373_2006.pdf',
    source_url: 'https://api.sci.gov.in/supremecourt/2006/18938/18938_2006_Judgement_28-Sep-2018.pdf',
    source_name: 'Supreme Court of India Official Judgment Repository (sci.gov.in)'
  },
  {
    case_name: 'K.S. Puttaswamy (Aadhaar-5J) v. Union of India',
    original_filename: 'SC_2018_Puttaswamy_Aadhaar_5J_WP_C_494_2012.pdf',
    source_url: 'https://api.sci.gov.in/supremecourt/2012/35071/35071_2012_Judgement_26-Sep-2018.pdf',
    source_name: 'Supreme Court of India Official Judgment Repository (sci.gov.in)'
  }
];

async function runMigration() {
  const conn = await db.getConnection();
  console.log('\n=============================================================');
  console.log('  JIS PUBLIC LEGAL REPOSITORY OVERHAUL — MIGRATION & ENRICHMENT');
  console.log('=============================================================\n');

  try {
    // 1. Add columns to legal_judgments if missing
    console.log('  [1/6] Ensuring argument & reasoning columns exist on legal_judgments...');
    const [cols] = await conn.query('SHOW COLUMNS FROM legal_judgments');
    const colNames = new Set(cols.map(c => c.Field));

    if (!colNames.has('petitioner_arguments')) {
      await conn.query('ALTER TABLE legal_judgments ADD COLUMN petitioner_arguments TEXT DEFAULT NULL AFTER factual_summary');
      console.log('    ✓ Added petitioner_arguments');
    }
    if (!colNames.has('respondent_arguments')) {
      await conn.query('ALTER TABLE legal_judgments ADD COLUMN respondent_arguments TEXT DEFAULT NULL AFTER petitioner_arguments');
      console.log('    ✓ Added respondent_arguments');
    }
    if (!colNames.has('court_reasoning')) {
      await conn.query('ALTER TABLE legal_judgments ADD COLUMN court_reasoning TEXT DEFAULT NULL AFTER respondent_arguments');
      console.log('    ✓ Added court_reasoning');
    }
    await conn.query('ALTER TABLE legal_judgments MODIFY COLUMN bench_judges TEXT DEFAULT NULL');

    // 2. Create judgment_documents table matching schema.sql
    console.log('  [2/6] Ensuring judgment_documents table exists...');
    await conn.query('DROP TABLE IF EXISTS judgment_documents');
    await conn.query(`
      CREATE TABLE judgment_documents (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        judgment_id         INT NOT NULL,
        document_type       ENUM('FULL_JUDGMENT_PDF', 'OFFICIAL_ORDER_PDF', 'REPORTABLE_JUDGMENT_PDF') NOT NULL DEFAULT 'FULL_JUDGMENT_PDF',
        original_filename   VARCHAR(255) NOT NULL,
        storage_path        VARCHAR(500) NOT NULL,
        source_url          VARCHAR(500) NOT NULL,
        source_name         VARCHAR(150) NOT NULL,
        file_size_bytes     INT UNSIGNED DEFAULT NULL,
        uploaded_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum            VARCHAR(64) NOT NULL,
        is_verified         TINYINT(1) NOT NULL DEFAULT 1,
        FOREIGN KEY (judgment_id) REFERENCES legal_judgments(id) ON DELETE CASCADE,
        UNIQUE KEY uq_judg_doc_type (judgment_id, document_type),
        INDEX idx_jd_judgment (judgment_id),
        INDEX idx_jd_verified (is_verified)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('    ✓ judgment_documents table ready.');

    // 3. Clean up boilerplate factual_summary, synthetic case numbers, generic bench names, and broken URLs on REAL_VERIFIED judgments
    console.log('  [3/6] Cleaning boilerplate placeholders on REAL_VERIFIED records...');
    await conn.beginTransaction();

    // Clear boilerplate factual summaries on REAL_VERIFIED judgments so only real facts are ever shown
    await conn.query(`
      UPDATE legal_judgments
      SET factual_summary = NULL
      WHERE is_synthetic = 0
        AND (
          factual_summary LIKE 'Authoritative constitutional/statutory adjudication%'
          OR factual_summary LIKE 'Landmark appeal before the Supreme Court%'
          OR factual_summary LIKE 'Authoritative High Court adjudication%'
        )
    `);

    // Clear auto-generated placeholder case numbers on REAL_VERIFIED judgments
    await conn.query(`
      UPDATE legal_judgments
      SET case_number = NULL
      WHERE is_synthetic = 0
        AND (
          case_number LIKE 'Supreme Court Civil/Criminal Appeal / WP%'
          OR case_number LIKE 'Writ Petition / Civil Appeal / Crl.A. No.%'
          OR case_number LIKE 'Writ Petition / Criminal Appeal No.%'
        )
    `);

    // Clear generic bench string on REAL_VERIFIED judgments
    await conn.query(`
      UPDATE legal_judgments
      SET bench_judges = NULL
      WHERE is_synthetic = 0
        AND bench_judges = 'Bench of the Supreme Court of India'
    `);

    // Clean up generic prefix on legal_issue and key_holding for scAdditionalList records
    await conn.query(`
      UPDATE legal_judgments
      SET key_holding = TRIM(SUBSTRING(key_holding, LENGTH('The Supreme Court settled the legal controversy holding that: ') + 1))
      WHERE is_synthetic = 0
        AND key_holding LIKE 'The Supreme Court settled the legal controversy holding that: %'
    `);

    // Fix broken URL on Resham v. State of Karnataka (Hijab Case) and other High Court/SC records
    await conn.query(`
      UPDATE legal_judgments
      SET source_url = 'https://judiciary.karnataka.gov.in/',
          full_judgment_url = NULL
      WHERE is_synthetic = 0 AND case_name LIKE 'Resham v. State of Karnataka%'
    `);

    await conn.query(`
      UPDATE legal_judgments
      SET full_judgment_url = NULL
      WHERE is_synthetic = 0
        AND full_judgment_url LIKE 'https://main.sci.gov.in/judgment/judis/%'
    `);

    // 4. Fix judgment_date, neutral_citation, bench_judges, and case_number on the 40 scAdditionalList REAL_VERIFIED records
    console.log('  [4/6] Restoring exact judgment dates and benches on SC verified records...');
    for (const item of SC_ADDITIONAL_DATE_FIXES) {
      const year = item.date.substring(0, 4);
      await conn.query(
        `UPDATE legal_judgments
         SET judgment_date = ?,
             neutral_citation = CASE
               WHEN neutral_citation LIKE '% INSC %' AND LEFT(neutral_citation, 4) != ? THEN CONCAT(?, ' INSC')
               ELSE neutral_citation
             END,
             bench_judges = COALESCE(?, bench_judges),
             case_number = COALESCE(?, case_number)
         WHERE is_synthetic = 0 AND case_name = ?`,
        [item.date, year, year, item.bench || null, item.case_number || null, item.name]
      );
    }

    // 5. Enrich flagship REAL_VERIFIED judgments with authentic facts, arguments, and court reasoning
    console.log('  [5/6] Enriching flagship judgments with verified facts, arguments & reasoning...');
    let enrichedCount = 0;
    for (const item of ENRICHED_JUDGMENTS) {
      const [res] = await conn.query(
        `UPDATE legal_judgments
         SET case_number = COALESCE(?, case_number),
             factual_summary = ?,
             petitioner_arguments = ?,
             respondent_arguments = ?,
             court_reasoning = ?
         WHERE is_synthetic = 0 AND case_name = ?`,
        [
          item.case_number || null,
          item.factual_summary,
          item.petitioner_arguments,
          item.respondent_arguments,
          item.court_reasoning,
          item.case_name
        ]
      );
      if (res.affectedRows > 0) enrichedCount++;
    }
    console.log(`    ✓ Enriched ${enrichedCount} flagship judgments with verified arguments & reasoning.`);

    // 6. Populate judgment_documents with the 11 verified Supreme Court PDFs
    console.log('  [6/6] Linking verified official Supreme Court PDFs in judgment_documents...');
    await conn.query('DELETE FROM judgment_documents');

    let pdfLinkedCount = 0;
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'legal_judgments');

    for (const doc of VERIFIED_PDF_DOCUMENTS) {
      const filePath = path.join(uploadsDir, doc.original_filename);
      if (!fs.existsSync(filePath)) {
        console.warn(`    ! Missing PDF file on disk: ${filePath}`);
        continue;
      }
      const fileBuf = fs.readFileSync(filePath);
      const checksum = crypto.createHash('sha256').update(fileBuf).digest('hex');
      const fileSize = fileBuf.length;
      const relativeStoragePath = path.posix.join('uploads', 'legal_judgments', doc.original_filename);

      const [[judgmentRow]] = await conn.query(
        'SELECT id FROM legal_judgments WHERE is_synthetic = 0 AND case_name = ? LIMIT 1',
        [doc.case_name]
      );

      if (!judgmentRow) {
        console.warn(`    ! Could not find judgment in DB for: ${doc.case_name}`);
        continue;
      }

      await conn.query(
        `INSERT INTO judgment_documents
         (judgment_id, document_type, original_filename, storage_path, source_url, source_name, file_size_bytes, checksum, is_verified)
         VALUES (?, 'FULL_JUDGMENT_PDF', ?, ?, ?, ?, ?, ?, 1)`,
        [
          judgmentRow.id,
          doc.original_filename,
          relativeStoragePath,
          doc.source_url,
          doc.source_name,
          fileSize,
          checksum
        ]
      );

      // Also update source_url and full_judgment_url on legal_judgments to point to the verified official source
      await conn.query(
        `UPDATE legal_judgments
         SET source_url = ?,
             full_judgment_url = ?
         WHERE id = ?`,
        [doc.source_url, `/legal/judgments/${judgmentRow.id}/pdf`, judgmentRow.id]
      );

      pdfLinkedCount++;
    }

    await conn.commit();
    console.log(`    ✓ Linked ${pdfLinkedCount} verified official Supreme Court PDFs.`);

    // Summary check
    const [[counts]] = await conn.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN is_synthetic = 0 AND record_provenance = 'REAL_VERIFIED' THEN 1 ELSE 0 END) AS real_verified,
        SUM(CASE WHEN is_synthetic = 0 AND record_provenance = 'REAL_VERIFIED' AND court_tier = 'Supreme Court of India' THEN 1 ELSE 0 END) AS sc_verified,
        SUM(CASE WHEN is_synthetic = 0 AND record_provenance = 'REAL_VERIFIED' AND court_tier = 'High Court' THEN 1 ELSE 0 END) AS hc_verified,
        SUM(CASE WHEN is_synthetic = 0 AND court_reasoning IS NOT NULL THEN 1 ELSE 0 END) AS enriched_reasoning
      FROM legal_judgments
    `);
    const [[docCount]] = await conn.query('SELECT COUNT(*) AS cnt FROM judgment_documents WHERE is_verified = 1');

    console.log('\n-------------------------------------------------------------');
    console.log(`  Total Judgments in DB       : ${counts.total}`);
    console.log(`  Public REAL_VERIFIED        : ${counts.real_verified} (SC: ${counts.sc_verified}, HC: ${counts.hc_verified})`);
    console.log(`  Enriched Full Case Analysis : ${counts.enriched_reasoning}`);
    console.log(`  Verified Judgment PDFs      : ${docCount.cnt}`);
    console.log('=============================================================\n');
  } catch (err) {
    await conn.rollback();
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

runMigration();
