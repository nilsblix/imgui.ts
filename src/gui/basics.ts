// NOTES:GG
// layering of layouts. FUCK. indices of persistent states will be FUCKED.
//  ==> Maybe other persistent array of index mapping? still FUCKED
// More widgets :)
// And even more widgets :)
// NEW NOTES
// * fix clearing of active widget when spawning new layout (window)
// * more sophisticated popup handling. maybe internal handling of its states.
// * color widget. vector4 with popups and everything twin
// NEW NOTES
// * fix gap issues in grid
// * fix grid onclick drag window thing
// * fix other grid issues such as relative sizing issues and closing/finishing grid cursor thing
// * color widget pls
// fine with user based popup data handling. don't really want to fix that
// the user can fuck off and learn the intricasies of the based nirf_gui.
import { Stack } from "./stack.ts";
import { Layout } from "./layout.ts";

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
  static grid = {
    widget_gap: 5,
  }
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
  test_popup_switch,
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

let text_wrap_width = 400;

function update() {
  const st = performance.now();

  updateCanvasSizing();

  const stack = new Stack<N<UIAction>>();

  for (let i = 0; i < num_windows; i++) {
    if (i == 0) {
      const l = stack.makeLayout(input_state, UIAction.placeholder, 100, 100, 0, 0, "FIRST window :D");
      l.makeLabel(c, null, "gui-time = " + dt.toFixed(4));
      l.makeLabel(c, null, "frt = " + frame_time.toFixed(4));
      l.makeLabel(c, null, "active loc = " + input_state.active_widget_loc);
      l.makeButton(c, UIAction.increment, "Increment");
      l.makeButton(c, UIAction.decrement, "Decrement");
      l.makeButton(c, UIAction.test_popup_switch, "popup");
      l.makeLabel(c, null, "Drag some arbitrary num").bbox;
      l.makeDraggable(c, UIAction.drag_num, "num: " + num);
      l.makeDraggable(c, UIAction.drag_text_wrap_width, "Wrap width: " + text_wrap_width);
      l.makeLabel(c, null, " ");
      l.makeButton(c, UIAction.add_new_window, "Add a window. " + num_windows);
      l.makeText(c, UIAction.increment, "Some more standard placeholder text that isn't some weird loremm ipsum shit that everyone is tired of. Wow have I offended someone with that statement. Fuck you those that are offended. I don't give a fuck", text_wrap_width);

      function grid3x3(layout: Layout<N<UIAction>>) {
        if (layout.loc.length > 3) return;
        const g = layout.makeGrid(null, 3, 0.5);
        // g.makeLabel(c, null, "g00");
        // g.makeLabel(c, null, "g10");
        // g.makeLabel(c, null, "g20");
        // g.makeLabel(c, null, "g01");
        // g.makeLabel(c, null, "g11");
        // g.makeLabel(c, null, "g21");
        // g.makeLabel(c, null, "g02");
        // g.makeLabel(c, null, "g12");
        // g.makeLabel(c, null, "g22");
        g.makeDraggable(c, UIAction.drag_text_wrap_width, "g00");
        g.makeDraggable(c, UIAction.drag_text_wrap_width, "g10");
        g.makeDraggable(c, UIAction.drag_text_wrap_width, "g20");
        g.makeDraggable(c, UIAction.drag_text_wrap_width, "g01");
        g.makeDraggable(c, UIAction.drag_text_wrap_width, "g11");
        g.makeDraggable(c, UIAction.drag_text_wrap_width, "g21");
        g.makeDraggable(c, UIAction.drag_text_wrap_width, "g02");
        g.makeDraggable(c, UIAction.drag_text_wrap_width, "g12");
        g.makeDraggable(c, UIAction.drag_text_wrap_width, "g22");

        layout.updateBBox(g);
      }

      l.makeLabel(c, UIAction.decrement, "* Recursive Grids:");
      const g2 = l.makeGrid(null, 2, 1.0, "test t");

      grid3x3(g2);
      grid3x3(g2);
      grid3x3(g2);
      grid3x3(g2);
      grid3x3(g2);
      grid3x3(g2);

      g2.bbox.right += GlobalStyle.layout.padding - GlobalStyle.grid.widget_gap;
      g2.widgets[0].bbox.right = g2.bbox.right;

      l.updateBBox(g2);
      l.resetCursor();

      l.makeLabel(c, null, "cursor placement after grid");

      if (test_popup) {
        const p = l.makePopup(UIAction.placeholder, 500, 10);
        p.makeLabel(c, null, "Popup");
        p.makeLabel(c, null, "Hello, world!");
        p.makeDraggable(c, UIAction.drag_text_wrap_width, "wwidth");
      }
    } else {
      const l = stack.makeLayout(input_state, UIAction.placeholder, 100+20*i, 100 + 10*i, 0, 0, (i + 1) + "th? window :P");
      l.makeText(c, null, "Some more standard placeholder text that isn't some weird loremm ipsum shit that everyone is tired of. Wow have I offended someone with that statement. Fuck you those that are offended. I don't give a fuck", text_wrap_width);
    }
  }

  const ret = stack.requestAction(input_state)
  const action = ret.action;

  if (input_state.active_widget_loc.length > 0 && input_state.active_widget_loc[0] != 0) {
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
      text_wrap_width += 2 * input_state.mouse_delta_pos.x;
      if (text_wrap_width < 0) text_wrap_width = 0;
      break;
    case UIAction.test_popup:
      test_popup = true;
      break;
    case UIAction.test_popup_switch:
      test_popup = !test_popup;
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
