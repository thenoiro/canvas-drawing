/**
 * Canvas controller.
 */
class Drawer {
  constructor(options = {}) {
    const { canvas } = options;

    this.ctx = canvas.getContext('2d');
    this.width = canvas.offsetWidth;
    this.height = canvas.offsetHeight;

    // Last rendered layouts array
    this.layouts = [];
  }

  /**
   * Update canvas with new layouts
   * @param {object[]} layouts
   */
  update(layouts = []) {
    this.layouts = layouts;
    // Clear canvas before update
    this.ctx.clearRect(0, 0, this.width, this.height);
    layouts.forEach((l) => this.renderLayout(l));
  }

  renderLayout(layout) {
    // Lines width
    const weight = 4;
    const { ctx } = this;

    const renderRect = (coords) => {
      const { x1, y1 } = coords;
      const { x2, y2 } = coords;

      if ([x1, x2, y1, y2].some((c) => !Number.isFinite(c))) {
        return;
      }
      // If the shape is biggest then two lines width sum, fill it inside with white color
      const bigEnough = (x2 - x1) > (weight * 2) && (y2 - y1) > (weight * 2);
      ctx.fillStyle = 'black';
      ctx.fillRect(x1, y1, x2 - x1, y2 - y1);

      // Draw white rectangle within black
      if (bigEnough) {
        ctx.fillStyle = 'white';
        ctx.fillRect(
          x1 + weight,
          y1 + weight,
          (x2 - x1) - (weight * 2),
          (y2 - y1) - (weight * 2),
        );
      }
    };
    const renderCircle = (coords) => {
      if ([coords.x2, coords.y2].some((c) => !Number.isFinite(c))) {
        return;
      }
      const { x1, y1 } = coords;
      const { x2, y2 } = coords;

      const a = x2 - x1;
      const b = y2 - y1;
      const radius = Math.sqrt((a * a) + (b * b));

      // If the shape is biggest then two lines width sum, fill it inside with white color
      const bigEnough = radius > weight * 2;

      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(x1, y1, radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw white circle within black one
      if (bigEnough) {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(x1, y1, radius - weight, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    const renderLine = (coords) => {
      if ([coords.x2, coords.y2].some((c) => !Number.isFinite(c))) {
        return;
      }
      const { x1, y1 } = coords;
      const { x2, y2 } = coords;

      ctx.lineWidth = weight;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };
    const renderBrush = (coords) => {
      const { x1, y1 } = coords;
      const { x2, y2 } = coords;

      renderCircle({
        x1,
        y1,
        x2: x1 + (weight / 2),
        y2: y1,
      });
      if ([x2, y2].some((c) => !Number.isFinite(c))) {
        return;
      }
      renderLine({
        x1,
        y1,
        x2,
        y2,
      });
      renderCircle({
        x1: x2,
        y1: y2,
        x2: x2 + (weight / 2),
        y2,
      });
    };

    switch (layout.tool) {
      case 'rect': {
        const coords = layout.getConsistentCoords();
        renderRect(coords);
        break;
      }
      case 'circle': {
        const coords = layout.getCoords();
        renderCircle(coords);
        break;
      }
      case 'brush': {
        const coords = layout.getCoords();
        renderBrush(coords);
        break;
      }
      default:
      case 'line': {
        const coords = layout.getCoords();
        renderLine(coords);
        break;
      }
    }
  }
}

export default Drawer;
