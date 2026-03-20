// ─── CDISC Public ADaM Sample Data (CDISC Pilot Study) ───────────────────────
export const SAMPLE_ADAM_DATASETS = {
  ADSL: {
    label: "Subject-Level Analysis Dataset",
    vars: ["USUBJID","STUDYID","SITEID","AGE","AGEGR1","SEX","RACE","ETHNIC","ARM","ARMCD","ACTARM","SAFFL","EFFFL","TRTDUR"],
    data: [
      {USUBJID:"01-701-1015",AGE:63,AGEGR1:">=65",SEX:"F",RACE:"WHITE",ARM:"Placebo",ARMCD:"PLACEBO",SAFFL:"Y",EFFFL:"Y",TRTDUR:26},
      {USUBJID:"01-701-1023",AGE:64,AGEGR1:"<65",SEX:"M",RACE:"WHITE",ARM:"Placebo",ARMCD:"PLACEBO",SAFFL:"Y",EFFFL:"Y",TRTDUR:26},
      {USUBJID:"01-701-1028",AGE:71,AGEGR1:">=65",SEX:"M",RACE:"WHITE",ARM:"Xanomeline Low Dose",ARMCD:"54mg",SAFFL:"Y",EFFFL:"N",TRTDUR:24},
      {USUBJID:"01-701-1033",AGE:74,AGEGR1:">=65",SEX:"F",RACE:"WHITE",ARM:"Xanomeline High Dose",ARMCD:"81mg",SAFFL:"Y",EFFFL:"Y",TRTDUR:26},
      {USUBJID:"01-701-1034",AGE:77,AGEGR1:">=65",SEX:"F",RACE:"WHITE",ARM:"Xanomeline Low Dose",ARMCD:"54mg",SAFFL:"Y",EFFFL:"Y",TRTDUR:12},
      {USUBJID:"01-701-1047",AGE:85,AGEGR1:">=65",SEX:"F",RACE:"WHITE",ARM:"Placebo",ARMCD:"PLACEBO",SAFFL:"Y",EFFFL:"Y",TRTDUR:26},
      {USUBJID:"01-701-1097",AGE:52,AGEGR1:"<65",SEX:"M",RACE:"WHITE",ARM:"Xanomeline High Dose",ARMCD:"81mg",SAFFL:"Y",EFFFL:"Y",TRTDUR:26},
      {USUBJID:"01-701-1115",AGE:81,AGEGR1:">=65",SEX:"M",RACE:"BLACK OR AFRICAN AMERICAN",ARM:"Xanomeline Low Dose",ARMCD:"54mg",SAFFL:"Y",EFFFL:"Y",TRTDUR:26},
      {USUBJID:"01-701-1118",AGE:68,AGEGR1:">=65",SEX:"F",RACE:"WHITE",ARM:"Placebo",ARMCD:"PLACEBO",SAFFL:"Y",EFFFL:"Y",TRTDUR:26},
      {USUBJID:"01-701-1130",AGE:75,AGEGR1:">=65",SEX:"M",RACE:"WHITE",ARM:"Xanomeline High Dose",ARMCD:"81mg",SAFFL:"Y",EFFFL:"N",TRTDUR:2},
    ]
  },
  ADAE: {
    label: "Adverse Events Analysis Dataset",
    vars: ["USUBJID","AEDECOD","AEBODSYS","AESEV","AESER","AEREL","AESTDTC","TRTEMFL","SAFFL"],
    data: [
      {USUBJID:"01-701-1015",AEDECOD:"DIARRHOEA",AEBODSYS:"GASTROINTESTINAL DISORDERS",AESEV:"MILD",AESER:"N",AEREL:"POSSIBLE",TRTEMFL:"Y",SAFFL:"Y"},
      {USUBJID:"01-701-1023",AEDECOD:"HEADACHE",AEBODSYS:"NERVOUS SYSTEM DISORDERS",AESEV:"MILD",AESER:"N",AEREL:"UNLIKELY",TRTEMFL:"Y",SAFFL:"Y"},
      {USUBJID:"01-701-1028",AEDECOD:"APPLICATION SITE PRURITUS",AEBODSYS:"GENERAL DISORDERS",AESEV:"MODERATE",AESER:"N",AEREL:"PROBABLE",TRTEMFL:"Y",SAFFL:"Y"},
      {USUBJID:"01-701-1033",AEDECOD:"NAUSEA",AEBODSYS:"GASTROINTESTINAL DISORDERS",AESEV:"MILD",AESER:"N",AEREL:"POSSIBLE",TRTEMFL:"Y",SAFFL:"Y"},
      {USUBJID:"01-701-1033",AEDECOD:"VOMITING",AEBODSYS:"GASTROINTESTINAL DISORDERS",AESEV:"MODERATE",AESER:"N",AEREL:"PROBABLE",TRTEMFL:"Y",SAFFL:"Y"},
      {USUBJID:"01-701-1034",AEDECOD:"AGITATION",AEBODSYS:"PSYCHIATRIC DISORDERS",AESEV:"SEVERE",AESER:"Y",AEREL:"POSSIBLE",TRTEMFL:"Y",SAFFL:"Y"},
      {USUBJID:"01-701-1097",AEDECOD:"APPLICATION SITE ERYTHEMA",AEBODSYS:"GENERAL DISORDERS",AESEV:"MILD",AESER:"N",AEREL:"PROBABLE",TRTEMFL:"Y",SAFFL:"Y"},
      {USUBJID:"01-701-1115",AEDECOD:"DIARRHOEA",AEBODSYS:"GASTROINTESTINAL DISORDERS",AESEV:"MODERATE",AESER:"N",AEREL:"POSSIBLE",TRTEMFL:"Y",SAFFL:"Y"},
    ]
  },
  ADLB: {
    label: "Laboratory Analysis Dataset",
    vars: ["USUBJID","PARAMCD","PARAM","AVISIT","AVAL","BASE","CHG","PCHG","ANL01FL","SAFFL"],
    data: [
      {USUBJID:"01-701-1015",PARAMCD:"ALT",PARAM:"Alanine Aminotransferase (U/L)",AVISIT:"Week 8",AVAL:22,BASE:18,CHG:4,PCHG:22.2,ANL01FL:"Y"},
      {USUBJID:"01-701-1023",PARAMCD:"ALT",PARAM:"Alanine Aminotransferase (U/L)",AVISIT:"Week 8",AVAL:31,BASE:28,CHG:3,PCHG:10.7,ANL01FL:"Y"},
      {USUBJID:"01-701-1028",PARAMCD:"SODIUM",PARAM:"Sodium (mEq/L)",AVISIT:"Week 8",AVAL:139,BASE:141,CHG:-2,PCHG:-1.4,ANL01FL:"Y"},
      {USUBJID:"01-701-1033",PARAMCD:"WBC",PARAM:"White Blood Cell Count (10^9/L)",AVISIT:"Week 8",AVAL:7.2,BASE:6.8,CHG:0.4,PCHG:5.9,ANL01FL:"Y"},
      {USUBJID:"01-701-1097",PARAMCD:"ALT",PARAM:"Alanine Aminotransferase (U/L)",AVISIT:"Week 8",AVAL:44,BASE:35,CHG:9,PCHG:25.7,ANL01FL:"Y"},
    ]
  }
};

