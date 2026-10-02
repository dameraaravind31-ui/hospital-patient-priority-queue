/**
 * PriorityQueue.js
 * 
 * An efficient Binary Max-Heap implementation of a Priority Queue designed for
 * Hospital Emergency Department (ED) triage management.
 * 
 * Priority & Triage Rules:
 * 1. Higher numerical priority (5 = Critical, down to 1 = Non-Urgent) is treated first.
 * 2. If priorities are equal, earlier arrival time is treated first (First-Come, First-Served within tier).
 * 3. Deterministic tie-breaker: Patient ID (alphabetical/numerical) if both priority and arrival time match.
 * 
 * Time Complexities:
 * - Enqueue: O(log n)
 * - Dequeue (Extract Max): O(log n)
 * - Peek (Next Patient): O(1)
 * - Remove arbitrary patient: O(n) search + O(log n) sift
 * - Heapify (Build Heap): O(n)
 * - Size / IsEmpty: O(1)
 */

class PriorityQueue {
  /**
   * @param {Function} [customComparator] - Optional custom comparator
   */
  constructor(customComparator = null) {
    /** @type {Array<Object>} The internal binary heap array representation */
    this.heap = [];
    this.comparator = customComparator || PriorityQueue.defaultComparator;
  }

  /**
   * Default hospital triage comparator.
   * Returns:
   *  < 0 if patientA has HIGHER precedence than patientB (should be treated earlier)
   *  > 0 if patientB has HIGHER precedence than patientA (should be treated earlier)
   *    0 if identical
   * 
   * @param {Object} patientA 
   * @param {Object} patientB 
   * @returns {number}
   */
  static defaultComparator(patientA, patientB) {
    if (!patientA && !patientB) return 0;
    if (!patientA) return 1;
    if (!patientB) return -1;

    // Rule 1: Higher priority level first (5 > 4 > 3 > 2 > 1)
    const prioA = Number(patientA.priority) || 1;
    const prioB = Number(patientB.priority) || 1;
    if (prioA !== prioB) {
      return prioB - prioA; // If prioA > prioB, result is negative -> A has higher precedence
    }

    // Rule 2: Earlier arrival time first (FIFO within the same priority level)
    const timeA = new Date(patientA.arrivalTime).getTime();
    const timeB = new Date(patientB.arrivalTime).getTime();
    if (timeA !== timeB) {
      return timeA - timeB; // If timeA < timeB, result is negative -> A has higher precedence
    }

    // Rule 3: Deterministic tie-breaker using Patient ID
    const idA = String(patientA.id || '');
    const idB = String(patientB.id || '');
    return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
  }

  /**
   * Helper: tests if item at indexA has higher precedence than item at indexB
   */
  _hasHigherPrecedence(indexA, indexB) {
    return this.comparator(this.heap[indexA], this.heap[indexB]) < 0;
  }

