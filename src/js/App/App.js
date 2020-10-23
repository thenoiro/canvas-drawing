import Layout from './layout';
import Drawer from './drawer';

// TODO: Listen for window size changing

/**
 * Drawer controller
 * @param {object} options
 * @param {HTMLElement} options.container
 */
class DrawerApp {
  constructor(options = {}) {
    const { container } = options;

    // We will set this property to true during drawing process (when the left mouse button will
    // be pressed)
    this.clicked = false;

    // This is currently selected drawing tool. Could be one of: rect, circle, line, brush.
    this.tool = 'rect';

    // Array of Layout instances wich wont be changed anymore
    // (already drown layouts (mousedown -> mousemove -> mouseup).
    this.layouts = [];

    // This Layout instance could be changed by mouse move (mouse button still pressed).
    // Could be presented only at [mousemove] step.
    this.layout = null;

    // Represents current drawing step. Each step is a full cycle of mousedown -> mousemove ->
    // mouseup. Means that more then one layout could be drown in one step (for instance: brush
    // tool draws a lot of small lines between mousedown and mouseup events).
    this.step = 0;

    this.container = container;
    this.paper = container.querySelector('.paper');
    this.canvas = container.querySelector('canvas');
    this.buttons = {
      main: {
        clear: container.querySelector('.icon-button[data-tool="clear"]'),
      },
      tools: {
        rect: container.querySelector('.icon-button[data-tool="rect"]'),
        brush: container.querySelector('.icon-button[data-tool="brush"]'),
        circle: container.querySelector('.icon-button[data-tool="circle"]'),
        line: container.querySelector('.icon-button[data-tool="line"]'),
      },
      history: {
        undo: container.querySelector('.icon-button[data-tool="undo"]'),
        redo: container.querySelector('.icon-button[data-tool="redo"]'),
      },
    };
    const { offsetWidth, offsetHeight } = this.paper;
    this.canvas.setAttribute('width', offsetWidth);
    this.canvas.setAttribute('height', offsetHeight);

    // Create Drawer instance.
    this.drawer = new Drawer({ canvas: this.canvas });
  }

  /**
   * Initialize instance
   */
  init() {
    this.selectTool();
    this.bindEvents();
    this.refreshHistoryButtons();
  }

  /**
   * Listen for DOM events
   */
  bindEvents() {
    const canvasRect = this.canvas.getBoundingClientRect();
    const canvasCoords = {
      x1: canvasRect.x,
      x2: canvasRect.x + this.paper.offsetWidth,
      y1: canvasRect.y,
      y2: canvasRect.y + this.paper.offsetHeight,
    };

    /**
     * Transforms viewport coords to the canvas coords.
     * @param {number} x - Viewport X coord
     * @param {number} y - Viewport Y coord
     */
    const toCanvasCoords = (x, y) => ({
      x: x - canvasCoords.x1,
      y: y - canvasCoords.y1,
    });

    // Listen for each tool button click and change currently selected tool
    Object.values(this.buttons.tools).forEach((button) => {
      button.addEventListener('click', (e) => {
        const tool = e.currentTarget.getAttribute('data-tool');
        this.selectTool(tool);
      });
    });

    // Listen for each main button click
    Object.values(this.buttons.main).forEach((button) => {
      button.addEventListener('click', (e) => {
        const tool = e.currentTarget.getAttribute('data-tool');

        if (tool === 'clear') {
          // Clear all the data and redraw the canvas
          this.layouts = [];
          this.layout = null;
          this.step = 0;
          this.refreshHistoryButtons();
          this.render();
        }
      });
    });

    // Canvas mousedown event
    this.canvas.addEventListener('mousedown', (e) => {
      // User start drawing
      this.clicked = true;
      this.layouts = this.fromHistory();

      // We increase history step on mousedown event because layout wich will be drown should be
      // assigned to this step number (not finished at the moment).
      this.step += 1;
      const c = toCanvasCoords(e.clientX, e.clientY);

      // Create new layout instance for new shape (at this moment we have only starting coords).
      this.layout = new Layout({
        step: this.step,
        tool: this.tool,
        x1: c.x,
        y1: c.y,
      });
      this.render();
    });

    // Canvas mousemove event
    this.canvas.addEventListener('mousemove', (e) => {
      // Run only in case of drawing process. Also do not run this condition in case of new shape's
      // layout is not presented (could be an error case).
      if (this.clicked && this.layout) {
        const c = toCanvasCoords(e.clientX, e.clientY);
        const previousLayout = this.layout;

        // Replace current shape's layout with new coords after move
        this.layout = new Layout({
          step: previousLayout.step,
          tool: previousLayout.tool,
          x1: previousLayout.x1,
          y1: previousLayout.y1,
          x2: c.x,
          y2: c.y,
        });

        // We emulate brush tool with number of small lines. So, in the case of brush tool we
        // finish a small line, and repeat steps from the [mousedown] event to create new small
        // line layout
        if (this.tool === 'brush') {
          this.layouts.push(this.layout);
          this.layout = new Layout({
            step: this.step,
            tool: this.tool,
            x1: c.x,
            y1: c.y,
          });
        }
        this.render();
      }
    });

    // Canvas mouseup event
    this.canvas.addEventListener('mouseup', () => {
      // User finish drawing
      this.clicked = false;

      // Now this layout coudn't be modified. Move it to the layouts array and clear the property.
      if (this.layout) {
        this.layouts.push(this.layout);
      }
      this.layout = null;
      this.render();
      this.refreshHistoryButtons();
    });

    // Listen for document mousemove event to catch the moment when the cursor has left the canvas.
    // If it happened, clear not finished shape's layout.
    document.addEventListener('mousemove', (e) => {
      const exceptions = [
        e.clientX < canvasCoords.x1,
        e.clientX > canvasCoords.x2,
        e.clientY < canvasCoords.y1,
        e.clientY > canvasCoords.y2,
      ];
      if (exceptions.some((ex) => ex)) {
        const inProcess = Boolean(this.clicked && this.layout);
        this.clicked = false;
        this.layout = null;

        if (inProcess) {
          // Correct mouseup event didn't happened. Return to the previous step.
          this.historyUndo();
        }
      }
    });

    // History buttons
    Object.values(this.buttons.history).forEach((button) => {
      button.addEventListener('click', (/* e */) => {
        const isDisabled = button.hasAttribute('disabled');

        if (isDisabled) {
          return;
        }
        const direction = button.getAttribute('data-tool');

        if (direction === 'undo') {
          this.historyUndo();
          return;
        }
        this.historyRedo();
      });
    });
  }

