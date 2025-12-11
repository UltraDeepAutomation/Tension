// Node dimensions (must match CSS tokens in tokens.css)
export const NODE_WIDTH = 420;   // --node-width
export const NODE_HEIGHT = 500;  // Max collapsed height with all sections filled
export const PORT_SIZE = 8;
export const PORT_GAP = 6;
export const PORTS_TOP = 50;
export const PORT_Y_OFFSET = 1;
export const NODE_GAP_X = 200;   // Horizontal gap between nodes
export const NODE_GAP_Y = 120;   // Vertical gap between nodes

// Zoom settings
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 2.0;
export const ZOOM_STEP = 0.1;

// Canvas UI positioning (must match CSS tokens)
export const CANVAS_UI_INSET = 20;  // --canvas-ui-inset

// Response line limits
export const RESPONSE_LINES_COLLAPSED = 10;  // --node-response-lines-collapsed

// Layout constants
export const SIDEBAR_WIDTH = 260;       // Width of sidebar in pixels
export const SIDEBAR_PADDING = 40;      // Additional padding around sidebar
export const CANVAS_OFFSET_LIMIT = 5000; // Max pan offset in any direction
export const DEBOUNCE_SAVE_MS = 500;    // Debounce delay for auto-save
