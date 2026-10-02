/**
 * storage.js
 * Persistence, sample data generator, scenario testing data, and state management.
 */

const STORAGE_KEYS = {
  PATIENTS: "hospital_ed_patients_v1",
  DOCTORS: "hospital_ed_doctors_v1",
  SETTINGS: "hospital_ed_settings_v1",
  NEXT_ID: "hospital_ed_next_id_v1"
};

// Fixed reference timestamps relative to current session for realistic presentation
function getRelativeTime(minutesAgo) {
  const d = new Date();
  d.setMinutes(d.getMinutes() - minutesAgo);
  return d.toISOString();
}

const DEFAULT_DOCTORS = [
  {
    id: "DOC-101",
    name: "Dr. Marcus Vance",
    specialty: "Trauma & Resuscitation",
    status: DOCTOR_STATUS.AVAILABLE,
    currentPatientId: null
  },
  {
    id: "DOC-102",
    name: "Dr. Elena Rostova",
    specialty: "Emergency Cardiology",
    status: DOCTOR_STATUS.BUSY,
    currentPatientId: "P-108"
  },
  {
    id: "DOC-103",
    name: "Dr. James Chen",
    specialty: "Pediatric Emergency",
    status: DOCTOR_STATUS.AVAILABLE,
    currentPatientId: null
  },
  {
    id: "DOC-104",
    name: "Dr. Priya Nair",
    specialty: "Acute Internal Medicine",
    status: DOCTOR_STATUS.OFF_DUTY,
    currentPatientId: null
  }
];

