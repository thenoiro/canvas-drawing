/**
 * Represents layout coords and selected tool.
 */
class Layout {
  constructor(options = {}) {
    this.tool = options.tool || null;
    this.x1 = options.x1 || null;
    this.x2 = options.x2 || null;
    this.y1 = options.y1 || null;
    this.y2 = options.y2 || null;
  }

  /**
   * Returns original coords
   * @returns {object}
   */
  getCoords() {
    return {
      x1: this.x1,
      x2: this.x2,
      y1: this.y1,
      y2: this.y2,
    };
  }

  /**
   * Returns coords assuming that x1 and y1 are coords of the top left cornor.
   * @returns {object}
   */
  getConsistentCoords() {
    const { x1, x2 } = this;
    const { y1, y2 } = this;
    const result = {};

    if (x2 === null || x1 === null) {
      result.x1 = x1 === null ? x2 : x1;
      result.x2 = x1 === null ? x1 : x2;
    } else {
      result.x1 = Math.min(x1, x2);
      result.x2 = Math.max(x1, x2);
    }

    if (y1 === null || y2 === null) {
      result.y1 = y1 === null ? y2 : y1;
      result.y2 = y1 === null ? y1 : y2;
    } else {
      result.y1 = Math.min(y1, y2);
      result.y2 = Math.max(y1, y2);
    }
    return result;
  }

  /**
   * Returns true if layouts are identical
   * @param {Layout} layout
   * @returns {boolean}
   */
  compare(layout) {
    const conditions = [
      layout.tool === this.tool,
      layout.x1 === this.x1,
      layout.x2 === this.x2,
      layout.y1 === this.y1,
      layout.y2 === this.y2,
    ];
    return conditions.every((c) => c);
  }
}

export default Layout;
