# 🏥 Hospital Emergency Department Priority Queue System (TriageFlow ED)

A modern, responsive, clinical-grade web application for managing patients in a hospital Emergency Department (ED) powered by an authentic **Binary Max-Heap Priority Queue**.

---

## ⚡ Core Triage Rule & Priority Queue Logic

Patients are triaged and ordered for treatment according to strict clinical rules:

1. **Rule 1 (Urgency First)**: A patient with a higher emergency priority is always treated before a patient with a lower priority.
2. **Rule 2 (FIFO Tie-Breaker)**: If two or more patients have the same priority level, the patient who arrived earlier is treated first (First-Come, First-Served within the priority tier).
3. **Rule 3 (Deterministic Tie-Breaker)**: If both priority and arrival time are identical, the Patient ID serves as a deterministic tie-breaker.
4. **Immediate Next Patient Identification**: The patient at the root of the Binary Max-Heap (`peek()`) is identified in **$O(1)$** time.

### 5-Level Priority Spectrum

| Priority | Name | Color Indicator | Clinical Presentation Guidelines | Target Response Time |
| :---: | :---: | :---: | :--- | :---: |
| **5** | **Critical** | 🔴 **Red** (`#EF4444`) | Immediate life-threat (cardiac arrest, massive trauma, STEMI, shock) | Immediate (0m) |
| **4** | **Very Urgent** | 🟠 **Orange** (`#F97316`) | Severe pain, acute neurological change, unstable fracture | &le; 15 mins |
| **3** | **Urgent** | 🟡 **Yellow** (`#EAB308`) | Moderate distress, suspected appendicitis, asthma flare | &le; 30 mins |
| **2** | **Less Urgent** | 🔵 **Blue** (`#3B82F6`) | Low acuity, stable vitals, closed sprain, mild infection | &le; 60 mins |
| **1** | **Non-Urgent** | 🟢 **Green** (`#10B981`) | Minor non-acute conditions, prescription refill, sutures | &le; 120 mins |

---

## 🧪 Specification Scenario Demonstration

The application demonstrates this exact scenario:

* **Patient A** arrives at **10:00** with **Priority 3** (Urgent).
* **Patient B** arrives at **10:05** with **Priority 5** (Critical).
* **Patient C** arrives at **09:55** with **Priority 3** (Urgent).

### Resulting Treatment Order:
$$\text{Patient B (P5)} \longrightarrow \text{Patient C (P3, 09:55)} \longrightarrow \text{Patient A (P3, 10:00)}$$

> **Why?**
> - **Patient B** has Priority 5, which takes absolute precedence over Priority 3, even though Patient B arrived last (10:05).
> - Between **Patient C** and **Patient A**, both share Priority 3. Therefore, arrival time breaks the tie: Patient C arrived at 09:55 (earlier than 10:00), so Patient C is treated before Patient A.

*Click the **"Run Scenario Demo"** button in the sidebar to verify this live with a single click!*

---

## 🚀 How to Run the Application

The application is completely self-contained with no external build tools or runtime installation required.

### Option 1: Direct Browser Launch
Simply double-click `index.html` or open `index.html` in Google Chrome, Microsoft Edge, Firefox, or Safari:
```powershell
Start-Process "index.html"
```

### Option 2: Built-in Lightweight Local Server
Run the included PowerShell server script:
```powershell
powershell -ExecutionPolicy Bypass -File .\start-server.ps1 -OpenBrowser
```
The server will start at `http://localhost:5000/` and automatically launch your browser.

---

## 📐 Data Structure & Algorithmic Complexity

Instead of repeatedly sorting the entire array with $O(n \log n)$ array sorts on every change, the waiting queue is managed using a true **Binary Max-Heap** (`PriorityQueue` class in `js/priorityQueue.js`):

- **Internal Representation**: Array `[0 ... n-1]` where for index $i$:
  - Parent: $\lfloor (i - 1) / 2 \rfloor$
  - Left Child: $2i + 1$
  - Right Child: $2i + 2$
- **Heap Invariant**: $\forall i > 0, \text{precedence}(heap[\text{parent}(i)]) \ge \text{precedence}(heap[i])$.
- **Enqueue (Intake)**: Appends to end and sifts up (`_bubbleUp`). **$O(\log n)$**
- **Dequeue (Call Next Patient)**: Swaps root with last element, pops, and sifts down (`_bubbleDown`). **$O(\log n)$**
- **Peek (Next Patient)**: Returns root `heap[0]` without removal. **$O(1)$**
- **Arbitrary Removal / Cancel**: Finds index and restores heap invariant. **$O(n)$ search + $O(\log n)$ sift**
- **Re-Triage (Priority Update)**: Updates priority in-place and bubbles up/down as needed. **$O(\log n)$ sift**
- **Heapify**: Builds heap from arbitrary array in-place. **$O(n)$**

