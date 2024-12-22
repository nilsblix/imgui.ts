// NOTES:GG
// layering of layouts. FUCK. indices of persistent states will be FUCKED.
//  ==> Maybe other persistent array of index mapping? still FUCKED
// More widgets :)
// And even more widgets :)
// NEW NOTES
// * fix clearing of active widget when spawning new layout (window)
// * more sophisticated popup handling. maybe internal handling of its states.
// * color widget. vector4 with popups and everything twin
import { Stack } from "./stack.ts";

const canvas = document.createElement("canvas");
canvas.id = "nirf_canvas";
document.body.appendChild(canvas);
function updateCanvasSizing() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
}

export type REND = CanvasRenderingContext2D;
export type N<T> = null | T;
export type WidgetLoc = number[];

export type Cursor = {
  x: number;
  y: number;
};

export type Color = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export class MColor {
  static white = { r: 255, g: 255, b: 255, a: 1 };
  static black = { r: 0, g: 0, b: 0, a: 1 };
  static g_18 = { r: 18, g: 19, b: 18, a: 1 };
  static red = { r: 255, g: 0, b: 0, a: 1 };

  static string(color: Color): string {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
  }

  static fromString(colorString: string): Color {
    const match = colorString.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*(\d*\.?\d+)?\)/,
    );
    if (!match) {
      throw new Error("Invalid color string format");
    }

    const [, r, g, b, a] = match;
    return {
      r: parseInt(r, 10),
      g: parseInt(g, 10),
      b: parseInt(b, 10),
      a: a !== undefined ? parseFloat(a) : 1,
    };
  }

  static fromHex(hex: string): Color {
    const hexClean = hex.replace("#", "");
    if (hexClean.length === 6) {
      // RGB format
      const r = parseInt(hexClean.slice(0, 2), 16);
      const g = parseInt(hexClean.slice(2, 4), 16);
      const b = parseInt(hexClean.slice(4, 6), 16);
      return { r, g, b, a: 1 };
    } else if (hexClean.length === 8) {
      // RGBA format
      const r = parseInt(hexClean.slice(0, 2), 16);
      const g = parseInt(hexClean.slice(2, 4), 16);
      const b = parseInt(hexClean.slice(4, 6), 16);
      const a = parseInt(hexClean.slice(6, 8), 16) / 255;
      return { r, g, b, a };
    } else {
      throw new Error("Invalid hex color format");
    }
  }

  static fromRGB(rgb: { r: number; g: number; b: number }): Color {
    return { ...rgb, a: 1 };
  }
}

export type BBox = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export class MBBox {
  static isInside(box: BBox, x: number, y: number): boolean {
    return x > box.left && x < box.right && y > box.top && y < box.bottom;
  }

  static calcWidth(box: BBox): number {
    return box.right - box.left;
  }

  static calcHeight(box: BBox): number {
    return box.bottom - box.top;
  }

  static set(target: BBox, src: BBox): void {
    target.left = src.left;
    target.right = src.right;
    target.top = src.top;
    target.bottom = src.bottom;
  }
}

export type Widget<ActionType> = {
  bbox: BBox;
  loc: WidgetLoc;
  widgets: Widget<ActionType>[];
  render: (c: REND) => void;
  requestAction: (input_state: InputState) => {
    wants_focus: boolean;
    action: N<ActionType>;
  };
};

export class GlobalStyle {
  static font = "ProggyCleanTT";
  static widget = {
    default_bg_color: "#294A7AFF",
    hover_bg_color: "#4296FAFF",
    down_bg_color: "#0F87FAFF",
  };
  static label = {
    font_size: 16,
    default_font_color: MColor.white,
  };
  static button = {
    padding: 3,
    font_size: 16,
  };
  static layout = {
    padding: 10,
    widget_gap: 5,
    bg_color: MColor.fromHex("#0F0F0FF0"),
    border: "#6E6E8080",
  };
  static header = {
    color: "#ffffff",
    bg_color: "#294A7AFF",
    font_size: 16,
  };
  static popup = {
    padding: 5,
    widget_gap: 5,
    bg_color: MColor.fromHex("#0F0F0FF0"),
    border: "#6E6E8080",
  }
}

export class InputState {
  mouse_position: Cursor;
  mouse_prev_position: Cursor;
  mouse_delta_pos: Cursor;
  mouse_down_position: Cursor;
  mouse_down: boolean;
  mouse_frame: {
    clicked: boolean;
    released: boolean;
  };

  moving_window: boolean;

  window_offsets: Cursor[];
  window_positions: Cursor[];
  window_order: number[];

  active_widget_loc: number[];