  /**
   * Swaps elements at index i and index j
   */
  _swap(i, j) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }

  /**
   * Parent index of node at index i
   */
  _parentIndex(i) {
    return Math.floor((i - 1) / 2);
  }

  /**
   * Left child index of node at index i
   */
  _leftChildIndex(i) {
    return 2 * i + 1;
  }

  /**
   * Right child index of node at index i
   */
  _rightChildIndex(i) {
    return 2 * i + 2;
  }

  /**
   * Sifts an element up the heap to its proper position.
   * O(log n)
   */
  _bubbleUp(startIndex) {
    let index = startIndex;
    while (index > 0) {
      const parent = this._parentIndex(index);
      if (this._hasHigherPrecedence(index, parent)) {
        this._swap(index, parent);
        index = parent;
      } else {
        break;
      }
    }
  }

  /**
   * Sifts an element down the heap to its proper position.
   * O(log n)
   */
  _bubbleDown(startIndex) {
    let index = startIndex;
    const length = this.heap.length;

    while (true) {
      let highestPriorityIndex = index;
      const leftChild = this._leftChildIndex(index);
      const rightChild = this._rightChildIndex(index);

      if (leftChild < length && this._hasHigherPrecedence(leftChild, highestPriorityIndex)) {
        highestPriorityIndex = leftChild;
      }

      if (rightChild < length && this._hasHigherPrecedence(rightChild, highestPriorityIndex)) {
        highestPriorityIndex = rightChild;
      }

      if (highestPriorityIndex !== index) {
        this._swap(index, highestPriorityIndex);
        index = highestPriorityIndex;
      } else {
        break;
      }
    }
  }

  /**
   * Inserts a new patient into the priority queue.
   * Time Complexity: O(log n)
   * 
   * @param {Object} patient 
   */
  enqueue(patient) {
    if (!patient || !patient.id) {
      throw new Error("Invalid patient object: patient and patient.id are required.");
    }
    this.heap.push(patient);
    this._bubbleUp(this.heap.length - 1);
  }

  /**
   * Removes and returns the patient with the highest emergency priority (at root).
   * Time Complexity: O(log n)
   * 
   * @returns {Object|null} The next patient to be treated, or null if empty
   */
  dequeue() {
    if (this.isEmpty()) {
      return null;
    }
    const root = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0 && last !== undefined) {
      this.heap[0] = last;
      this._bubbleDown(0);
    }
    return root;
  }

  /**
   * Returns the next patient to be treated without removing them from the queue.
   * Time Complexity: O(1)
   * 
   * @returns {Object|null}
   */
  peek() {
    return this.isEmpty() ? null : this.heap[0];
  }

  /**
   * Checks whether the priority queue is empty.
   * Time Complexity: O(1)
   * 
   * @returns {boolean}
   */
  isEmpty() {
    return this.heap.length === 0;
  }

  /**
   * Number of patients currently waiting in the priority queue.
   * Time Complexity: O(1)
   * 
   * @returns {number}
   */
  size() {
    return this.heap.length;
  }

  /**
   * Clears all patients from the priority queue.
   */
  clear() {
    this.heap = [];
  }

  /**
   * Searches for a patient by ID.
   * Time Complexity: O(n)
   * 
   * @param {string} patientId 
   * @returns {Object|null}
   */
  findById(patientId) {
    return this.heap.find(p => p.id === patientId) || null;
  }

  /**
   * Removes an arbitrary patient from the queue by their ID.
   * Time Complexity: O(n) search + O(log n) sift
   * 
   * @param {string} patientId 
   * @returns {Object|null} The removed patient or null if not found
   */
  remove(patientId) {
    const index = this.heap.findIndex(p => p.id === patientId);
    if (index === -1) return null;

    const removed = this.heap[index];
    const last = this.heap.pop();

    if (index < this.heap.length && last !== undefined) {
      this.heap[index] = last;
      // Depending on whether the replacement has higher or lower precedence,
      // we bubble up or bubble down.
      const parent = this._parentIndex(index);
      if (index > 0 && this._hasHigherPrecedence(index, parent)) {
        this._bubbleUp(index);
      } else {
        this._bubbleDown(index);
      }
    }
    return removed;
  }

  /**
   * Updates an existing patient (e.g., priority re-triage or symptoms change)
   * and restores the heap property.
   * 
   * @param {string} patientId 
   * @param {Function} updateFn - Callback taking patient and modifying properties
   * @returns {Object|null}
   */
  update(patientId, updateFn) {
    const index = this.heap.findIndex(p => p.id === patientId);
    if (index === -1) return null;

    updateFn(this.heap[index]);

    // Restore heap invariant
    const parent = this._parentIndex(index);
    if (index > 0 && this._hasHigherPrecedence(index, parent)) {
      this._bubbleUp(index);
    } else {
      this._bubbleDown(index);
    }
    return this.heap[index];
  }

  /**
   * Builds the heap in-place from an arbitrary array of patients in O(n) time.
   * 
   * @param {Array<Object>} patientArray 
   */
  heapify(patientArray) {
    this.heap = [...patientArray];
    const startIdx = Math.floor(this.heap.length / 2) - 1;
    for (let i = startIdx; i >= 0; i--) {
      this._bubbleDown(i);
    }
  }

  /**
   * Returns a sorted array of all waiting patients in the EXACT order they will be treated,
   * WITHOUT mutating or destroying the underlying priority queue.
   * 
   * Uses an auxiliary clone queue to repeatedly extract the max.
   * Time Complexity: O(n log n)
   * 
   * @returns {Array<Object>}
   */
  toArrayInOrder() {
    if (this.isEmpty()) return [];

    // Clone the heap array and use a temporary PQ to extract in sorted order
    const clonePq = new PriorityQueue(this.comparator);
    clonePq.heap = [...this.heap];

    const result = [];
    while (!clonePq.isEmpty()) {
      result.push(clonePq.dequeue());
    }
    return result;
  }

  /**
   * Returns the raw internal heap array (level-order representation).
   * Useful for visualizing the actual binary heap tree.
   * 
   * @returns {Array<Object>}
   */
  getRawHeap() {
    return [...this.heap];
  }

  /**
   * Generates a recursive tree structure suitable for rendering visual tree diagrams.
   * 
   * @returns {Object|null}
   */
  getHeapTree() {
    if (this.isEmpty()) return null;

    const buildNode = (index) => {
      if (index >= this.heap.length) return null;
      const patient = this.heap[index];
      return {
        index,
        patient,
        left: buildNode(2 * index + 1),
        right: buildNode(2 * index + 2)
      };
    };

    return buildNode(0);
  }
}

// Export for module and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PriorityQueue;
} else if (typeof window !== 'undefined') {
  window.PriorityQueue = PriorityQueue;
}
