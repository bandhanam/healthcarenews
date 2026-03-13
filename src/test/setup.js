import '@testing-library/jest-dom';

if (typeof globalThis.EventSource === 'undefined') {
  globalThis.EventSource = class EventSource {
    constructor() { this.readyState = 0; }
    close() { this.readyState = 2; }
  };
}