  constructor(canvas: HTMLCanvasElement, x: number, y: number) {
    this.mouse_position = { x, y };
    this.mouse_prev_position = { x, y };
    this.mouse_down_position = { x, y };
    this.mouse_delta_pos = { x, y };
    this.mouse_down = false;
    this.mouse_frame = {
      clicked: false,
      released: false,
    };

    this.moving_window = false;
    this.window_offsets = [];
    this.window_positions = [];
    this.window_order = [];
    this.active_widget_loc = [];

    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.x;
      const y = e.clientY - rect.y;
      this.mouse_position.x = x;
      this.mouse_position.y = y;
    });

    canvas.addEventListener("mousedown", (e) => {
      this.mouse_frame.clicked = true;
      this.mouse_down = true;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.x;
      const y = e.clientY - rect.y;
      this.mouse_down_position.x = x;
      this.mouse_down_position.y = y;
    });

    canvas.addEventListener("mouseup", () => {
      this.mouse_frame.released = true;
      this.mouse_down = false;
    });
  }

  end() {
    this.mouse_delta_pos.x = this.mouse_position.x - this.mouse_prev_position.x;
    this.mouse_delta_pos.y = this.mouse_position.y - this.mouse_prev_position.y;
    this.mouse_prev_position.x = this.mouse_position.x;
    this.mouse_prev_position.y = this.mouse_position.y;
    this.mouse_frame.clicked = false;
    this.mouse_frame.released = false;
  }
}

// USER MADE THINGS: SHOULD BE IN main.ts
enum UIAction {
  placeholder,
  increment,
  decrement,
  add_new_window,
  drag_num,
  test_popup,
  drag_text_wrap_width,
  HIGH_drag_text_wrap_width,
}

const c = <REND>canvas.getContext("2d");
const input_state = new InputState(canvas, 0, 0);

let num = 0;
let dt = -1;
let last_time = 0;
let frame_time = -1;
let num_windows = 1;

let test_popup = false;

let text_wrap_width = 200;

function update() {
  const st = performance.now();

  updateCanvasSizing();

  const stack = new Stack();

  for (let i = 0; i < num_windows; i++) {
    const l1 = stack.makeLayout(
      input_state,
      // i == 0 ? null : UIAction.placeholder,
      UIAction.placeholder,
      100 + 50 * i,
      100 + 20 * i,
      0,
      0,
      "Window " + (i + 1) + " :)",
    );
    l1.makeLabel(c, null, "gui-time = " + dt.toFixed(3) + " ms");
    l1.makeLabel(c, null, "frame-time = " + frame_time.toFixed(3) + " ms");
    l1.makeLabel(c, null, "active loc: " + input_state.active_widget_loc);
    l1.makeLabel(c, null, " ");
    l1.makeLabel(c, null, "num: " + num);
    l1.makeLabel(c, UIAction.increment, "INCREMENT (while hovering)");
    l1.makeLabel(c, UIAction.decrement, "DECREMENT");
    l1.makeButton(c, UIAction.increment, "INCREMENT (press)");
    l1.makeButton(c, UIAction.decrement, "DECREMENT");
    i == 0 ? l1.makeButton(c, UIAction.add_new_window, "Add a new window") : null;
    l1.makeDraggable(c, UIAction.drag_num, "num: " + num);
    l1.makeLabel(c, null, " ");
    l1.makeDraggable(c, UIAction.drag_text_wrap_width, "wrap width: " + text_wrap_width);
    l1.makeText(c, UIAction.increment, "This an example of a long ass text to test text-wrapping. Some real lorem ipsum shit here bro", text_wrap_width);
    l1.makeText(c, null, "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed eiusmod tempor incidunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquid ex ea commodi consequat. Quis aute iure reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint obcaecat cupiditat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.", text_wrap_width);
    l1.makeDraggable(c, UIAction.HIGH_drag_text_wrap_width, "HIGHER SENS wrap width: " + text_wrap_width);
    // const b = l1.makeButton(c, UIAction.test_popup, "Press for popup");
    // l1.makeLabel(c, i == 0 ? UIAction.test_popup : UIAction.increment, "hover for popup")
    l1.updateBBox();
    if (test_popup && i == 0) {
      const pop = l1.makePopup(null, input_state.mouse_position.x + 20, input_state.mouse_position.y);
      pop.makeLabel(c, null, "I am a toolkit");
      pop.updateBBox();
    }
  }

  // stack.updateBBoxes();

  const ret = stack.requestAction(input_state)
  const action = ret.action;

  if (action == null) {
    test_popup = false;
  }

  switch (action) {
    case UIAction.increment:
      num++;
      break;
    case UIAction.decrement:
      num--;
      break;
    case UIAction.add_new_window:
      num_windows++;
      break;
    case UIAction.drag_num:
      num += input_state.mouse_delta_pos.x;
      if (num < -100) num = -100;
      if (num > 100) num = 100;
      break;
    case UIAction.drag_text_wrap_width:
      text_wrap_width += input_state.mouse_delta_pos.x;
      if (text_wrap_width < 0) text_wrap_width = 0;
      break;
    case UIAction.HIGH_drag_text_wrap_width:
      text_wrap_width += 3 * input_state.mouse_delta_pos.x;
      if (text_wrap_width < 0) text_wrap_width = 0;
      break;
    case UIAction.test_popup:
      test_popup = true;
      break;
  }

  c.clearRect(0, 0, canvas.width, canvas.height);
  stack.stack_render(c, input_state);
  input_state.end();

  const et = performance.now();
  dt = et - st;
  frame_time = et - last_time;
  last_time = et;
}

setInterval(update, 1E3/120);
