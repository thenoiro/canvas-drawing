/**
 * Represents history storage. Helps to manage history actions (undo, redo, etc).
 */
class History {
  constructor() {
    // Current step.
    this.step = 0;

    // Steps storage.
    this.history = [];
  }

  /**
   * Save value as a new step. Increase current step index.
   * @param {any} value
   */
  addStep(value) {
    // Do not change step untill [getSteps] function run.
    const step = this.step + 1;

    this.history = [
      ...this.getSteps(),
      { value, step },
    ];
    this.step = step;
  }

  /**
   * Return to the previous step, if possible.
   */
  prev() {
    this.step = this.step > 0 ? this.step - 1 : 0;
  }

  /**
   * Go to the next step, if possible.
   */
  next() {
    const lastStep = this.lastStepIndex();
    this.step = this.step >= lastStep ? lastStep : this.step + 1;
  }

  /**
   * Returns array of all steps from given step, to given step (from 0 to current step by default).
   * @param {object} [options]
   * @param {number} [options.from]
   * @param {number} [options.to]
   * @returns {object[]}
   */
  getSteps(options = {}) {
    const {
      from = 0,
      to = this.step,
    } = options;

    return this.history.filter((h) => h.step >= from && h.step <= to);
  }

  /**
   * Returns last saved step index.
   * @returns {number}
   */
  lastStepIndex() {
    return this.history.length ? this.history[this.history.length - 1].step : 0;
  }

  /**
   * Clear history storage.
   */
  clear() {
    this.step = 0;
    this.history.length = 0;
  }
}

export default History;
