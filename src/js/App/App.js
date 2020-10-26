import Loop from './loop';
import Layout from './layout';
import Drawer from './drawer';
import History from './history';

// TODO: Listen for window size changing
// TODO: Add ability to change line weight
// TODO: Add ability to change the color

/**
 * Drawer controller
 * @param {object} options
 * @param {HTMLElement} options.container
 */
class DrawerApp {
  constructor(options = {}) {
    const { container } = options;

    // If true, render will be started on requestAnimationFrame callback.
    this.requestAnimationFrame = false;

    // We will set this property to true during drawing process (when the left mouse button will
    // be pressed).
    this.clicked = false;

    // This is currently selected drawing tool. Could be one of: rect, circle, line, brush.
    this.tool = 'rect';

    // This is the place where we will store our current step layouts.
    this.layouts = [];

    this.container = container;
    this.paper = container.querySelector('.paper');
    this.canvas = container.querySelector('canvas');
    this.control = {
      requestAnimationFrame: container.querySelector('.request-animation-frame input'),
      buffering: container.querySelector('.buffering input'),
    };
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

    // Storage, where we will keep our already finished layouts for each step.
    this.history = new History();

    this.loop = new Loop(() => this.render());
  }

  /**
   * Initialize the instance
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

    // Listen for requestAnimationFrame option change
    this.control.requestAnimationFrame.addEventListener('change', (e) => {
      this.requestAnimationFrame = e.currentTarget.checked;
    });

    this.control.buffering.addEventListener('change', (e) => {
      this.drawer.buffering = e.currentTarget.checked;
    });

    // Listen for each tool button click and change currently selected tool.
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
          // Clear all the data and redraw the canvas.
          this.layouts = [];
          this.history.clear();
          this.refreshHistoryButtons();
          this.render();
        }
      });
    });

    // Canvas mousedown event
    this.canvas.addEventListener('mousedown', (e) => {
      const c = toCanvasCoords(e.clientX, e.clientY);

      // User starts drawing
      this.clicked = true;

      // Create new layout instance for new shape (at this moment we have only starting coords).
      this.layouts.push(new Layout({
        tool: this.tool,
        x1: c.x,
        y1: c.y,
      }));
      if (this.requestAnimationFrame) {
        // Render using requestAnimationFrame callback
        this.loop.start();
        return;
      }
      // Otherwise run render directly
      this.render();
    });

    // Canvas mousemove event
    this.canvas.addEventListener('mousemove', (e) => {
      // Run only in case of drawing process. Also do not run this condition in case of new shape's
      // layout is not presented (could be an error case).
      if (this.clicked && this.layouts.length) {
        const c = toCanvasCoords(e.clientX, e.clientY);
        const previousLayout = this.layouts.pop();

        // Replace last shape layout with new coords after move.
        this.layouts.push(new Layout({
          tool: previousLayout.tool,
          x1: previousLayout.x1,
          y1: previousLayout.y1,
          x2: c.x,
          y2: c.y,
        }));

        // We emulate brush tool with number of small lines. So, in the case of brush tool we
        // finish a small line, and repeat steps from the [mousedown] event to create new small
        // line layout
        if (this.tool === 'brush') {
          this.layouts.push(new Layout({
            tool: this.tool,
            x1: c.x,
            y1: c.y,
          }));
        }
        if (!this.requestAnimationFrame) {
          // Render directly from event callback.
          this.render();
        }
      }
    });

    // Canvas mouseup event
    this.canvas.addEventListener('mouseup', () => {
      // User finishes drawing
      this.clicked = false;

      // Current drawing step is finished, move all step layouts to the history.
      if (this.layouts.length) {
        this.history.addStep(this.layouts);
      }
      this.layouts = [];
      this.refreshHistoryButtons();

      // Last render call will be run from the loop instance after stopping.
      if (this.requestAnimationFrame) {
        this.loop.stop();
        return;
      }
      // requestAnimationFrame is off. Run render directly.
      this.render();
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
        const inProcess = Boolean(this.clicked && this.layouts.length);

        if (inProcess) {
          // Clear all step layouts, mark drawing process as finished, and redraw the canvas.
          this.clicked = false;
          this.layouts = [];

          // Rerender will be run from loop instance.
          if (this.requestAnimationFrame) {
            this.loop.stop();
            return;
          }
          // requestAnimationFrame is off. Run rerender directly.
          this.render();
        }
      }
    });

    // History buttons
    Object.values(this.buttons.history).forEach((button) => {
      button.addEventListener('click', (/* e */) => {
        if (button.hasAttribute('disabled')) {
          return;
        }
        const direction = button.getAttribute('data-tool');

        if (direction === 'undo') {
          this.undo();
          return;
        }
        this.redo();
      });
    });
  }

  /**
   * Returns all layouts from history.
   * @returns {Layout[]}
   */
  getLayoutsFromHistory() {
    return this.history.getSteps().reduce((layouts, { value }) => ([
      ...layouts,
      ...value,
    ]), []);
  }

  /**
   * Refresh history buttons state and look.
   */
  refreshHistoryButtons() {
    const { undo, redo } = this.buttons.history;
    const { step } = this.history;
    const lastStep = this.history.lastStepIndex();

    if (step < 1) {
      undo.setAttribute('disabled', '');
    } else {
      undo.removeAttribute('disabled');
    }

    if (lastStep) {
      if (step >= lastStep) {
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
  undo() {
    this.history.prev();
    this.refreshHistoryButtons();
    this.render();
  }

  /**
   * Go to the next step if possible.
   */
  redo() {
    this.history.next();
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
    // Get all actual layouts from history with current step layouts.
    const layouts = [
      ...this.getLayoutsFromHistory(),
      ...this.layouts,
    ];

    // This is last time rendered layouts.
    const previousLayouts = this.drawer.layouts;

    // Length of layouts has changed. Redraw the canvas.
    if (layouts.length !== previousLayouts.length) {
      this.drawer.update(layouts);
      return;
    }
    // If current step layouts array is empty, and layouts from the history are the same length as
    // already drown layouts, consider there is no changes.
    if (!this.layouts.length) {
      return;
    }

    // Make sure that last rendered layout is the same coords as already drown last layout (could
    // be changed at the [mousemove] step).
    const lastPreviousLayout = previousLayouts[previousLayouts.length - 1];
    const lastCurrentLayout = this.layouts[this.layouts.length - 1];
    const changes = !lastCurrentLayout.compare(lastPreviousLayout);

    // We have the same amount of layouts, but different coords for the last ones. Redraw.
    if (changes) {
      this.drawer.update(layouts);
    }
  }
}

export default DrawerApp;