// ─── Pre-defined TLF Table Shells ─────────────────────────────────────────────
export const SAMPLE_TABLE_SHELLS = [
  {
    id: "T-14.1.1",
    title: "Summary of Demographic and Baseline Characteristics",
    type: "table",
    population: "Safety Population (SAFFL='Y')",
    datasets: ["ADSL"],
    shell: `TABLE T-14.1.1
Title: Summary of Demographic and Baseline Characteristics
Population: Safety Analysis Set (SAFFL='Y')

                          Placebo        Xanomeline      Xanomeline
                          (N=xx)         Low Dose        High Dose
                                         (N=xx)          (N=xx)
Age (Years)
  n / Mean (SD)         xx / xx.x (x.x) xx / xx.x (x.x) xx / xx.x (x.x)
  Median / Min, Max     xx.x / xx, xx   xx.x / xx, xx   xx.x / xx, xx
Age Group, n (%)
  <65                    xx (xx.x%)      xx (xx.x%)      xx (xx.x%)
  >=65                   xx (xx.x%)      xx (xx.x%)      xx (xx.x%)
Sex, n (%)
  Male                   xx (xx.x%)      xx (xx.x%)      xx (xx.x%)
  Female                 xx (xx.x%)      xx (xx.x%)      xx (xx.x%)
Race, n (%)
  White                  xx (xx.x%)      xx (xx.x%)      xx (xx.x%)
  Black or African Amer  xx (xx.x%)      xx (xx.x%)      xx (xx.x%)`,
    adamSpec: `ADSL: USUBJID, SAFFL (filter Y), ARM (columns), AGE (continuous), AGEGR1 (<65/>=65), SEX (M/F), RACE (categorical)`
  },
  {
    id: "T-14.3.1",
    title: "Summary of Treatment-Emergent Adverse Events",
    type: "table",
    population: "Safety Population (SAFFL='Y', TRTEMFL='Y')",
    datasets: ["ADSL","ADAE"],
    shell: `TABLE T-14.3.1
Title: Summary of Treatment-Emergent Adverse Events
Population: Safety Analysis Set

                              Placebo      Xanomeline    Xanomeline
                              (N=xx)       Low Dose      High Dose
Subjects with any TEAE        xx (xx.x%)   xx (xx.x%)    xx (xx.x%)
Subjects with Serious AE      xx (xx.x%)   xx (xx.x%)    xx (xx.x%)
Subjects with Related AE      xx (xx.x%)   xx (xx.x%)    xx (xx.x%)
AEs by SOC and PT
GASTROINTESTINAL DISORDERS
  Diarrhoea                   xx (xx.x%)   xx (xx.x%)    xx (xx.x%)
  Nausea                      xx (xx.x%)   xx (xx.x%)    xx (xx.x%)`,
    adamSpec: `ADAE: USUBJID, TRTEMFL (filter Y), SAFFL (filter Y), AEBODSYS (SOC), AEDECOD (PT), AESER (Y/N), AEREL (causality: POSSIBLE/PROBABLE=related)`
  },
  {
    id: "T-14.4.1",
    title: "Summary of Laboratory Values — Change from Baseline",
    type: "table",
    population: "Safety Population (SAFFL='Y')",
    datasets: ["ADSL","ADLB"],
    shell: `TABLE T-14.4.1
Title: Change from Baseline in Laboratory Parameters at Week 8
Population: Safety Analysis Set

                              Placebo      Xanomeline    Xanomeline
Alanine Aminotransferase (U/L)
  Baseline n / Mean (SD)   xx / xx.x     xx / xx.x     xx / xx.x
  Week 8 n / Mean (SD)     xx / xx.x     xx / xx.x     xx / xx.x
  Change n / Mean (SD)     xx / xx.x     xx / xx.x     xx / xx.x
Sodium (mEq/L)
  Baseline n / Mean (SD)   xx / xx.x     xx / xx.x     xx / xx.x
  Change n / Mean (SD)     xx / xx.x     xx / xx.x     xx / xx.x`,
    adamSpec: `ADLB: USUBJID, PARAMCD, PARAM, AVISIT, AVAL, BASE, CHG, ANL01FL (filter Y). Merge ADSL for ARM.`
  }
];
