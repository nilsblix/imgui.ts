import { Label } from "./label.ts";
import { Layout } from "./layout.ts";
import { Button } from "./button.ts";
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
  requestAction: (input_state: InputState) => N<ActionType>;
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
}

export class InputState {
  mouse_position: Cursor;
  mouse_down_position: Cursor;
  mouse_down: boolean;
  mouse_frame: {
    clicked: boolean;
    released: boolean;
  };

  moving_window: boolean;

  window_offsets: Cursor[];
  window_positions: Cursor[];

  active_widget_loc: number[];

  constructor(canvas: HTMLCanvasElement, x: number, y: number) {
    this.mouse_position = { x, y };
    this.mouse_down_position = { x, y };
    this.mouse_down = false;
    this.mouse_frame = {
      clicked: false,
      released: false,
    };

    this.moving_window = false;
    this.window_offsets = [];
    this.window_positions = [];
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
}

const c = <REND>canvas.getContext("2d");
const input_state = new InputState(canvas, 0, 0);

let num = 0;
let dt = -1;
let num_windows = 1;

function update() {

  const st = performance.now();

  updateCanvasSizing();

  const stack = new Stack();

  for (let i = 0; i < num_windows; i++) {
    const l1 = stack.makeLayout(input_state, UIAction.placeholder, 100 + 50 * i, 100 + 20 * i, 300, 200, "Window " + (i+1) + " :)");
    l1.makeLabel(c, null, "gui-time = " + dt.toFixed(3) + " ms");
    l1.makeLabel(c, null, "num: " + num);
    l1.makeLabel(c, UIAction.increment, "INCREMENT (while hovering)");
    l1.makeLabel(c, UIAction.decrement, "DECREMENT");
    l1.makeButton(c, UIAction.increment, "INCREMENT (press)");
    l1.makeButton(c, UIAction.decrement, "DECREMENT");
    l1.makeButton(c, UIAction.add_new_window, "Add a new window");
  }

  stack.updateBBoxes();

  const action = stack.requestAction(input_state);
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
  }

  c.clearRect(0, 0, canvas.width, canvas.height);
  stack.render(c);
  input_state.end();

  const et = performance.now();
  dt = et - st;

  requestAnimationFrame(update);
}

update();
