/**
 * app.js
 * Main Emergency Department Application Controller
 */

class HospitalEDApp {
  constructor() {
    this.priorityQueue = new PriorityQueue();
    this.allPatients = [];
    this.doctors = [];
    this.currentTab = 'dashboard';
    this.queueFilterPrio = 'all';
    this.queueSearchQuery = '';
    this.historySearchQuery = '';
    this.historyFilterStatus = 'all';
    this.historyFilterPriority = 'all';
    this.retriageTargetPatientId = null;

    // Interval timers
    this.clockInterval = null;
    this.timersInterval = null;
  }

  init() {
    this.loadData();
    this.bindEvents();
    this.startClock();
    this.startLiveTimers();
    this.setupAddPatientDefaults();
    this.renderAll();
    console.log("Hospital ED Triage System initialized with Binary Max-Heap Priority Queue.");
  }

  loadData() {
    this.doctors = StorageManager.loadDoctors();
    this.allPatients = StorageManager.loadPatients();

    // Reconstruct Priority Queue with all waiting patients
    const waitingPatients = this.allPatients.filter(p => p.status === PATIENT_STATUS.WAITING);
    this.priorityQueue.heapify(waitingPatients);
  }

  saveData() {
    StorageManager.saveDoctors(this.doctors);
    StorageManager.savePatients(this.allPatients);
  }