const DEFAULT_PATIENTS = [
  // 1. Critical Priority 5 Patient waiting (immediate life threat)
  {
    id: "P-101",
    name: "Arthur Pendelton",
    age: 64,
    gender: "Male",
    priority: 5,
    symptoms: "Crushing retrosternal chest pain radiating to jaw, diaphoresis, hypotensive",
    arrivalTime: getRelativeTime(12),
    treatmentStartTime: null,
    treatmentEndTime: null,
    status: PATIENT_STATUS.WAITING,
    doctorId: null,
    doctorName: null,
    notes: "Triage note: Suspected STEMI. Code Red activated.",
    vitals: { hr: "135 bpm", bp: "86/52 mmHg", spo2: "89%", temp: "37.2 °C" }
  },

  // 2. Priority 4 - Very Urgent, arrived 25m ago
  {
    id: "P-102",
    name: "Seraphina Morales",
    age: 34,
    gender: "Female",
    priority: 4,
    symptoms: "Sudden onset severe headache ('thunderclap'), photophobia, nausea",
    arrivalTime: getRelativeTime(25),
    treatmentStartTime: null,
    treatmentEndTime: null,
    status: PATIENT_STATUS.WAITING,
    doctorId: null,
    doctorName: null,
    notes: "Rule out subarachnoid hemorrhage. STAT neuro-imaging requested.",
    vitals: { hr: "102 bpm", bp: "158/98 mmHg", spo2: "98%", temp: "37.6 °C" }
  },

  // 3. Priority 4 - Very Urgent, arrived 18m ago (demonstrates FIFO with P-102: P-102 should be ahead of P-103)
  {
    id: "P-103",
    name: "Liam O'Connor",
    age: 42,
    gender: "Male",
    priority: 4,
    symptoms: "Deep compound forearm fracture with arterial bleeding controlled by pressure",
    arrivalTime: getRelativeTime(18),
    treatmentStartTime: null,
    treatmentEndTime: null,
    status: PATIENT_STATUS.WAITING,
    doctorId: null,
    doctorName: null,
    notes: "Severe orthopedic injury. Ortho team alerted.",
    vitals: { hr: "110 bpm", bp: "140/90 mmHg", spo2: "97%", temp: "36.9 °C" }
  },

  // 4. Priority 3 - Urgent, arrived 45m ago
  {
    id: "P-104",
    name: "Amina Al-Mansoor",
    age: 27,
    gender: "Female",
    priority: 3,
    symptoms: "Acute right lower quadrant abdominal pain with rebound tenderness (McBurney's point)",
    arrivalTime: getRelativeTime(45),
    treatmentStartTime: null,
    treatmentEndTime: null,
    status: PATIENT_STATUS.WAITING,
    doctorId: null,
    doctorName: null,
    notes: "Probable acute appendicitis. IV analgesia administered.",
    vitals: { hr: "96 bpm", bp: "128/82 mmHg", spo2: "99%", temp: "38.5 °C" }
  },

  // 5. Priority 3 - Urgent, arrived 30m ago (tied with P-104 on priority, but P-104 arrived earlier)
  {
    id: "P-105",
    name: "Kenneth Miller",
    age: 58,
    gender: "Male",
    priority: 3,
    symptoms: "Exacerbation of known asthma, moderate expiratory wheeze, speaking in short sentences",
    arrivalTime: getRelativeTime(30),
    treatmentStartTime: null,
    treatmentEndTime: null,
    status: PATIENT_STATUS.WAITING,
    doctorId: null,
    doctorName: null,
    notes: "Nebulizer started in triage bay.",
    vitals: { hr: "98 bpm", bp: "134/86 mmHg", spo2: "94%", temp: "37.0 °C" }
  },

  // 6. Priority 2 - Less Urgent, arrived 60m ago
  {
    id: "P-106",
    name: "Chloe Dupont",
    age: 19,
    gender: "Female",
    priority: 2,
    symptoms: "Inversion ankle injury while playing volleyball, severe swelling, unable to bear weight",
    arrivalTime: getRelativeTime(60),
    treatmentStartTime: null,
    treatmentEndTime: null,
    status: PATIENT_STATUS.WAITING,
    doctorId: null,
    doctorName: null,
    notes: "Ottawa ankle rules positive. Needs X-ray.",
    vitals: { hr: "76 bpm", bp: "118/74 mmHg", spo2: "100%", temp: "36.7 °C" }
  },

  // 7. Priority 1 - Non-Urgent, arrived 75m ago
  {
    id: "P-107",
    name: "Robert Taylor",
    age: 71,
    gender: "Male",
    priority: 1,
    symptoms: "Chronic lumbar back stiffness, ran out of anti-inflammatory medication 3 days ago",
    arrivalTime: getRelativeTime(75),
    treatmentStartTime: null,
    treatmentEndTime: null,
    status: PATIENT_STATUS.WAITING,
    doctorId: null,
    doctorName: null,
    notes: "Non-acute prescription renewal request.",
    vitals: { hr: "70 bpm", bp: "124/80 mmHg", spo2: "98%", temp: "36.5 °C" }
  },

  // 8. Patient Currently Being Treated by Dr. Elena Rostova
  {
    id: "P-108",
    name: "Eleanor Wright",
    age: 52,
    gender: "Female",
    priority: 5,
    symptoms: "Anaphylactic shock following wasp sting; stridor, generalized urticaria",
    arrivalTime: getRelativeTime(40),
    treatmentStartTime: getRelativeTime(14),
    treatmentEndTime: null,
    status: PATIENT_STATUS.BEING_TREATED,
    doctorId: "DOC-102",
    doctorName: "Dr. Elena Rostova",
    notes: "Epinephrine IM x 2 given. Responding well, airway protected.",
    vitals: { hr: "112 bpm", bp: "105/68 mmHg", spo2: "96%", temp: "37.1 °C" }
  },

  // 9. Completed Patient 1
  {
    id: "P-109",
    name: "David Kim",
    age: 29,
    gender: "Male",
    priority: 4,
    symptoms: "Severe eye chemical splash (bleach) during industrial cleaning",
    arrivalTime: getRelativeTime(90),
    treatmentStartTime: getRelativeTime(82),
    treatmentEndTime: getRelativeTime(35),
    status: PATIENT_STATUS.COMPLETED,
    doctorId: "DOC-101",
    doctorName: "Dr. Marcus Vance",
    notes: "Continuous Morgan lens irrigation 2L normal saline. Corneal pH normalized to 7.4. Discharged with ophthalmic ointment.",
    vitals: { hr: "82 bpm", bp: "125/80 mmHg", spo2: "99%", temp: "36.8 °C" }
  },

  // 10. Completed Patient 2
  {
    id: "P-110",
    name: "Grace Hopper-Diaz",
    age: 45,
    gender: "Female",
    priority: 3,
    symptoms: "Severe laceration to palmar aspect of hand from broken kitchen glass",
    arrivalTime: getRelativeTime(110),
    treatmentStartTime: getRelativeTime(75),
    treatmentEndTime: getRelativeTime(20),
    status: PATIENT_STATUS.COMPLETED,
    doctorId: "DOC-103",
    doctorName: "Dr. James Chen",
    notes: "Wound debrided and repaired with 5-0 Ethilon sutures. Tetanus toxoid booster administered. Full sensory and tendon function intact.",
    vitals: { hr: "74 bpm", bp: "120/76 mmHg", spo2: "99%", temp: "36.6 °C" }
  }
];