  /**
   * Returns all layouts between first and given step.
   * @param {number} [step] - Upper limit.
   */
  fromHistory(step = this.step) {
    return this.layouts.filter((l) => l.step <= step);
  }

  /**
   * Refresh history buttons state and look.
   */
  refreshHistoryButtons() {
    const { undo, redo } = this.buttons.history;

    if (this.step < 1) {
      undo.setAttribute('disabled', '');
      this.step = 0;
    } else {
      undo.removeAttribute('disabled');
    }

    if (this.layouts.length) {
      const lastStep = this.layouts[this.layouts.length - 1].step;

      if (this.step >= lastStep) {
        redo.setAttribute('disabled', '');
      } else {
        redo.removeAttribute('disabled');
      }
    } else {
      redo.setAttribute('disabled', '');
    }
  }

  /**
   * Go to the previous step if possible.
   */
  historyUndo() {
    if (this.step > 0) {
      this.step -= 1;
    }
    this.refreshHistoryButtons();
    this.render();
  }

  /**
   * Go to the next step if possible.
   */
  historyRedo() {
    if (this.layouts.length) {
      const lastStep = this.layouts[this.layouts.length - 1].step;

      if (this.step < lastStep) {
        this.step += 1;
      }
    }
    this.refreshHistoryButtons();
    this.render();
  }

  /**
   * Change currently selected drawing tool.
   * @param {string} [tool]
   */
  selectTool(tool = this.tool) {
    // Remove active class from all the buttons.
    this.container.querySelectorAll('.icon-button.active').forEach((el) => {
      el.classList.remove('active');
    });
    // Add active class to the actual tool button.
    this.buttons.tools[tool].classList.add('active');
    this.tool = tool;
  }

  /**
   * Readraw canvas in case of some changes.
   */
  render() {
    // Get layouts considering current history state.
    const layouts = this.fromHistory();
    // Copy finished layouts
    const newLayouts = [...layouts];

    // Means, we in the drawing process. To paint not finished shape, we will also add it to the
    // array of layouts.
    if (this.layout) {
      newLayouts.push(this.layout);
    }
    // This is last time rendered layouts.
    const previousLayouts = this.drawer.layouts;

    // Length of layouts has changed. This is possible in the case of brush tool, or after canvas
    // refreshing.
    if (newLayouts.length !== previousLayouts.length) {
      this.drawer.update(newLayouts);
      return;
    }
    // The same length, and there is no not finished shape... Not feels like something changed.
    // This is possible during drawing process when mouse button has pressed, but no moves
    // detected.
    if (!this.layout) {
      return;
    }

    // Ok, we have the same amount of layouts, but this is possible during the drawing process.
    // Maybe [this.layout] (not finished shape) has changed? Lets check and compare it with the
    // last layout from [drawer] instance.
    const lastPreviousLayout = previousLayouts[previousLayouts.length - 1];
    const lastCoords = Object.values(lastPreviousLayout.getConsistentCoords());
    const thisCoords = Object.values(this.layout.getConsistentCoords());
    const changes = lastCoords.some((v, i) => v !== thisCoords[i]);

    // We have the same amount of layouts, but different coords for last ones. Redraw.
    if (changes) {
      this.drawer.update(newLayouts);
    }
  }
}

export default DrawerApp;
