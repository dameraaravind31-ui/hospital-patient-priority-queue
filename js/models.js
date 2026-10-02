/**
 * models.js
 * Data models, constants, and helper utilities for Hospital ED Priority Queue
 */

const PRIORITY_LEVELS = {
  5: {
    level: 5,
    name: "Critical",
    badgeClass: "badge-critical",
    color: "#EF4444",
    bgLight: "#FEF2F2",
    borderColor: "#F87171",
    description: "Immediate life threat (Cardiac arrest, massive trauma, respiratory failure)",
    targetWaitTimeMin: 0
  },
  4: {
    level: 4,
    name: "Very Urgent",
    badgeClass: "badge-very-urgent",
    color: "#F97316",
    bgLight: "#FFF7ED",
    borderColor: "#FB923C",
    description: "Severe distress or high risk (Severe chest pain, stroke symptoms, acute fracture)",
    targetWaitTimeMin: 15
  },
  3: {
    level: 3,
    name: "Urgent",
    badgeClass: "badge-urgent",
    color: "#EAB308",
    bgLight: "#FEFCE8",
    borderColor: "#FACC15",
    description: "Moderate distress, requires investigation (High fever, abdominal pain, renal colic)",
    targetWaitTimeMin: 30
  },
  2: {
    level: 2,
    name: "Less Urgent",
    badgeClass: "badge-less-urgent",
    color: "#3B82F6",
    bgLight: "#EFF6FF",
    borderColor: "#60A5FA",
    description: "Low acuity, stable (Sprain, minor cuts, earache, mild infection)",
    targetWaitTimeMin: 60
  },
  1: {
    level: 1,
    name: "Non-Urgent",
    badgeClass: "badge-non-urgent",
    color: "#10B981",
    bgLight: "#ECFDF5",
    borderColor: "#34D399",
    description: "Minor symptoms or chronic issues (Prescription renewal, suture removal, rash)",
    targetWaitTimeMin: 120
  }
};

const PATIENT_STATUS = {
  WAITING: "Waiting",
  BEING_TREATED: "Being Treated",
  COMPLETED: "Completed"
};

const DOCTOR_STATUS = {
  AVAILABLE: "Available",
  BUSY: "Busy",
  OFF_DUTY: "Off Duty"
};

class Patient {
  constructor({
    id,
    name,
    age,
    gender = "Other",
    priority = 3,
    symptoms = "",
    arrivalTime = new Date().toISOString(),
    treatmentStartTime = null,
    treatmentEndTime = null,
    status = PATIENT_STATUS.WAITING,
    doctorId = null,
    doctorName = null,
    notes = "",
    vitals = null
  }) {
    this.id = id;
    this.name = name;
    this.age = Number(age);
    this.gender = gender;
    this.priority = Number(priority);
    this.symptoms = symptoms;
    this.arrivalTime = arrivalTime;
    this.treatmentStartTime = treatmentStartTime;
    this.treatmentEndTime = treatmentEndTime;
    this.status = status;
    this.doctorId = doctorId;
    this.doctorName = doctorName;
    this.notes = notes;
    this.vitals = vitals || Patient.generateSampleVitals(this.priority);
  }

  static generateSampleVitals(priority) {
    if (priority === 5) {
      return { hr: "138 bpm", bp: "82/50 mmHg", spo2: "88%", temp: "39.4 °C" };
    } else if (priority === 4) {
      return { hr: "115 bpm", bp: "155/95 mmHg", spo2: "93%", temp: "38.7 °C" };
    } else if (priority === 3) {
      return { hr: "94 bpm", bp: "135/85 mmHg", spo2: "97%", temp: "38.1 °C" };
    } else if (priority === 2) {
      return { hr: "78 bpm", bp: "122/78 mmHg", spo2: "99%", temp: "37.1 °C" };
    }
    return { hr: "72 bpm", bp: "118/75 mmHg", spo2: "99%", temp: "36.8 °C" };
  }

