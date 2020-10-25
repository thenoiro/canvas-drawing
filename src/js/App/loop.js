/**
 * Controls animation frames
 */
class Loop {
  constructor(callback) {
    // This callback will be run at each animation frame
    this.callback = callback;
    this.id = null;
  }

  start() {
    const loop = () => {
      this.id = requestAnimationFrame(loop);
      this.callback();
    };
    this.stop();
    loop();
  }

  stop() {
    if (this.id) {
      cancelAnimationFrame(this.id);
      this.id = null;
      // Run callback last time to apply all the changes
      this.callback();
    }
    this.id = null;
  }
}

export default Loop;
