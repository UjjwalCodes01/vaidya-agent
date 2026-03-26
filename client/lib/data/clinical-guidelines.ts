/**
 * Indian Clinical Guidelines Seed Data
 * Based on ICMR, WHO, and Ministry of Health guidelines
 * Focus on Northern India epidemiology
 */

import type { ClinicalGuideline } from '@/lib/gcp/guidelines-store';

type GuidelineInput = Omit<ClinicalGuideline, 'id' | 'embedding' | 'lastUpdated'>;

export const INDIAN_CLINICAL_GUIDELINES: GuidelineInput[] = [
  // =====================================
  // DENGUE FEVER
  // =====================================
  {
    condition: 'dengue',
    category: 'infectious',
    title: 'Dengue Fever Initial Assessment',
    content: `
      Clinical Features: High fever (39-40°C), severe headache, retro-orbital pain, myalgia, arthralgia, rash (maculopapular).

      Warning Signs (Require Immediate Referral):
      - Abdominal pain or tenderness
      - Persistent vomiting (>3 episodes in 24 hours)
      - Mucosal bleeding (gums, nose)
      - Lethargy or restlessness
      - Hepatomegaly >2cm
      - Rapid decrease in platelet count
      - Rising hematocrit with rapid drop in platelets

      Essential Labs: Complete blood count (CBC) with platelet count, hematocrit monitoring every 6-12 hours in critical phase.

      Management at PHC Level:
      - Oral rehydration: ORS/juices 2-3 liters/day
      - Paracetamol for fever (avoid NSAIDs - bleeding risk)
      - Daily monitoring of warning signs
      - Refer if any warning sign develops
    `,
    source: 'ICMR National Guidelines for Dengue 2023',
    sourceUrl: 'https://ncdc.gov.in/WriteReadData/Guidelines/Dengue_Guidelines_2023.pdf',
    region: 'Northern India',
    keywords: ['dengue', 'fever', 'platelet', 'hemorrhagic', 'aedes', 'monsoon', 'viral'],
    severity: 'moderate',
  },
  {
    condition: 'dengue',
    category: 'infectious',
    title: 'Severe Dengue Management',
    content: `
      Criteria for Severe Dengue:
      1. Plasma leakage leading to shock (DSS) or fluid accumulation with respiratory distress
      2. Severe bleeding (GI, vaginal, etc.)
      3. Severe organ impairment (liver AST/ALT >1000, CNS impairment, heart failure)

      Immediate Actions:
      - IV access with wide bore cannula
      - Group and cross-match blood
      - Initial fluid bolus: 10-20 ml/kg crystalloid over 15-30 min
      - Monitor vitals every 15-30 minutes
      - Foley catheter for hourly urine output

      Fluid Management:
      - Target urine output: 0.5-1 ml/kg/hr
      - Hematocrit monitoring every 2-4 hours
      - Reduce IV fluids once stable (HCT drops, improving urine output)

      Blood Transfusion Triggers:
      - Platelets <10,000 with active bleeding
      - Fresh whole blood for massive hemorrhage
      - PRBC if hemoglobin <7g/dL

      REFER TO TERTIARY CARE if: Refractory shock, multi-organ failure, severe bleeding.
    `,
    source: 'WHO Dengue Guidelines for Diagnosis, Treatment and Control',
    sourceUrl: 'https://www.who.int/publications/i/item/9789241547871',
    region: 'Northern India',
    keywords: ['dengue', 'shock', 'plasma leakage', 'hemorrhage', 'critical', 'ICU'],
    severity: 'critical',
  },

  // =====================================
  // TUBERCULOSIS
  // =====================================
  {
    condition: 'tuberculosis',
    category: 'infectious',
    title: 'Pulmonary TB Diagnosis and Initial Management',
    content: `
      Suspect TB if:
      - Cough >2 weeks
      - Fever (especially evening rise)
      - Night sweats
      - Weight loss >5% in 3 months
      - Hemoptysis
      - Contact with TB patient

      Diagnosis (RNTCP Guidelines):
      1. Upfront CBNAAT (GeneXpert) - preferred
      2. If not available: 2 sputum smears (spot + early morning)
      3. Chest X-ray if sputum negative but high clinical suspicion

      Drug-Sensitive TB Treatment (NTEP):
      Intensive Phase (2 months): HRZE daily
      - H (Isoniazid): 5mg/kg
      - R (Rifampicin): 10mg/kg
      - Z (Pyrazinamide): 25mg/kg
      - E (Ethambutol): 15mg/kg

      Continuation Phase (4 months): HR daily

      Monitoring:
      - Sputum at 2, 4, 6 months
      - Weight monthly
      - Vision check before and during treatment (Ethambutol)

      Notify all cases through NIKSHAY portal.
    `,
    source: 'NTEP (National TB Elimination Programme) Guidelines 2022',
    sourceUrl: 'https://tbcindia.gov.in/index1.php?lang=1&level=2&sublinkid=5629&lid=3651',
    region: 'Northern India',
    keywords: ['tuberculosis', 'TB', 'cough', 'CBNAAT', 'DOTS', 'NTEP', 'RNTCP'],
    severity: 'high',
  },
  {
    condition: 'tuberculosis',
    category: 'infectious',
    title: 'Drug-Resistant TB (DR-TB) Referral Criteria',
    content: `
      Suspect DR-TB if:
      - Previous TB treatment (retreatment case)
      - Contact with known DR-TB patient
      - Non-response to first-line treatment at 2 months
      - HIV co-infection
      - Healthcare worker

      CBNAAT/GeneXpert MTB/RIF detects Rifampicin resistance in 2 hours.

      Immediate Actions:
      1. DO NOT start Category II regimen empirically
      2. Send for CBNAAT if not done
      3. Continue current regimen until DR-TB confirmed
      4. Refer to DR-TB Center (District TB Center)
      5. Ensure infection control (N95 mask, ventilation)

      Bedaquiline-based regimens now preferred for RR/MDR-TB (shorter regimen).

      DO NOT delay referral - DR-TB requires specialist management at designated centers.
    `,
    source: 'NTEP Programmatic Management of Drug-Resistant TB (PMDT) Guidelines',
    sourceUrl: 'https://tbcindia.gov.in/showfile.php?lid=3649',
    region: 'Northern India',
    keywords: ['MDR-TB', 'XDR-TB', 'drug-resistant', 'rifampicin', 'bedaquiline', 'PMDT'],
    severity: 'critical',
  },

  // =====================================
  // MALARIA
  // =====================================
  {
    condition: 'malaria',
    category: 'infectious',
    title: 'Malaria Diagnosis and Treatment - Plasmodium falciparum',
    content: `
      Clinical Features:
      - Fever with chills and rigors
      - Headache, body ache
      - May have irregular fever pattern (not always tertian/quartan)

      Diagnosis:
      - RDT (Rapid Diagnostic Test) - detects Pf HRP2 and pan-LDH
      - Peripheral smear (gold standard) - species identification
      - Test ALL fever cases in endemic areas

      P. falciparum Treatment (NVBDCP 2023):

      Uncomplicated Pf:
      - ACT: Artesunate + Sulfadoxine-Pyrimethamine (AS+SP) for 3 days
        OR Artemether-Lumefantrine (AL) 3 days
      - Single dose Primaquine 0.25mg/kg on Day 1 (gametocytocidal)

      CAUTION: Check G6PD status before Primaquine if possible.

      Signs of Severe Malaria (REQUIRES REFERRAL):
      - Altered consciousness/convulsions
      - Respiratory distress
      - Jaundice with other organ dysfunction
      - Severe anemia (Hb <5g/dL)
      - Hypoglycemia
      - Renal impairment
      - Shock
    `,
    source: 'NVBDCP National Drug Policy on Malaria 2023',
    sourceUrl: 'https://nvbdcp.gov.in/WriteReadData/l892s/National-Drug-Policy-2023.pdf',
    region: 'Northern India',
    keywords: ['malaria', 'falciparum', 'fever', 'RDT', 'ACT', 'artemisinin', 'NVBDCP'],
    severity: 'high',
  },
  {
    condition: 'malaria',
    category: 'infectious',
    title: 'Severe Malaria Emergency Management',
    content: `
      Severe Malaria is a MEDICAL EMERGENCY. Mortality without treatment >20%.

      Immediate Management at PHC:
      1. Secure IV access
      2. Check blood glucose - treat hypoglycemia (25% dextrose)
      3. Start IV/IM Artesunate (pre-referral):
         - 2.4 mg/kg IV/IM at 0, 12, 24 hours, then daily
         - If Artesunate unavailable: Artemether 3.2mg/kg IM loading, then 1.6mg/kg daily
         - If neither available: Quinine 20mg/kg loading then 10mg/kg 8-hourly

      4. Treat seizures: Diazepam 0.3mg/kg IV
      5. Maintain airway
      6. Treat severe anemia: Blood transfusion if Hb <5g/dL (or <7g/dL with respiratory distress)

      REFER URGENTLY to higher center:
      - After giving first dose of parenteral antimalarial
      - Continue supportive care during transport
      - Share patient details with receiving facility

      DO NOT give oral antimalarials in severe malaria - unreliable absorption.
    `,
    source: 'WHO Guidelines for Malaria 2023 & NVBDCP',
    sourceUrl: 'https://www.who.int/publications/i/item/guidelines-for-malaria',
    region: 'Northern India',
    keywords: ['cerebral malaria', 'severe', 'artesunate', 'emergency', 'ICU', 'coma'],
    severity: 'critical',
  },

  // =====================================
  // TYPHOID FEVER
  // =====================================
  {
    condition: 'typhoid',
    category: 'infectious',
    title: 'Typhoid Fever Diagnosis and Management',
    content: `
      Clinical Features:
      - Step-ladder fever pattern (rises over 3-4 days)
      - Relative bradycardia (pulse-temperature dissociation)
      - Coated tongue, abdominal discomfort
      - Hepatosplenomegaly
      - Rose spots (rare in Indian patients)

      Diagnosis:
      - Blood culture (gold standard) - best in week 1
      - Widal test: Unreliable, high false positives. Use only if culture unavailable.
        Significant: O titer ≥1:160, H titer ≥1:160 OR 4-fold rise
      - Typhidot IgM - more specific than Widal

      Treatment (ICMR Guidelines):

      Uncomplicated Typhoid:
      - First line: Azithromycin 10-20mg/kg/day x 7 days OR
      - Ceftriaxone 50-75mg/kg/day IV/IM x 10-14 days

      Multidrug-Resistant (MDR) Typhoid:
      - Azithromycin or Ceftriaxone (as above)
      - Avoid: Chloramphenicol, Ampicillin, Co-trimoxazole

      Fluoroquinolone-Resistant Typhoid (common in North India):
      - Avoid: Ciprofloxacin, Ofloxacin
      - Use: Azithromycin or Ceftriaxone

      Response expected in 3-5 days. If no response, suspect resistance or complications.
    `,
    source: 'ICMR Treatment Guidelines for Antimicrobial Use in Common Syndromes 2019',
    sourceUrl: 'https://main.icmr.nic.in/sites/default/files/guidelines/Treatment_Guidelines_2019_Final.pdf',
    region: 'Northern India',
    keywords: ['typhoid', 'enteric fever', 'salmonella', 'widal', 'fever', 'MDR', 'XDR'],
    severity: 'moderate',
  },
  {
    condition: 'typhoid',
    category: 'infectious',
    title: 'Typhoid Complications and Referral',
    content: `
      Complications (Usually week 2-3):

      1. Intestinal Perforation:
         - Sudden severe abdominal pain
         - Abdominal rigidity, guarding
         - Shock
         → SURGICAL EMERGENCY - Refer immediately

      2. GI Hemorrhage:
         - Melena or fresh blood per rectum
         - Falling BP, rising pulse
         → Blood transfusion, NPO, urgent referral

      3. Typhoid Encephalopathy:
         - Altered sensorium, delirium
         - Muttering, picking at bedclothes
         → IV Dexamethasone 3mg/kg, refer to tertiary care

      4. Myocarditis:
         - Hypotension, arrhythmias
         → ECG monitoring, refer

      Other Complications:
      - Hepatitis, cholecystitis
      - Pneumonia
      - Osteomyelitis (especially sickle cell patients)

      Prevention:
      - Typhoid conjugate vaccine (TCV) for endemic areas
      - Safe water, sanitation
      - Hand hygiene
    `,
    source: 'Harrison\'s Principles of Internal Medicine & ICMR Guidelines',
    region: 'Northern India',
    keywords: ['perforation', 'hemorrhage', 'encephalopathy', 'surgical', 'emergency'],
    severity: 'critical',
  },

  // =====================================
  // ACUTE DIARRHEAL DISEASE
  // =====================================
  {
    condition: 'diarrhea',
    category: 'infectious',
    title: 'Acute Diarrhea Management - ORS Protocol',
    content: `
      Assessment:
      - Duration of diarrhea
      - Number of stools/day
      - Presence of blood (dysentery)
      - Vomiting
      - Dehydration signs

      Dehydration Assessment (WHO):

      NO Dehydration: Alert, drinks normally, skin pinch instant, eyes normal
      → Plan A: ORS after each loose stool, continue feeding

      SOME Dehydration: Restless/irritable, drinks eagerly, skin pinch <2 sec, eyes sunken
      → Plan B: ORS 75ml/kg over 4 hours, reassess

      SEVERE Dehydration: Lethargic/unconscious, unable to drink, skin pinch >2 sec
      → Plan C: IV Ringer's Lactate 100ml/kg
        - <1 year: 30ml/kg in 1 hr, then 70ml/kg in 5 hrs
        - >1 year: 30ml/kg in 30 min, then 70ml/kg in 2.5 hrs

      ORS Preparation: 1 packet in 1 liter clean water

      Zinc Supplementation (ESSENTIAL):
      - <6 months: 10mg/day x 14 days
      - >6 months: 20mg/day x 14 days

      Antibiotics ONLY if: Bloody diarrhea (dysentery), cholera suspected, severe illness
    `,
    source: 'WHO/UNICEF ORT Guidelines & IAP Recommendations',
    sourceUrl: 'https://www.who.int/publications/i/item/9789241549455',
    region: 'Northern India',
    keywords: ['diarrhea', 'ORS', 'dehydration', 'gastroenteritis', 'zinc', 'cholera'],
    severity: 'moderate',
  },

  // =====================================
  // RESPIRATORY INFECTIONS
  // =====================================
  {
    condition: 'pneumonia',
    category: 'infectious',
    title: 'Community-Acquired Pneumonia - IMNCI Approach',
    content: `
      Assessment (Children under 5 - IMNCI):

      Count respiratory rate for 1 full minute:
      - <2 months: ≥60/min = fast breathing
      - 2-12 months: ≥50/min = fast breathing
      - 1-5 years: ≥40/min = fast breathing

      Classification:

      PNEUMONIA (fast breathing):
      - Amoxicillin 40mg/kg/day in 2 divided doses x 5 days
      - Follow up in 2 days

      SEVERE PNEUMONIA (chest indrawing OR danger signs):
      - First dose Ampicillin + Gentamicin (or Ceftriaxone)
      - REFER URGENTLY

      Danger Signs (ANY = severe):
      - Unable to drink/breastfeed
      - Convulsions
      - Abnormally sleepy/difficult to wake
      - Stridor in calm child
      - Central cyanosis

      Adults:
      - CURB-65 score for severity
      - Amoxicillin or Azithromycin for mild CAP
      - Add supportive care: hydration, paracetamol
    `,
    source: 'IMNCI (Integrated Management of Neonatal and Childhood Illness) Guidelines',
    sourceUrl: 'https://www.who.int/publications/i/item/9789241506823',
    region: 'Northern India',
    keywords: ['pneumonia', 'respiratory', 'IMNCI', 'fast breathing', 'chest indrawing'],
    severity: 'high',
  },

  // =====================================
  // SNAKE BITE
  // =====================================
  {
    condition: 'snakebite',
    category: 'emergency',
    title: 'Snake Bite Emergency Management',
    content: `
      First Aid:
      - Reassure patient (most bites are non-venomous or dry bites)
      - Immobilize the bitten limb (splint like fracture)
      - Remove jewelry/tight items from limb
      - Do NOT: Tourniquet, cut/suck wound, apply ice, give alcohol

      Transport to Hospital IMMEDIATELY.

      At Health Facility:

      Signs of Envenomation:
      1. Local: Progressive swelling beyond bite site, blistering
      2. Hemotoxic (Viper): Bleeding gums, hematuria, prolonged WBCT >20 min
      3. Neurotoxic (Cobra/Krait): Ptosis, diplopia, difficulty swallowing/breathing

      Anti-Snake Venom (ASV) Indications:
      - Systemic envenomation signs
      - Severe local envenomation (swelling >half limb)
      - WBCT >20 minutes

      ASV Protocol (Polyvalent):
      - Test dose NOT required (delays treatment)
      - Initial dose: 8-10 vials IV in 100ml NS over 30-60 min
      - Repeat 6-hourly if coagulopathy persists

      Supportive Care:
      - IV fluids, tetanus toxoid
      - Fasciotomy if compartment syndrome
      - Ventilatory support for neurotoxic envenomation
    `,
    source: 'WHO Guidelines on Management of Snakebites - South-East Asia Region',
    sourceUrl: 'https://www.who.int/publications/i/item/9789290225300',
    region: 'Northern India',
    keywords: ['snakebite', 'viper', 'cobra', 'krait', 'ASV', 'antivenom', 'emergency'],
    severity: 'critical',
  },

  // =====================================
  // SEASONAL INFLUENZA
  // =====================================
  {
    condition: 'influenza',
    category: 'infectious',
    title: 'Influenza-like Illness (ILI) Management',
    content: `
      Case Definition (ILI):
      Acute respiratory illness with:
      - Fever ≥38°C AND
      - Cough (onset within last 10 days)

      Supportive Management (Most Cases):
      - Rest, adequate fluids
      - Paracetamol for fever
      - Steam inhalation for congestion
      - Isolation for 7 days

      Antivirals (Oseltamivir) - Consider if:
      - High-risk groups: Elderly, pregnant, chronic diseases, immunocompromised
      - Severe illness requiring hospitalization
      - Within 48 hours of symptom onset (most benefit)

      Oseltamivir Dose: 75mg BD x 5 days (adults)

      Red Flags (Refer/Admit):
      - Respiratory distress (RR >30, SpO2 <92%)
      - Altered sensorium
      - Persistent high fever >5 days
      - Hemoptysis
      - Shock

      Infection Control:
      - Respiratory hygiene, hand hygiene
      - Isolate suspected cases
      - Healthcare workers: N95 during AGPs
    `,
    source: 'MoHFW Seasonal Influenza Guidelines',
    sourceUrl: 'https://ncdc.gov.in/WriteReadData/l892s/1203587846Influenza_Guidelines.pdf',
    region: 'Northern India',
    keywords: ['influenza', 'flu', 'ILI', 'H1N1', 'oseltamivir', 'respiratory'],
    severity: 'moderate',
  },
];

export default INDIAN_CLINICAL_GUIDELINES;
