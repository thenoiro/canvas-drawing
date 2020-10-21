/**
 * Represents layout coords and selected tool.
 */
class Layout {
  constructor(options = {}) {
    this.tool = options.tool || null;
    this.x1 = options.x1 || null;
    this.x2 = options.x2 || this.x1;
    this.y1 = options.y1 || null;
    this.y2 = options.y2 || this.y1;
  }

  /**
   * Returns coords assuming that x1 and y1 are coords of the top left cornor.
   */
  getCoords() {
    return {
      x1: Math.min.apply(null, [this.x1, this.x2]),
      x2: Math.max.apply(null, [this.x1, this.x2]),
      y1: Math.min.apply(null, [this.y1, this.y2]),
      y2: Math.max.apply(null, [this.y1, this.y2]),
    };
  }
}

export default Layout;