  startClock() {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
      
      const clockEl = document.getElementById('hospitalLiveClock');
      const dateEl = document.getElementById('hospitalLiveDate');
      if (clockEl) clockEl.textContent = timeStr;
      if (dateEl) dateEl.textContent = dateStr;
    };
    updateTime();
    this.clockInterval = setInterval(updateTime, 1000);
  }

  startLiveTimers() {
    // Ticks every 3 seconds to update waiting times and treatment durations smoothly
    this.timersInterval = setInterval(() => {
      this.updateDynamicTimers();
    }, 3000);
  }

  updateDynamicTimers() {
    const now = new Date();
    // Update waiting queue wait duration texts
    document.querySelectorAll('[data-patient-wait-id]').forEach(el => {
      const ptId = el.getAttribute('data-patient-wait-id');
      const pt = this.allPatients.find(p => p.id === ptId);
      if (pt) {
        el.textContent = Formatters.formatDuration(pt.getWaitDurationMs(now));
      }
    });

    // Update active treatment duration texts
    document.querySelectorAll('[data-patient-treating-id]').forEach(el => {
      const ptId = el.getAttribute('data-patient-treating-id');
      const pt = this.allPatients.find(p => p.id === ptId);
      if (pt) {
        el.textContent = Formatters.formatDuration(pt.getTreatmentDurationMs(now));
      }
    });
  }

  bindEvents() {
    // Navigation Tabs
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(navLink => {
      navLink.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = navLink.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // Mobile Menu Toggle
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('appSidebar');
    if (mobileBtn && sidebar) {
      mobileBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
      });
    }

    // Audio Chime Toggle
    const soundBtn = document.getElementById('btnSoundToggle');
    const soundIcon = document.getElementById('soundIcon');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        const isEnabled = window.soundEffects.toggleSound();
        if (isEnabled) {
          soundBtn.classList.add('active');
          soundIcon.className = 'fas fa-volume-up';
          this.showToast('Audio Enabled', 'Hospital announcement chimes and alerts are ON.', 'info');
          window.soundEffects.playCallChime();
        } else {
          soundBtn.classList.remove('active');
          soundIcon.className = 'fas fa-volume-mute';
          this.showToast('Audio Muted', 'Hospital sound effects have been muted.', 'info');
        }
      });
    }

    // Reset Data Button
    const resetBtn = document.getElementById('btnResetData');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm("Reset all patients and doctors to default hospital demo state?")) {
          StorageManager.resetAllData();
          this.loadData();
          this.setupAddPatientDefaults();
          this.renderAll();
          this.showToast("Demo Data Reset", "Restored default emergency department patients and doctor roster.", "info");
        }
      });
    }

    // Scenario Walkthrough Button in Sidebar
    const scenarioBtn = document.getElementById('btnLoadScenario');
    if (scenarioBtn) {
      scenarioBtn.addEventListener('click', () => {
        this.openScenarioModal();
      });
    }

    // Apply Scenario Data inside modal
    const applyScenarioBtn = document.getElementById('btnApplyScenarioData');
    if (applyScenarioBtn) {
      applyScenarioBtn.addEventListener('click', () => {
        this.applyScenarioData();
      });
    }

    // Add Patient Form Submit
    const addPatientForm = document.getElementById('addPatientForm');
    if (addPatientForm) {
      addPatientForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAddPatientSubmit();
      });
    }

    // Clear Form Button
    const clearFormBtn = document.getElementById('btnClearForm');
    if (clearFormBtn) {
      clearFormBtn.addEventListener('click', () => {
        this.setupAddPatientDefaults();
      });
    }

    // Priority Selection Cards in Form
    document.querySelectorAll('#pane-addPatient .priority-option').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('#pane-addPatient .priority-option').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const level = card.getAttribute('data-level');
        document.getElementById('selectedPriorityInput').value = level;
      });
    });

    // Preset buttons in Form
    document.getElementById('presetP5')?.addEventListener('click', () => this.fillPreset(5, "Arthur C. Clarke", 68, "Male", "Acute crushing chest pain, diaphoresis, ST elevation on 12-lead ECG, SpO2 88%"));
    document.getElementById('presetP4')?.addEventListener('click', () => this.fillPreset(4, "Valerie Martinez", 31, "Female", "Blunt head trauma after fall, loss of consciousness x 2 mins, severe headache and vomiting"));
    document.getElementById('presetP3')?.addEventListener('click', () => this.fillPreset(3, "Lucas Zhao", 24, "Male", "Right lower quadrant severe sharp abdominal pain x 6 hours, positive rebound tenderness"));
    document.getElementById('presetP2')?.addEventListener('click', () => this.fillPreset(2, "Hannah Jenkins", 40, "Female", "Twisted right ankle on staircase, marked lateral malleolus swelling, unable to walk"));
    document.getElementById('presetP1')?.addEventListener('click', () => this.fillPreset(1, "Thomas Briggs", 55, "Male", "Mild skin rash on forearm for 3 days, mild itching, request for topical ointment renewal"));

    // Waiting Queue Call Next button
    document.getElementById('btnQueueCallNext')?.addEventListener('click', () => {
      this.callNextPatient();
    });

    // Waiting Queue Filter Buttons
    document.querySelectorAll('[data-filter-prio]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-filter-prio]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.queueFilterPrio = btn.getAttribute('data-filter-prio');
        this.renderQueueTable();
      });
    });

    // Waiting Queue Search Input
    document.getElementById('queueSearchInput')?.addEventListener('input', (e) => {
      this.queueSearchQuery = e.target.value.toLowerCase().trim();
      this.renderQueueTable();
    });

    // History Filters and Search
    document.getElementById('historySearchInput')?.addEventListener('input', (e) => {
      this.historySearchQuery = e.target.value.toLowerCase().trim();
      this.renderTreatmentHistory();
    });
    document.getElementById('historyFilterStatus')?.addEventListener('change', (e) => {
      this.historyFilterStatus = e.target.value;
      this.renderTreatmentHistory();
    });
    document.getElementById('historyFilterPriority')?.addEventListener('change', (e) => {
      this.historyFilterPriority = e.target.value;
      this.renderTreatmentHistory();
    });

    // Export CSV Button
    document.getElementById('btnExportCSV')?.addEventListener('click', () => {
      this.exportHistoryToCSV();
    });

    // Add Doctor Modal & Form
    document.getElementById('btnOpenAddDoctorModal')?.addEventListener('click', () => {
      this.openModal('addDoctorModal');
    });
    document.getElementById('addDoctorForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddDoctorSubmit();
    });

    // Re-Triage Priority Cards inside Modal
    document.querySelectorAll('#retriagePriorityGrid .priority-option').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('#retriagePriorityGrid .priority-option').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        document.getElementById('retriageSelectedLevel').value = card.getAttribute('data-level');
      });
    });

    // Confirm Re-Triage Button
    document.getElementById('btnConfirmRetriage')?.addEventListener('click', () => {
      this.handleConfirmRetriage();
    });

    // Global Modal Close Buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeAllModals();
      });
    });

    // Close modal on click outside content
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeAllModals();
        }
      });
    });
  }

  switchTab(tabId) {
    this.currentTab = tabId;

    // Update sidebar nav items
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      if (item.getAttribute('data-tab') === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Close mobile drawer if open
    document.getElementById('appSidebar')?.classList.remove('mobile-open');

    // Update visible tab pane
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });
    const targetPane = document.getElementById(`pane-${tabId}`);
    if (targetPane) {
      targetPane.classList.add('active');
    }

    // Update Header Title
    const titles = {
      dashboard: { title: "Emergency Department Dashboard", sub: "Real-time Binary Heap Priority Triage System" },
      queue: { title: "Waiting Queue", sub: "Strict Priority & Arrival-Time Treatment Order" },
      addPatient: { title: "Add Patient / Triage Intake", sub: "Insert into Binary Max-Heap Priority Queue" },
      doctors: { title: "Doctor Management", sub: "Physician Bays, Statuses & Active Treatments" },
      history: { title: "Patient Directory & History", sub: "Archived Triage & Discharge Records" },
      heapVisualizer: { title: "Binary Max-Heap Structure", sub: "Algorithmic Inspection of Memory & Tree Hierarchy" }
    };

    const header = titles[tabId] || titles.dashboard;
    document.getElementById('currentPageTitle').textContent = header.title;
    document.getElementById('currentPageSubtitle').textContent = header.sub;

    // Re-render relevant view
    if (tabId === 'dashboard') {
      this.renderDashboard();
    } else if (tabId === 'queue') {
      this.renderQueueTable();
    } else if (tabId === 'doctors') {
      this.renderDoctorsRoster();
    } else if (tabId === 'history') {
      this.renderTreatmentHistory();
    } else if (tabId === 'heapVisualizer') {
      this.renderHeapVisualizer();
    }
  }

  fillPreset(priority, name, age, gender, symptoms) {
    document.getElementById('patientNameInput').value = name;
    document.getElementById('patientAgeInput').value = age;
    document.getElementById('patientGenderSelect').value = gender;
    document.getElementById('patientSymptomsInput').value = symptoms;

    // Select Priority Card
    document.querySelectorAll('#pane-addPatient .priority-option').forEach(c => {
      if (c.getAttribute('data-level') == priority) {
        c.classList.add('selected');
      } else {
        c.classList.remove('selected');
      }
    });
    document.getElementById('selectedPriorityInput').value = priority;
  }

  setupAddPatientDefaults() {
    const nextId = StorageManager.getNextPatientId();
    const idInput = document.getElementById('patientIdInput');
    if (idInput) idInput.value = nextId;

    const nameInput = document.getElementById('patientNameInput');
    if (nameInput) nameInput.value = '';

    const ageInput = document.getElementById('patientAgeInput');
    if (ageInput) ageInput.value = '';

    const symptomsInput = document.getElementById('patientSymptomsInput');
    if (symptomsInput) symptomsInput.value = '';

    // Set arrival time to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const isoLocal = now.toISOString().slice(0, 16);
    const arrivalInput = document.getElementById('patientArrivalTimeInput');
    if (arrivalInput) arrivalInput.value = isoLocal;

    // Reset priority to 3
    document.querySelectorAll('#pane-addPatient .priority-option').forEach(c => {
      c.classList.toggle('selected', c.getAttribute('data-level') === '3');
    });
    const prioInput = document.getElementById('selectedPriorityInput');
    if (prioInput) prioInput.value = '3';

    // Populate doctor dropdown
    this.populateDoctorDropdowns();

    // Clear inline errors
    document.querySelectorAll('.error-message').forEach(el => el.classList.remove('visible'));
    document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(el => el.classList.remove('input-error'));
  }

  populateDoctorDropdowns() {
    const selects = [
      document.getElementById('patientDoctorSelect'),
      document.getElementById('heroDoctorSelect')
    ];

    selects.forEach(select => {
      if (!select) return;
      const currentValue = select.value;
      select.innerHTML = '<option value="">-- First Available Doctor --</option>';
      this.doctors.forEach(doc => {
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = `${doc.name} (${doc.status}) - ${doc.specialty}`;
        if (doc.status !== DOCTOR_STATUS.AVAILABLE) {
          opt.textContent += " [Busy]";
        }
        select.appendChild(opt);
      });
      if (currentValue) {
        select.value = currentValue;
      }
    });
  }

  handleAddPatientSubmit() {
    const id = document.getElementById('patientIdInput').value.trim();
    const name = document.getElementById('patientNameInput').value.trim();
    const age = document.getElementById('patientAgeInput').value;
    const gender = document.getElementById('patientGenderSelect').value;
    const priority = Number(document.getElementById('selectedPriorityInput').value);
    const symptoms = document.getElementById('patientSymptomsInput').value.trim();
    const arrivalLocal = document.getElementById('patientArrivalTimeInput').value;
    const doctorId = document.getElementById('patientDoctorSelect').value || null;

    const arrivalTime = arrivalLocal ? new Date(arrivalLocal).toISOString() : new Date().toISOString();

    const validation = Patient.validate({ id, name, age, gender, priority, symptoms });
    if (!validation.isValid) {
      this.showValidationErrors(validation.errors);
      return;
    }

    const doctor = doctorId ? this.doctors.find(d => d.id === doctorId) : null;

    const newPatient = new Patient({
      id,
      name,
      age,
      gender,
      priority,
      symptoms,
      arrivalTime,
      status: PATIENT_STATUS.WAITING,
      doctorId: doctor ? doctor.id : null,
      doctorName: doctor ? doctor.name : null
    });

    // Enqueue into Binary Max-Heap Priority Queue: O(log n)
    this.priorityQueue.enqueue(newPatient);
    this.allPatients.unshift(newPatient);
    this.saveData();

    // Trigger audio feedback
    if (priority === 5) {
      window.soundEffects.playCriticalAlert();
      this.showToast("CRITICAL PATIENT (P5) ADMITTED", `${newPatient.name} with suspected life-threat enqueued at top priority.`, "danger");
    } else {
      window.soundEffects.playSuccessTone();
      this.showToast("Patient Enqueued", `${newPatient.name} added with Priority ${priority} (${PRIORITY_LEVELS[priority].name}).`, "success");
    }

    // Refresh and navigate to Waiting Queue
    this.setupAddPatientDefaults();
    this.renderAll();
    this.switchTab('queue');
  }

  showValidationErrors(errors) {
    // Clear previous errors
    document.querySelectorAll('.error-message').forEach(el => el.classList.remove('visible'));
    document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(el => el.classList.remove('input-error'));

    if (errors.name) {
      const err = document.getElementById('errorPatientName');
      const input = document.getElementById('patientNameInput');
      if (err) { err.textContent = errors.name; err.classList.add('visible'); }
      if (input) input.classList.add('input-error');
    }
    if (errors.age) {
      const err = document.getElementById('errorPatientAge');
      const input = document.getElementById('patientAgeInput');
      if (err) { err.textContent = errors.age; err.classList.add('visible'); }
      if (input) input.classList.add('input-error');
    }
    if (errors.symptoms) {
      const err = document.getElementById('errorPatientSymptoms');
      const input = document.getElementById('patientSymptomsInput');
      if (err) { err.textContent = errors.symptoms; err.classList.add('visible'); }
      if (input) input.classList.add('input-error');
    }
    this.showToast("Validation Error", "Please fill in all required fields marked in red.", "warning");
  }

  callNextPatient(specifiedDoctorId = null) {
    if (this.priorityQueue.isEmpty()) {
      this.showToast("Queue Empty", "No patients are currently waiting in the emergency queue.", "info");
      return;
    }

    // Resolve doctor: specified, or hero dropdown selection, or first available doctor
    let doctor = null;
    const heroDocSelect = document.getElementById('heroDoctorSelect');
    const selectedDocId = specifiedDoctorId || (heroDocSelect ? heroDocSelect.value : null);

    if (selectedDocId) {
      doctor = this.doctors.find(d => d.id === selectedDocId);
    }

    if (!doctor) {
      // Find first available doctor
      doctor = this.doctors.find(d => d.status === DOCTOR_STATUS.AVAILABLE);
    }

    if (!doctor) {
      // If all doctors are busy, inform staff
      const confirmOverride = confirm("All doctors are currently BUSY or OFF DUTY. Would you like to assign Dr. " + this.doctors[0].name + " anyway?");
      if (confirmOverride) {
        doctor = this.doctors[0];
      } else {
        this.showToast("No Available Doctors", "Please mark a doctor as Available or complete an active treatment first.", "warning");
        return;
      }
    }

    // Dequeue next patient from Priority Queue: O(log n)
    const nextPatient = this.priorityQueue.dequeue();
    if (!nextPatient) return;

    // Update patient status and treatment times
    const nowIso = new Date().toISOString();
    nextPatient.status = PATIENT_STATUS.BEING_TREATED;
    nextPatient.treatmentStartTime = nowIso;
    nextPatient.doctorId = doctor.id;
    nextPatient.doctorName = doctor.name;

    // Update doctor status
    doctor.status = DOCTOR_STATUS.BUSY;
    doctor.currentPatientId = nextPatient.id;

    // Update master patient list
    const pIndex = this.allPatients.findIndex(p => p.id === nextPatient.id);
    if (pIndex !== -1) {
      this.allPatients[pIndex] = nextPatient;
    }

    this.saveData();

    // Play hospital announcement chime
    window.soundEffects.playCallChime();

    this.showToast(
      "Next Patient Called",
      `Calling ${nextPatient.name} (P${nextPatient.priority}) for treatment with ${doctor.name}.`,
      "success"
    );

    this.renderAll();
  }

  completeTreatment(doctorId) {
    const doctor = this.doctors.find(d => d.id === doctorId);
    if (!doctor || !doctor.currentPatientId) {
      this.showToast("Error", "No active patient assigned to this doctor.", "warning");
      return;
    }

    const patient = this.allPatients.find(p => p.id === doctor.currentPatientId);
    if (patient) {
      patient.status = PATIENT_STATUS.COMPLETED;
      patient.treatmentEndTime = new Date().toISOString();
    }

    const patientName = patient ? patient.name : "Patient";
    const oldPatientId = doctor.currentPatientId;

    // Reset doctor status to Available
    doctor.status = DOCTOR_STATUS.AVAILABLE;
    doctor.currentPatientId = null;

    this.saveData();

    // Play pleasant completion tone
    window.soundEffects.playSuccessTone();

    // Check if there is another patient waiting
    const hasNext = !this.priorityQueue.isEmpty();
    const nextPt = this.priorityQueue.peek();

    if (hasNext && nextPt) {
      this.showToast(
        "Treatment Completed",
        `Dr. ${doctor.name} completed treatment for ${patientName}. Next up: ${nextPt.name} (P${nextPt.priority}).`,
        "info"
      );
    } else {
      this.showToast(
        "Treatment Completed",
        `Dr. ${doctor.name} completed treatment for ${patientName}. Doctor is now Available.`,
        "success"
      );
    }

    this.renderAll();
  }

  setDoctorStatus(doctorId, newStatus) {
    const doctor = this.doctors.find(d => d.id === doctorId);
    if (!doctor) return;

    if (newStatus === DOCTOR_STATUS.AVAILABLE && doctor.currentPatientId) {
      const confirmComplete = confirm(`Dr. ${doctor.name} currently has an active patient. Mark treatment as completed first?`);
      if (confirmComplete) {
        this.completeTreatment(doctorId);
        return;
      }
    }

    doctor.status = newStatus;
    if (newStatus === DOCTOR_STATUS.OFF_DUTY) {
      doctor.currentPatientId = null;
    }
    this.saveData();
    this.renderAll();
    this.showToast("Doctor Status Updated", `${doctor.name} is now ${newStatus}.`, "info");
  }

  openRetriageModal(patientId) {
    const patient = this.priorityQueue.findById(patientId);
    if (!patient) return;

    this.retriageTargetPatientId = patientId;
    document.getElementById('retriagePatientName').textContent = patient.name;
    document.getElementById('retriagePatientId').textContent = patient.id;
    document.getElementById('retriageSelectedLevel').value = patient.priority;
    document.getElementById('retriageNotesInput').value = '';

    document.querySelectorAll('#retriagePriorityGrid .priority-option').forEach(card => {
      card.classList.toggle('selected', card.getAttribute('data-level') == patient.priority);
    });

    this.openModal('retriageModal');
  }

  handleConfirmRetriage() {
    if (!this.retriageTargetPatientId) return;
    const newPriority = Number(document.getElementById('retriageSelectedLevel').value);
    const reason = document.getElementById('retriageNotesInput').value.trim();

    // Update patient inside Priority Queue and re-sift: O(log n)
    const updated = this.priorityQueue.update(this.retriageTargetPatientId, p => {
      p.priority = newPriority;
      if (reason) {
        p.notes = (p.notes ? p.notes + ' | ' : '') + `Re-triaged to P${newPriority}: ${reason}`;
      }
    });

    if (updated) {
      const pIdx = this.allPatients.findIndex(p => p.id === updated.id);
      if (pIdx !== -1) {
        this.allPatients[pIdx].priority = newPriority;
        if (reason) this.allPatients[pIdx].notes = updated.notes;
      }

      this.saveData();
      this.closeAllModals();

      if (newPriority === 5) {
        window.soundEffects.playCriticalAlert();
        this.showToast("Re-Triage: Critical Elevation", `${updated.name} elevated to Priority 5 (Critical)! Queue order dynamically updated.`, "danger");
      } else {
        window.soundEffects.playSuccessTone();
        this.showToast("Priority Updated", `${updated.name} re-triaged to Priority ${newPriority}. Binary heap re-balanced.`, "success");
      }

      this.renderAll();
    }
  }

  removePatientFromQueue(patientId) {
    const patient = this.priorityQueue.findById(patientId);
    if (!patient) return;

    if (confirm(`Are you sure you want to remove ${patient.name} (${patient.id}) from the waiting queue?`)) {
      this.priorityQueue.remove(patientId);
      this.allPatients = this.allPatients.filter(p => p.id !== patientId);
      this.saveData();
      this.showToast("Patient Removed", `${patient.name} removed from queue.`, "info");
      this.renderAll();
    }
  }

  openPatientDetails(patientId) {
    const patient = this.allPatients.find(p => p.id === patientId);
    if (!patient) return;

    const modalBody = document.getElementById('patientDetailsBody');
    const prioMeta = PRIORITY_LEVELS[patient.priority];
    const now = new Date();

    modalBody.innerHTML = `
      <div class="patient-profile-header">
        <div class="profile-main">
          <h2>${patient.name} <span style="font-size:14px; font-weight:normal; color:var(--text-muted);">(${patient.id})</span></h2>
          <p>${patient.age} yrs &bull; ${patient.gender} &bull; Admitted to ED</p>
        </div>
        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
          ${Formatters.renderPriorityBadge(patient.priority)}
          ${Formatters.renderStatusBadge(patient.status)}
        </div>
      </div>

      <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:10px; padding:16px; margin-bottom:18px;">
        <h4 style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px;">
          Chief Complaint & Triage Presentation
        </h4>
        <p style="font-size:14px; color:var(--text-main); font-weight:500;">${patient.symptoms}</p>
        ${patient.notes ? `<p style="margin-top:8px; font-size:12px; color:#475569; font-style:italic;"><i class="fas fa-file-medical-alt"></i> Notes: ${patient.notes}</p>` : ''}
      </div>

      <!-- Triage Vitals -->
      <h4 style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:8px;">
        Admission Vitals & Physiological Parameters
      </h4>
      <div class="vitals-grid">
        <div class="vital-box">
          <div class="vital-label">Heart Rate</div>
          <div class="vital-val" style="color:#ef4444;"><i class="fas fa-heartbeat"></i> ${patient.vitals?.hr || '76 bpm'}</div>
        </div>
        <div class="vital-box">
          <div class="vital-label">Blood Pressure</div>
          <div class="vital-val" style="color:#0284c7;"><i class="fas fa-tachometer-alt"></i> ${patient.vitals?.bp || '120/80 mmHg'}</div>
        </div>
        <div class="vital-box">
          <div class="vital-label">Oxygen Saturation</div>
          <div class="vital-val" style="color:#10b981;"><i class="fas fa-lungs"></i> ${patient.vitals?.spo2 || '98%'}</div>
        </div>
        <div class="vital-box">
          <div class="vital-label">Core Temperature</div>
          <div class="vital-val" style="color:#f59e0b;"><i class="fas fa-thermometer-half"></i> ${patient.vitals?.temp || '37.0 °C'}</div>
        </div>
      </div>

      <!-- Care Timeline -->
      <h4 style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-top:20px; margin-bottom:8px;">
        Clinical ED Timeline & Durations
      </h4>
      <div class="timeline-list">
        <div class="timeline-item">
          <span class="timeline-dot"></span>
          <div class="timeline-time">${Formatters.formatDateTime(patient.arrivalTime)}</div>
          <div class="timeline-title">Arrived at Triage Desk</div>
          <div style="font-size:12px; color:var(--text-secondary);">Triaged as ${prioMeta.name} (Priority ${prioMeta.level})</div>
        </div>
        ${patient.treatmentStartTime ? `
          <div class="timeline-item">
            <span class="timeline-dot" style="border-color:var(--warning);"></span>
            <div class="timeline-time">${Formatters.formatDateTime(patient.treatmentStartTime)}</div>
            <div class="timeline-title">Treatment Commenced by ${patient.doctorName || 'Doctor'}</div>
            <div style="font-size:12px; color:var(--text-secondary);">
              Waiting time in queue: <strong>${Formatters.formatDuration(patient.getWaitDurationMs(new Date(patient.treatmentStartTime)))}</strong>
            </div>
          </div>
        ` : `
          <div class="timeline-item">
            <span class="timeline-dot" style="border-color:#cbd5e1; background:#f1f5f9;"></span>
            <div class="timeline-time">Pending Doctor Assignment</div>
            <div class="timeline-title" style="color:var(--text-muted);">Currently waiting in Priority Queue</div>
            <div style="font-size:12px; color:var(--text-secondary);">
              Current wait time: <strong>${Formatters.formatDuration(patient.getWaitDurationMs(now))}</strong>
            </div>
          </div>
        `}
        ${patient.treatmentEndTime ? `
          <div class="timeline-item">
            <span class="timeline-dot" style="border-color:var(--success); background:#10b981;"></span>
            <div class="timeline-time">${Formatters.formatDateTime(patient.treatmentEndTime)}</div>
            <div class="timeline-title">Treatment Completed / Discharged</div>
            <div style="font-size:12px; color:var(--text-secondary);">
              Total treatment duration: <strong>${Formatters.formatDuration(patient.getTreatmentDurationMs())}</strong>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    this.openModal('patientDetailsModal');
  }

  handleAddDoctorSubmit() {
    const name = document.getElementById('docNameInput').value.trim();
    const specialty = document.getElementById('docSpecialtyInput').value.trim();
    const status = document.getElementById('docStatusSelect').value;

    if (!name || !specialty) {
      alert("Doctor name and specialization are required.");
      return;
    }

    const newDoc = new Doctor({
      id: `DOC-${100 + this.doctors.length + 1}`,
      name,
      specialty,
      status
    });

    this.doctors.push(newDoc);
    this.saveData();
    this.closeAllModals();
    document.getElementById('addDoctorForm').reset();
    this.showToast("Doctor Added", `${name} added to the ED medical staff roster.`, "success");
    this.renderAll();
  }

  openScenarioModal() {
    const modalBody = document.getElementById('scenarioModalBody');
    modalBody.innerHTML = `
      <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:10px; padding:18px; margin-bottom:20px;">
        <h4 style="color:#0369a1; font-size:15px; margin-bottom:6px; display:flex; align-items:center; gap:8px;">
          <i class="fas fa-microscope"></i> Required Test Scenario Specification
        </h4>
        <p style="color:#0c4a6e; font-size:13px; line-height:1.5;">
          Demonstrates that <strong>priority takes precedence over arrival time</strong>, and arrival time is strictly used as a tie-breaker when priorities are identical.
        </p>
      </div>

      <div style="margin-bottom:20px;">
        <h5 style="font-size:13px; text-transform:uppercase; color:var(--text-muted); margin-bottom:10px;">Arrival Timeline:</h5>
        <div style="display:flex; flex-direction:column; gap:10px;">
          <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:#ffffff; border:1px solid var(--border-color); border-radius:8px;">
            <div>
              <strong>Patient A</strong> &bull; Priority 3 (Urgent)
              <div style="font-size:12px; color:var(--text-muted);">Symptoms: Abdominal pain &bull; Arrival: 10:00</div>
            </div>
            <span class="priority-pill badge-urgent">P3 Urgent</span>
          </div>

          <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:#fff1f2; border:1px solid #fecdd3; border-radius:8px;">
            <div>
              <strong>Patient B</strong> &bull; Priority 5 (Critical)
              <div style="font-size:12px; color:var(--text-muted);">Symptoms: Acute chest pain &bull; Arrival: 10:05 (Later than A & C!)</div>
            </div>
            <span class="priority-pill badge-critical">P5 Critical</span>
          </div>

          <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:#ffffff; border:1px solid var(--border-color); border-radius:8px;">
            <div>
              <strong>Patient C</strong> &bull; Priority 3 (Urgent)
              <div style="font-size:12px; color:var(--text-muted);">Symptoms: Renal colic &bull; Arrival: 09:55 (Earliest arrival)</div>
            </div>
            <span class="priority-pill badge-urgent">P3 Urgent</span>
          </div>
        </div>
      </div>

      <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:10px; padding:16px;">
        <h4 style="color:#047857; font-size:14px; font-weight:700; margin-bottom:6px; display:flex; align-items:center; gap:8px;">
          <i class="fas fa-check-circle"></i> Resulting Priority Queue Treatment Order:
        </h4>
        <div style="display:flex; align-items:center; gap:10px; font-size:16px; font-weight:800; color:#065f46; margin:10px 0;">
          <span style="background:white; padding:6px 12px; border-radius:6px; border:1px solid #a7f3d0;">1. Patient B (P5)</span>
          <i class="fas fa-arrow-right" style="color:#059669;"></i>
          <span style="background:white; padding:6px 12px; border-radius:6px; border:1px solid #a7f3d0;">2. Patient C (P3, 09:55)</span>
          <i class="fas fa-arrow-right" style="color:#059669;"></i>
          <span style="background:white; padding:6px 12px; border-radius:6px; border:1px solid #a7f3d0;">3. Patient A (P3, 10:00)</span>
        </div>
        <p style="font-size:12.5px; color:#047857; margin-top:8px;">
          <strong>Why?</strong> Even though Patient B arrived last (10:05), their Priority 5 (Critical) outranks Priority 3.<br>
          Between Patient C and Patient A (both Priority 3), Patient C arrived earlier (09:55 vs 10:00), so C precedes A.
        </p>
      </div>
    `;

    this.openModal('scenarioModal');
  }

  applyScenarioData() {
    const scenarioPatients = StorageManager.getScenarioTrioPatients();
    
    // Clear queue and replace with Scenario Trio
    this.priorityQueue.clear();
    this.priorityQueue.heapify(scenarioPatients);

    // Keep completed / being treated patients intact, replace waiting patients
    this.allPatients = [
      ...scenarioPatients,
      ...this.allPatients.filter(p => p.status !== PATIENT_STATUS.WAITING)
    ];

    this.saveData();
    this.closeAllModals();
    this.showToast("Scenario Loaded", "Patient A, B, C successfully loaded into the priority queue.", "success");
    this.renderAll();
    this.switchTab('queue');
  }

  exportHistoryToCSV() {
    const headers = [
      "Patient ID", "Name", "Age", "Gender", "Priority Level", "Priority Name", 
      "Symptoms", "Status", "Arrival Time", "Treatment Start Time", 
      "Treatment End Time", "Physician", "Wait Time (Min)", "Treatment Duration (Min)"
    ];

    const rows = this.allPatients.map(p => {
      const waitMin = Math.round(p.getWaitDurationMs() / 60000);
      const treatMin = p.treatmentStartTime ? Math.round(p.getTreatmentDurationMs() / 60000) : 0;
      const prioMeta = PRIORITY_LEVELS[p.priority] || PRIORITY_LEVELS[1];
      return [
        `"${p.id}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        p.age,
        `"${p.gender}"`,
        p.priority,
        `"${prioMeta.name}"`,
        `"${(p.symptoms || '').replace(/"/g, '""')}"`,
        `"${p.status}"`,
        `"${p.arrivalTime}"`,
        `"${p.treatmentStartTime || ''}"`,
        `"${p.treatmentEndTime || ''}"`,
        `"${p.doctorName || 'Unassigned'}"`,
        waitMin,
        treatMin
      ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ED_Triage_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast("Report Exported", "Patient treatment history downloaded as CSV.", "info");
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  }

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.classList.remove('active');
    });
    this.retriageTargetPatientId = null;
  }

  showToast(title, message, type = 'info', actionText = null, actionCallback = null) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    else if (type === 'warning') iconClass = 'fa-exclamation-triangle';
    else if (type === 'danger') iconClass = 'fa-bell';

    toast.innerHTML = `
      <i class="fas ${iconClass} toast-icon"></i>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
        ${actionText ? `<button class="top-action-btn" style="margin-top:6px; padding:4px 8px; font-size:11px;" id="toastActionBtn">${actionText}</button>` : ''}
      </div>
      <i class="fas fa-times toast-close"></i>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });

    if (actionText && actionCallback) {
      toast.querySelector('#toastActionBtn')?.addEventListener('click', () => {
        actionCallback();
        toast.remove();
      });
    }

    container.appendChild(toast);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }
    }, 5000);
  }

  // ==============================================
  // RENDERING METHODS
  // ==============================================

  renderAll() {
    this.renderBadges();
    this.renderNextPatientHero();
    this.renderDashboard();
    this.renderQueueTable();
    this.renderDoctorsRoster();
    this.renderTreatmentHistory();
    this.renderHeapVisualizer();
    this.populateDoctorDropdowns();
  }

  renderBadges() {
    const waitingCount = this.priorityQueue.size();
    const availableDocs = this.doctors.filter(d => d.status === DOCTOR_STATUS.AVAILABLE).length;

    const queueBadge = document.getElementById('navQueueBadge');
    if (queueBadge) {
      queueBadge.textContent = waitingCount;
      const hasCritical = this.allPatients.some(p => p.status === PATIENT_STATUS.WAITING && p.priority === 5);
      queueBadge.className = `nav-badge ${hasCritical ? 'badge-red' : ''}`;
    }

    const docsBadge = document.getElementById('navDoctorsBadge');
    if (docsBadge) {
      docsBadge.textContent = `${availableDocs} Avail`;
    }
  }

  renderNextPatientHero() {
    const hero = document.getElementById('nextPatientHero');
    if (!hero) return;

    const nextPatient = this.priorityQueue.peek();

    if (!nextPatient) {
      hero.innerHTML = `
        <div class="hero-empty">
          <i class="fas fa-heartbeat"></i>
          <h3>No Patients Waiting in Emergency Queue</h3>
          <p>Triage intake is clear. New arrivals will be prioritized automatically using the Binary Max-Heap.</p>
          <button class="btn-primary" style="margin-top:14px;" onclick="app.switchTab('addPatient')">
            <i class="fas fa-user-plus"></i> Intake New Patient
          </button>
        </div>
      `;
      return;
    }

    const prioMeta = PRIORITY_LEVELS[nextPatient.priority];
    const availableDocs = this.doctors.filter(d => d.status === DOCTOR_STATUS.AVAILABLE);
    const now = new Date();
    const waitTimeFormatted = Formatters.formatDuration(nextPatient.getWaitDurationMs(now));

    hero.innerHTML = `
      <div class="hero-header">
        <div class="hero-label">
          <i class="fas fa-bell"></i>
          <span>Next Patient to Treat (Queue Root #1)</span>
          <span class="hero-badge-live">Heap Max</span>
        </div>
        <div>
          ${Formatters.renderPriorityBadge(nextPatient.priority)}
        </div>
      </div>

      <div class="hero-content">
        <div class="hero-patient-info">
          <div class="hero-avatar">
            <i class="fas fa-user-injured"></i>
          </div>
          <div class="hero-details">
            <h3>
              ${nextPatient.name}
              <span style="font-size:14px; font-weight:normal; color:#94a3b8;">(${nextPatient.id})</span>
            </h3>
            <p><i class="fas fa-notes-medical" style="color:#38bdf8;"></i> ${nextPatient.symptoms}</p>
            <div class="hero-meta-tags">
              <span><i class="fas fa-user"></i> ${nextPatient.age} yrs &bull; ${nextPatient.gender}</span>
              <span><i class="fas fa-clock"></i> Arrived: ${Formatters.formatTime(nextPatient.arrivalTime)}</span>
              <span><i class="fas fa-stopwatch"></i> Waiting: <strong data-patient-wait-id="${nextPatient.id}" style="color:white;">${waitTimeFormatted}</strong></span>
            </div>
          </div>
        </div>

        <div class="hero-actions">
          <div class="doctor-select-wrapper">
            <label for="heroDoctorSelect"><i class="fas fa-user-md"></i> Assign Physician:</label>
            <select class="hero-doctor-select" id="heroDoctorSelect">
              ${availableDocs.length > 0 ? '' : '<option value="">All Doctors Busy (Override)</option>'}
              ${this.doctors.map(d => `
                <option value="${d.id}" ${d.status === DOCTOR_STATUS.AVAILABLE ? 'selected' : ''}>
                  ${d.name} (${d.status})
                </option>
              `).join('')}
            </select>
          </div>

          <button class="btn-call-next" id="btnHeroCallNext">
            <i class="fas fa-bullhorn"></i>
            <span>Call Next Patient</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btnHeroCallNext')?.addEventListener('click', () => {
      this.callNextPatient();
    });
  }

  renderDashboard() {
    const waitingPatients = this.allPatients.filter(p => p.status === PATIENT_STATUS.WAITING);
    const criticalWaiting = waitingPatients.filter(p => p.priority === 5);
    const treatingPatients = this.allPatients.filter(p => p.status === PATIENT_STATUS.BEING_TREATED);
    const completedPatients = this.allPatients.filter(p => p.status === PATIENT_STATUS.COMPLETED);
    const availableDocs = this.doctors.filter(d => d.status === DOCTOR_STATUS.AVAILABLE);

    // Calculate Average Wait Time (in minutes) for all waiting and completed patients today
    let totalWaitMs = 0;
    let countWait = 0;
    const now = new Date();

    waitingPatients.forEach(p => {
      totalWaitMs += p.getWaitDurationMs(now);
      countWait++;
    });
    completedPatients.forEach(p => {
      totalWaitMs += p.getWaitDurationMs();
      countWait++;
    });

    const avgWaitMinutes = countWait > 0 ? Math.round((totalWaitMs / countWait) / 60000) : 0;

    // Stat Cards
    document.getElementById('statWaitingCount').textContent = waitingPatients.length;
    document.getElementById('statCriticalCount').textContent = criticalWaiting.length;
    document.getElementById('statTreatingCount').textContent = treatingPatients.length;
    document.getElementById('statDoctorsCount').textContent = `${availableDocs.length} / ${this.doctors.length}`;
    document.getElementById('statCompletedCount').textContent = completedPatients.length;
    document.getElementById('statAvgWaitTime').textContent = `${avgWaitMinutes}m`;

    // Priority Spectrum breakdown
    for (let prio = 1; prio <= 5; prio++) {
      const cnt = waitingPatients.filter(p => p.priority === prio).length;
      const el = document.getElementById(`prioCount${prio}`);
      if (el) el.textContent = cnt;
    }

    // Active Treatment Bays List on Dashboard
    const baysList = document.getElementById('dashboardActiveTreatmentsList');
    if (baysList) {
      if (treatingPatients.length === 0) {
        baysList.innerHTML = `
          <div style="text-align:center; padding:20px; color:var(--text-muted);">
            <i class="fas fa-bed" style="font-size:24px; margin-bottom:6px; display:block;"></i>
            <span>All treatment bays are currently empty.</span>
          </div>
        `;
      } else {
        baysList.innerHTML = treatingPatients.map(pt => {
          const doc = this.doctors.find(d => d.id === pt.doctorId);
          const treatDuration = Formatters.formatDuration(pt.getTreatmentDurationMs(now));
          return `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; border:1px solid var(--border-color); border-radius:8px; margin-bottom:10px; background:white;">
              <div>
                <div style="font-weight:700; font-size:14px; color:var(--text-main);">
                  ${pt.name} <span style="font-size:12px; font-weight:normal; color:var(--text-muted);">(${pt.id})</span>
                </div>
                <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">
                  <i class="fas fa-user-md" style="color:var(--primary);"></i> ${doc ? doc.name : 'Doctor'} &bull;
                  <span style="color:#d97706;"><i class="fas fa-stopwatch"></i> <span data-patient-treating-id="${pt.id}">${treatDuration}</span></span>
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                ${Formatters.renderPriorityBadge(pt.priority)}
                <button class="btn-icon btn-treat" title="Complete Treatment" onclick="app.completeTreatment('${pt.doctorId}')">
                  <i class="fas fa-check"></i>
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Queue Head Preview Table (Top 4)
    const previewBody = document.getElementById('dashboardQueuePreviewTable');
    if (previewBody) {
      const topPatients = this.priorityQueue.toArrayInOrder().slice(0, 4);
      if (topPatients.length === 0) {
        previewBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center; padding:20px; color:var(--text-muted);">
              No patients waiting.
            </td>
          </tr>
        `;
      } else {
        previewBody.innerHTML = topPatients.map((p, idx) => `
          <tr>
            <td><span class="queue-rank ${idx === 0 ? 'rank-1' : ''}">#${idx + 1}</span></td>
            <td>${Formatters.renderPriorityBadge(p.priority)}</td>
            <td>
              <strong>${p.name}</strong>
              <div style="font-size:11px; color:var(--text-muted);">${p.id} &bull; ${p.symptoms.substring(0, 30)}...</div>
            </td>
            <td><span data-patient-wait-id="${p.id}">${Formatters.formatDuration(p.getWaitDurationMs(now))}</span></td>
            <td>
              <button class="top-action-btn" style="padding:4px 8px; font-size:11px;" onclick="app.openPatientDetails('${p.id}')">
                Details
              </button>
            </td>
          </tr>
        `).join('');
      }
    }

    const activeBaysCounter = document.getElementById('activeBaysCounter');
    if (activeBaysCounter) {
      activeBaysCounter.textContent = `${treatingPatients.length} Active`;
    }
  }

  renderQueueTable() {
    const tbody = document.getElementById('waitingQueueTableBody');
    if (!tbody) return;

    // Get ordered patient list from Priority Queue: O(n log n)
    let orderedPatients = this.priorityQueue.toArrayInOrder();

    // Priority Filter
    if (this.queueFilterPrio !== 'all') {
      const filterLevel = Number(this.queueFilterPrio);
      orderedPatients = orderedPatients.filter(p => p.priority === filterLevel);
    }

    // Search Query Filter
    if (this.queueSearchQuery) {
      orderedPatients = orderedPatients.filter(p => 
        p.id.toLowerCase().includes(this.queueSearchQuery) ||
        p.name.toLowerCase().includes(this.queueSearchQuery) ||
        p.symptoms.toLowerCase().includes(this.queueSearchQuery)
      );
    }

    const counter = document.getElementById('queueTotalCounter');
    if (counter) {
      counter.textContent = `${this.priorityQueue.size()} Waiting`;
    }

    if (orderedPatients.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:32px; color:var(--text-muted);">
            <i class="fas fa-inbox" style="font-size:32px; margin-bottom:8px; display:block;"></i>
            No patients match current queue filters.
          </td>
        </tr>
      `;
      return;
    }

    const now = new Date();

    tbody.innerHTML = orderedPatients.map((patient, index) => {
      const isCritical = patient.priority === 5;
      const waitTime = Formatters.formatDuration(patient.getWaitDurationMs(now));
      const doctor = patient.doctorId ? this.doctors.find(d => d.id === patient.doctorId) : null;

      return `
        <tr class="${isCritical ? 'row-critical' : ''}">
          <td>
            <span class="queue-rank ${index === 0 ? 'rank-1' : ''}" title="Treatment Order #${index + 1}">
              ${index === 0 ? '★ 1' : index + 1}
            </span>
          </td>
          <td>
            <strong>${patient.name}</strong>
            <div style="font-size:11px; color:var(--text-muted); font-family:monospace;">${patient.id}</div>
          </td>
          <td>
            ${Formatters.renderPriorityBadge(patient.priority)}
          </td>
          <td>
            ${patient.age} yrs &bull; ${patient.gender}
          </td>
          <td style="max-width: 260px;">
            <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${patient.symptoms}">
              ${patient.symptoms}
            </div>
          </td>
          <td>
            <span style="font-family:monospace; font-size:12px;">${Formatters.formatTime(patient.arrivalTime)}</span>
          </td>
          <td>
            <strong data-patient-wait-id="${patient.id}" style="color:${isCritical ? 'var(--prio-5-red)' : 'var(--text-main)'}">
              ${waitTime}
            </strong>
          </td>
          <td>
            ${doctor ? `<span style="font-size:12px; color:var(--primary);"><i class="fas fa-user-md"></i> ${doctor.name}</span>` : '<span style="color:var(--text-muted); font-size:12px;">Any Available</span>'}
          </td>
          <td style="text-align: right;">
            <div class="table-actions" style="justify-content: flex-end;">
              ${index === 0 ? `
                <button class="btn-icon btn-treat" title="Call for Treatment" onclick="app.callNextPatient()">
                  <i class="fas fa-bullhorn"></i>
                </button>
              ` : `
                <button class="btn-icon" title="Call Direct" onclick="app.callSpecificPatient('${patient.id}')">
                  <i class="fas fa-play"></i>
                </button>
              `}
              <button class="btn-icon btn-retriage" title="Re-Triage Urgency" onclick="app.openRetriageModal('${patient.id}')">
                <i class="fas fa-exchange-alt"></i>
              </button>
              <button class="btn-icon" title="Clinical Details" onclick="app.openPatientDetails('${patient.id}')">
                <i class="fas fa-eye"></i>
              </button>
              <button class="btn-icon" title="Remove from Queue" style="color:var(--danger);" onclick="app.removePatientFromQueue('${patient.id}')">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  callSpecificPatient(patientId) {
    const patient = this.priorityQueue.remove(patientId);
    if (!patient) return;

    const availableDoc = this.doctors.find(d => d.status === DOCTOR_STATUS.AVAILABLE) || this.doctors[0];
    const nowIso = new Date().toISOString();

    patient.status = PATIENT_STATUS.BEING_TREATED;
    patient.treatmentStartTime = nowIso;
    patient.doctorId = availableDoc.id;
    patient.doctorName = availableDoc.name;

    availableDoc.status = DOCTOR_STATUS.BUSY;
    availableDoc.currentPatientId = patient.id;

    const pIdx = this.allPatients.findIndex(p => p.id === patient.id);
    if (pIdx !== -1) {
      this.allPatients[pIdx] = patient;
    }

    this.saveData();
    window.soundEffects.playCallChime();
    this.showToast("Patient Called", `Directly admitted ${patient.name} with ${availableDoc.name}.`, "success");
    this.renderAll();
  }

  renderDoctorsRoster() {
    const grid = document.getElementById('doctorsRosterGrid');
    if (!grid) return;

    const now = new Date();

    grid.innerHTML = this.doctors.map(doc => {
      const currentPatient = doc.currentPatientId ? this.allPatients.find(p => p.id === doc.currentPatientId) : null;
      const isBusy = doc.status === DOCTOR_STATUS.BUSY;
      const treatDuration = currentPatient ? Formatters.formatDuration(currentPatient.getTreatmentDurationMs(now)) : "0m";

      return `
        <div class="doctor-card">
          <div class="doctor-card-top">
            <div class="doctor-profile">
              <div class="doctor-avatar-circle">${doc.avatar}</div>
              <div class="doctor-meta">
                <h4>${doc.name}</h4>
                <span>${doc.specialty}</span>
              </div>
            </div>
            ${Formatters.renderDoctorStatusBadge(doc.status)}
          </div>

          <div class="doctor-current-patient">
            <div class="current-pt-header">
              <span>Current Assignment</span>
              ${currentPatient ? `<span data-patient-treating-id="${currentPatient.id}" style="color:#d97706; font-weight:700;"><i class="fas fa-stopwatch"></i> ${treatDuration}</span>` : ''}
            </div>
            ${currentPatient ? `
              <div class="current-pt-body">
                <div class="pt-name-id">
                  <h5>${currentPatient.name}</h5>
                  <span>${currentPatient.id} &bull; ${Formatters.formatTime(currentPatient.treatmentStartTime)}</span>
                </div>
                ${Formatters.renderPriorityBadge(currentPatient.priority)}
              </div>
            ` : `
              <div style="color:var(--text-muted); font-size:12.5px; padding:6px 0;">
                <i class="fas fa-bed"></i> No patient currently assigned.
              </div>
            `}
          </div>

          <div class="doctor-card-actions">
            ${isBusy ? `
              <button class="btn-complete-treatment" onclick="app.completeTreatment('${doc.id}')">
                <i class="fas fa-check-circle"></i> Complete Treatment
              </button>
            ` : `
              <select class="status-dropdown" onchange="app.setDoctorStatus('${doc.id}', this.value)" style="width: 100%;">
                <option value="Available" ${doc.status === 'Available' ? 'selected' : ''}>Set Available</option>
                <option value="Busy" ${doc.status === 'Busy' ? 'selected' : ''}>Set Busy</option>
                <option value="Off Duty" ${doc.status === 'Off Duty' ? 'selected' : ''}>Set Off Duty</option>
              </select>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  renderTreatmentHistory() {
    const tbody = document.getElementById('treatmentHistoryTableBody');
    if (!tbody) return;

    let records = [...this.allPatients];

    // Status Filter
    if (this.historyFilterStatus !== 'all') {
      records = records.filter(p => p.status === this.historyFilterStatus);
    }

    // Priority Filter
    if (this.historyFilterPriority !== 'all') {
      records = records.filter(p => p.priority === Number(this.historyFilterPriority));
    }

    // Text Search
    if (this.historySearchQuery) {
      records = records.filter(p => 
        p.id.toLowerCase().includes(this.historySearchQuery) ||
        p.name.toLowerCase().includes(this.historySearchQuery) ||
        (p.doctorName && p.doctorName.toLowerCase().includes(this.historySearchQuery)) ||
        p.symptoms.toLowerCase().includes(this.historySearchQuery)
      );
    }

    const countEl = document.getElementById('historyMatchCount');
    if (countEl) {
      countEl.textContent = `Showing ${records.length} of ${this.allPatients.length} records`;
    }

    if (records.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align:center; padding:32px; color:var(--text-muted);">
            No patient records match the selected criteria.
          </td>
        </tr>
      `;
      return;
    }

    const now = new Date();

    tbody.innerHTML = records.map(patient => {
      const waitTime = Formatters.formatDuration(patient.getWaitDurationMs(now));

      return `
        <tr>
          <td><strong style="font-family:monospace;">${patient.id}</strong></td>
          <td>
            <strong>${patient.name}</strong>
            <div style="font-size:11px; color:var(--text-muted);">${patient.age} yrs &bull; ${patient.gender}</div>
          </td>
          <td>${Formatters.renderPriorityBadge(patient.priority)}</td>
          <td>${Formatters.renderStatusBadge(patient.status)}</td>
          <td><span style="font-family:monospace; font-size:12px;">${Formatters.formatTime(patient.arrivalTime)}</span></td>
          <td><span style="font-family:monospace; font-size:12px;">${Formatters.formatTime(patient.treatmentStartTime)}</span></td>
          <td><span style="font-family:monospace; font-size:12px;">${Formatters.formatTime(patient.treatmentEndTime)}</span></td>
          <td>${patient.doctorName ? `<span style="color:var(--primary); font-size:12px;"><i class="fas fa-user-md"></i> ${patient.doctorName}</span>` : '<span style="color:var(--text-muted);">--</span>'}</td>
          <td><strong style="font-size:12px;">${waitTime}</strong></td>
          <td>
            <button class="top-action-btn" style="padding:4px 8px; font-size:11.5px;" onclick="app.openPatientDetails('${patient.id}')">
              <i class="fas fa-file-medical"></i> View
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderHeapVisualizer() {
    const rawHeap = this.priorityQueue.getRawHeap();
    const cellsContainer = document.getElementById('heapArrayCellsContainer');
    const nodesCounter = document.getElementById('heapNodesCount');

    if (nodesCounter) {
      nodesCounter.textContent = `${rawHeap.length} Heap Nodes`;
    }

    if (cellsContainer) {
      if (rawHeap.length === 0) {
        cellsContainer.innerHTML = '<span style="color:var(--text-muted); font-size:13px;">Heap is empty.</span>';
      } else {
        cellsContainer.innerHTML = rawHeap.map((p, idx) => {
          const prioMeta = PRIORITY_LEVELS[p.priority];
          return `
            <div class="heap-cell" style="border-top: 3px solid ${prioMeta.color};">
              <div class="cell-index">[${idx}]</div>
              <div class="cell-id">${p.id}</div>
              <div class="cell-prio" style="color:${prioMeta.color};">P${p.priority}</div>
            </div>
          `;
        }).join('');
      }
    }

    // Render Canvas Tree
    this.drawHeapTree(rawHeap);
  }

  drawHeapTree(heap) {
    const canvas = document.getElementById('heapTreeCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (heap.length === 0) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Heap tree is empty. Add patients to visualize tree hierarchy.", width / 2, height / 2);
      return;
    }

    // Calculate node coordinates using level-order binary tree layout
    const coords = [];
    const maxLevels = Math.floor(Math.log2(heap.length)) + 1;
    const levelHeight = Math.min(75, (height - 60) / Math.max(1, maxLevels));

    for (let i = 0; i < heap.length; i++) {
      const level = Math.floor(Math.log2(i + 1));
      const indexInLevel = i - (Math.pow(2, level) - 1);
      const totalInLevel = Math.pow(2, level);
      const levelWidth = width / (totalInLevel + 1);
      const x = levelWidth * (indexInLevel + 1);
      const y = 45 + level * levelHeight;
      coords.push({ x, y });
    }

    // 1. Draw connecting branch lines
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#cbd5e1";

    for (let i = 0; i < heap.length; i++) {
      const leftChild = 2 * i + 1;
      const rightChild = 2 * i + 2;

      if (leftChild < heap.length) {
        ctx.beginPath();
        ctx.moveTo(coords[i].x, coords[i].y);
        ctx.lineTo(coords[leftChild].x, coords[leftChild].y);
        ctx.stroke();
      }

      if (rightChild < heap.length) {
        ctx.beginPath();
        ctx.moveTo(coords[i].x, coords[i].y);
        ctx.lineTo(coords[rightChild].x, coords[rightChild].y);
        ctx.stroke();
      }
    }

    // 2. Draw circular nodes
    const nodeRadius = 22;
    for (let i = 0; i < heap.length; i++) {
      const patient = heap[i];
      const { x, y } = coords[i];
      const prioMeta = PRIORITY_LEVELS[patient.priority];

      // Outer circle
      ctx.beginPath();
      ctx.arc(x, y, nodeRadius, 0, 2 * Math.PI);
      ctx.fillStyle = prioMeta.bgLight;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = prioMeta.color;
      ctx.stroke();

      // Node text
      ctx.fillStyle = prioMeta.color;
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(patient.id, x, y - 4);

      ctx.fillStyle = "#475569";
      ctx.font = "9px sans-serif";
      ctx.fillText(`P${patient.priority}`, x, y + 8);
    }
  }
}

// Global App Initialization
document.addEventListener('DOMContentLoaded', () => {
  window.app = new HospitalEDApp();
  window.app.init();
});