  static validate(data) {
    const errors = {};
    if (!data.name || !data.name.trim()) {
      errors.name = "Patient full name is required.";
    }
    if (data.age === undefined || data.age === "" || isNaN(data.age) || Number(data.age) < 0 || Number(data.age) > 125) {
      errors.age = "Valid age (0 - 125) is required.";
    }
    if (!data.gender) {
      errors.gender = "Gender selection is required.";
    }
    const prio = Number(data.priority);
    if (!prio || prio < 1 || prio > 5) {
      errors.priority = "Priority level must be between 1 (Non-Urgent) and 5 (Critical).";
    }
    if (!data.symptoms || !data.symptoms.trim()) {
      errors.symptoms = "Reason for visit or symptoms must be specified.";
    }
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Calculates waiting duration in milliseconds up to treatmentStartTime or now.
   */
  getWaitDurationMs(currentTime = new Date()) {
    const start = new Date(this.arrivalTime).getTime();
    const end = this.treatmentStartTime ? new Date(this.treatmentStartTime).getTime() : currentTime.getTime();
    return Math.max(0, end - start);
  }

  /**
   * Calculates treatment duration in milliseconds up to treatmentEndTime or now.
   */
  getTreatmentDurationMs(currentTime = new Date()) {
    if (!this.treatmentStartTime) return 0;
    const start = new Date(this.treatmentStartTime).getTime();
    const end = this.treatmentEndTime ? new Date(this.treatmentEndTime).getTime() : currentTime.getTime();
    return Math.max(0, end - start);
  }
}

class Doctor {
  constructor({
    id,
    name,
    specialty = "Emergency Medicine",
    status = DOCTOR_STATUS.AVAILABLE,
    currentPatientId = null,
    avatar = null
  }) {
    this.id = id;
    this.name = name;
    this.specialty = specialty;
    this.status = status;
    this.currentPatientId = currentPatientId;
    this.avatar = avatar || Doctor.getInitials(name);
  }

  static getInitials(name) {
    if (!name) return "DR";
    const parts = name.replace(/^Dr\.\s*/i, '').trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
}

// Formatting utilities
const Formatters = {
  formatTime: (isoString) => {
    if (!isoString) return "--:--";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "--:--";
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  },

  formatDateTime: (isoString) => {
    if (!isoString) return "N/A";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
           d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  },

  formatDuration: (ms) => {
    if (!ms || ms < 0) return "0m 00s";
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  },

  formatDurationShort: (ms) => {
    if (!ms || ms < 0) return "0m";
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  },

  renderPriorityBadge: (priority, showDescription = false) => {
    const meta = PRIORITY_LEVELS[priority] || PRIORITY_LEVELS[1];
    return `
      <span class="priority-pill ${meta.badgeClass}" title="${meta.description}">
        <span class="priority-dot"></span>
        <span class="priority-level">P${meta.level}</span>
        <span class="priority-name">${meta.name}</span>
        ${showDescription ? `<small class="priority-desc">${meta.description}</small>` : ''}
      </span>
    `;
  },

  renderStatusBadge: (status) => {
    let cssClass = "status-waiting";
    let icon = "fa-clock";

    if (status === PATIENT_STATUS.BEING_TREATED) {
      cssClass = "status-treating";
      icon = "fa-user-md";
    } else if (status === PATIENT_STATUS.COMPLETED) {
      cssClass = "status-completed";
      icon = "fa-check-circle";
    }

    return `
      <span class="status-badge ${cssClass}">
        <i class="fas ${icon}"></i>
        <span>${status}</span>
      </span>
    `;
  },

  renderDoctorStatusBadge: (status) => {
    let cssClass = "doc-status-available";
    let icon = "fa-check";

    if (status === DOCTOR_STATUS.BUSY) {
      cssClass = "doc-status-busy";
      icon = "fa-procedures";
    } else if (status === DOCTOR_STATUS.OFF_DUTY) {
      cssClass = "doc-status-off";
      icon = "fa-moon";
    }

    return `
      <span class="doctor-badge ${cssClass}">
        <i class="fas ${icon}"></i>
        <span>${status}</span>
      </span>
    `;
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PRIORITY_LEVELS,
    PATIENT_STATUS,
    DOCTOR_STATUS,
    Patient,
    Doctor,
    Formatters
  };
} else if (typeof window !== 'undefined') {
  window.PRIORITY_LEVELS = PRIORITY_LEVELS;
  window.PATIENT_STATUS = PATIENT_STATUS;
  window.DOCTOR_STATUS = DOCTOR_STATUS;
  window.Patient = Patient;
  window.Doctor = Doctor;
  window.Formatters = Formatters;
}