---

## 🖥️ Application Features & Pages

1. **Dashboard**:
   - **Key Metric Cards**: Total Waiting, Critical (P5) with pulsating alert, Currently Being Treated, Available Doctors, Completed Treatments, Average Wait Time.
   - **Prominent "Next Patient to Treat" Hero Section**: Real-time display of queue root with physician assignment dropdown and **"Call Next Patient"** action button.
   - **Priority Spectrum Breakdown**: Visual cards for P5 (Red), P4 (Orange), P3 (Yellow), P2 (Blue), P1 (Green).
   - **Active Bays**: Shows patients currently being treated with real-time timers and one-click "Complete Treatment".
   - **Queue Head Preview**: Fast view of the next patients in line.
   - **Live Hospital Digital Clock**: Synchronized ticking clock and date.
2. **Waiting Queue**:
   - Ranked list showing queue position (#1 NEXT, #2, #3...).
   - Priority badges, chief complaint, arrival timestamp, and real-time wait duration counter.
   - Actions: Direct call, **Re-Triage** urgency (dynamically re-balances heap), Patient Clinical Profile modal, Remove patient.
   - Priority filter tabs (All, P5, P4, P3, P2, P1) and live search bar.
3. **Add Patient (Intake & Triage)**:
   - Form fields: Auto-generated Patient ID (`P-111`), Name, Age, Gender, 5-level interactive Priority selector, Symptoms textarea, customizable Arrival Time, and Optional Assigned Doctor.
   - Inline validation and clear error feedback.
   - **1-Click Clinical Presets**:
     - *P5: STEMI Chest Pain*
     - *P4: Blunt Head Trauma*
     - *P3: Acute Appendicitis*
     - *P2: Ankle Fracture*
     - *P1: Prescription Refill*
4. **Doctor Management**:
   - Physician roster cards displaying Doctor ID, Name, Specialization, and Status (`Available`, `Busy`, `Off Duty`).
   - Active patient card with duration timer.
   - **"Complete Treatment"** action that discharges patient, marks doctor as `Available`, and prompts to call the next patient.
   - "Add Doctor" modal to expand the ED team.
5. **Treatment History & Patient Directory**:
   - Comprehensive searchable and filterable directory of all patients across statuses.
   - Displays Arrival Time, Treatment Start Time, Treatment Completion Time, Doctor, Total Wait Time, and Treatment Duration.
   - **Export to CSV** and **Print Clinical Report**.
6. **Binary Heap Structure Visualizer**:
   - Real-time HTML5 Canvas interactive tree rendering showing parent-child links and node urgency.
   - Array level-order memory representation `[0 ... n-1]`.
7. **Audio & Notifications**:
   - Synthesized Web Audio API **Hospital Chime** on calling next patient.
   - **Critical Patient Urgent Alert Tone** on P5 arrival.
   - Toast notifications with action triggers.

---

## 🧪 Automated Unit & End-to-End Tests

The repository includes both unit tests and end-to-end browser tests that run via Headless Chrome or Edge:

### 1. Run Priority Queue Unit Tests:
```powershell
powershell -ExecutionPolicy Bypass -File .\tests\run.ps1
```
*Tests empty queue handling, priority ordering, arrival-time FIFO tie-breaking, deterministic ID fallback, arbitrary removal, re-triage, and the exact Patient A, B, C scenario (16/16 Passed).*

### 2. Run End-to-End Functional Tests:
```powershell
powershell -ExecutionPolicy Bypass -File .\tests\run-e2e.ps1
```
*Tests UI rendering, queue state, doctor assignments, treatment completion lifecycle, scenario loading, and heap updates (20/20 Passed).*

---

## 📁 Project Structure

```
├── index.html              # Main Responsive Single Page Application shell
├── start-server.ps1        # Optional lightweight static HTTP server (PowerShell)
├── README.md               # Documentation and algorithmic breakdown
├── css/
│   └── style.css           # Modern clinical UI design system & responsive styling
├── js/
│   ├── priorityQueue.js    # Binary Max-Heap Priority Queue implementation
│   ├── models.js           # Patient, Doctor, Priority Levels, and formatters
│   ├── storage.js          # LocalStorage persistence, sample data & scenario generator
│   ├── sound.js            # Web Audio API hospital chimes and alert synthesizer
│   └── app.js              # Application controller, state management & UI rendering
└── tests/
    ├── test-pq.js          # Priority queue unit test suite
    ├── test-runner.html    # Browser-based unit test runner
    ├── run.ps1             # Automated unit test CLI runner
    ├── test-e2e.html       # End-to-end UI functional test suite
    └── run-e2e.ps1         # Automated E2E test CLI runner
```