class StorageManager {
  static loadPatients() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PATIENTS);
      if (raw) {
        const arr = JSON.parse(raw);
        return arr.map(p => new Patient(p));
      }
    } catch (e) {
      console.warn("Error loading patients from localStorage:", e);
    }
    // Return seeded defaults if empty
    return StorageManager.resetPatientsToDefault();
  }

  static savePatients(patients) {
    try {
      localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
    } catch (e) {
      console.error("Error saving patients to localStorage:", e);
    }
  }

  static loadDoctors() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DOCTORS);
      if (raw) {
        const arr = JSON.parse(raw);
        return arr.map(d => new Doctor(d));
      }
    } catch (e) {
      console.warn("Error loading doctors from localStorage:", e);
    }
    return StorageManager.resetDoctorsToDefault();
  }

  static saveDoctors(doctors) {
    try {
      localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(doctors));
    } catch (e) {
      console.error("Error saving doctors to localStorage:", e);
    }
  }

  static resetPatientsToDefault() {
    const list = DEFAULT_PATIENTS.map(p => new Patient(p));
    StorageManager.savePatients(list);
    localStorage.setItem(STORAGE_KEYS.NEXT_ID, "111");
    return list;
  }

  static resetDoctorsToDefault() {
    const list = DEFAULT_DOCTORS.map(d => new Doctor(d));
    StorageManager.saveDoctors(list);
    return list;
  }

  static resetAllData() {
    const patients = StorageManager.resetPatientsToDefault();
    const doctors = StorageManager.resetDoctorsToDefault();
    return { patients, doctors };
  }

  static getNextPatientId() {
    let nextNum = 111;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.NEXT_ID);
      if (raw) {
        nextNum = parseInt(raw, 10) || 111;
      }
    } catch (e) {}
    localStorage.setItem(STORAGE_KEYS.NEXT_ID, String(nextNum + 1));
    return `P-${nextNum}`;
  }

  /**
   * Loads the specific test scenario:
   * Patient A: 10:00, Priority 3
   * Patient B: 10:05, Priority 5
   * Patient C: 09:55, Priority 3
   * Order must be: Patient B -> Patient C -> Patient A
   */
  static getScenarioTrioPatients() {
    const todayStr = new Date().toISOString().split('T')[0];
    return [
      new Patient({
        id: "P-A",
        name: "Patient A (Urgent)",
        age: 38,
        gender: "Female",
        priority: 3,
        symptoms: "Persistent abdominal pain and moderate fever",
        arrivalTime: `${todayStr}T10:00:00.000Z`,
        status: PATIENT_STATUS.WAITING,
        notes: "Scenario Test: Arrived at 10:00 with Priority 3."
      }),
      new Patient({
        id: "P-B",
        name: "Patient B (Critical)",
        age: 62,
        gender: "Male",
        priority: 5,
        symptoms: "Acute chest pain, severe dyspnea, diaphoresis",
        arrivalTime: `${todayStr}T10:05:00.000Z`,
        status: PATIENT_STATUS.WAITING,
        notes: "Scenario Test: Arrived at 10:05 with Priority 5 (Critical)."
      }),
      new Patient({
        id: "P-C",
        name: "Patient C (Urgent)",
        age: 45,
        gender: "Male",
        priority: 3,
        symptoms: "Suspected renal colic, flank pain radiating to groin",
        arrivalTime: `${todayStr}T09:55:00.000Z`,
        status: PATIENT_STATUS.WAITING,
        notes: "Scenario Test: Arrived at 09:55 with Priority 3."
      })
    ];
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StorageManager, DEFAULT_PATIENTS, DEFAULT_DOCTORS };
} else if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
}
