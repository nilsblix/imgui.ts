// NOTES
// 1. window header should really be a button as when pressing it the window should close
// 2. maybe figure out some way to make it so that only when a widget's primary event
// ("click" for button) it changes window focus.
// 3. figure out how to dispatch an specific action when a widgets primary event is triggered.
// 3.b also maybe have a nice and clean way to add actions
// 4. maybe some layouting
// 5. maybe clean things up. have a better way of specifying things like layout, buttons drag floats etc
// so that it starts to look like something someone might use. (export something that someone can use).
// 6. clean things up perhaps. different files for things.
// 5.6.b ==> finally a GUI static class (ALPHA prod version)
//
// Change the app.button_states such that two windows button idx (lowest) don't share the same button_state.
// Then the buttons will have persistent states and everything will work (can have a if (gui.getButtonState("??"))) to action something
//
// NEW NOTES:
// Rewrite everytning
// Make it completely immediate except for inputs and the "application" that the user stores their data in
// i.e. gui stores only input-data. :)
// ==> More memory efficient??
// ==> Less headaches when working with state syncing?
const canvas = document.createElement("canvas");
canvas.id = "nirf_canvas";
document.body.appendChild(canvas);
function updateCanvasSizing() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
}

type RENDERER = CanvasRenderingContext2D;

type Cursor = {
  x: number;
  y: number;
}

type Color = {
  r: number;
  g: number;
  b: number;
  a: number;
}

class MColor {
  static white = { r: 255, g: 255, b: 255, a: 1 };

  static string(color: Color): string {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
  }

  static fromString(colorString: string): Color {
    const match = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*(\d*\.?\d+)?\)/);
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
    const hexClean = hex.replace('#', '');
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

type BBox = {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

class MBBox {
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

enum UIAction {
  RESPOND_TO_HOVER,
  RESPOND_TO_CLICK, // has also respond to hover
  RESPOND_TO_FLOATDRAG,
  none,
}

type WidgetState = {
  start_value: number | boolean;
  value: number | boolean;
}

type PersistentWindowData = {
  idx: number;
  position: Cursor;
  offset: Cursor;
  widget_states: WidgetState[];
}

type WidgetStateReturn = {
  focus_window: boolean;
  action: UIAction;
}

type Widget = {
  bbox: BBox;
  action_type: UIAction;
  widget_idx: number;
  render: (c: RENDERER) => void;
  setInputState: (input_state: InputState) => WidgetStateReturn;
}

type ButtonStyle = {
  text_color: Color;
  text_size: number;
  default_color: Color;
  hover_color: Color;
  down_color: Color;
  padding: number;
}

type WLabelStyle = {
  text_size: number;
  default_text_color: Color;
  hover_text_color: Color;
}

type DraggableFloatStyle = {
  text_color: Color;
  text_size: number;
  default_color: Color;
  hover_color: Color;
  down_color: Color;
  padding: number;
}

type HeaderStyle = {
  default_bg_color: Color;
  focused_bg_color: Color;
  text_size: number;
  text_color: Color;
}

type WindowStyle = {
  header_style: HeaderStyle;
  button_style: ButtonStyle;
  label_style: WLabelStyle;
  draggable_float_style: DraggableFloatStyle;
  padding: number;
  bg_color: Color;
  border_color: Color;
  border_width: number;
  widget_gap: number;
}

const enum ButtonState {
  default,
  hovered,
  clicked,
  down,
  released,
}

const enum WLabelState {
  default,
  hovered,
}

const enum DraggableFloatState {
  default,
  hovered,
  clicked,
  down,
  released,
}

class Label {
  bbox: BBox;
  color: Color;
  text: string;
  text_size: number;

  constructor(c: RENDERER, cursor: Cursor, color: Color, text: string, text_size: number) {
    c.font = text_size + "px ProggyCleanTT";
    const width = c.measureText(text).width;
    this.bbox = { left: cursor.x, top: cursor.y, right: cursor.x + width, bottom: cursor.y + text_size };
    this.color = {r: color.r, g: color.g, b: color.b, a: color.a};
    this.text = text;
    this.text_size = text_size;
  }

  render(c: RENDERER): void {
    c.font = this.text_size + "px ProggyCleanTT";
    c.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.color.a})`;
    c.strokeStyle = `rgba(${255}, ${0}, ${0}, ${1})`;
    c.textBaseline = "middle";
    c.textAlign = "center";

    const x = (this.bbox.left + this.bbox.right) / 2;
    const y = (this.bbox.top + this.bbox.bottom) / 2;
    c.fillText(this.text, x, y);
    // TEMP DEBUG
    // c.strokeRect(this.bbox.left, this.bbox.top, this.bbox.right - this.bbox.left, this.bbox.bottom - this.bbox.top);
  }
}

class Button implements Widget {
  bbox: BBox;
  label: Label;
  action_type: UIAction;
  style: ButtonStyle;
  state: ButtonState;
  widget_idx: number;

  constructor(c: RENDERER, idx: number, action_type: UIAction, cursor: Cursor, min_width: number, style: ButtonStyle, text: string) {
    this.action_type = action_type;
    this.widget_idx = idx;

    this.style = style;

    this.label = new Label(c, cursor, this.style.text_color, text, this.style.text_size);
    const label_width = this.label.bbox.right - this.label.bbox.left;

    this.bbox = {
      left: cursor.x,
      top: cursor.y,
      right: cursor.x + Math.max(min_width, label_width) + 2 * this.style.padding,
      bottom: cursor.y + this.style.text_size + 2 * this.style.padding,
    }

    const labelLeft = this.bbox.left + 0.5 * (MBBox.calcWidth(this.bbox) - label_width);
    const labelTop = this.bbox.top + 0.5 * (MBBox.calcHeight(this.bbox) - this.style.text_size);

    this.label.bbox.left = labelLeft;
    this.label.bbox.right = labelLeft + label_width;
    this.label.bbox.top = labelTop;
    this.label.bbox.bottom = labelTop + 0.5*this.style.text_size;

    this.state = ButtonState.default;
  }

  setInputState(input_state: InputState): WidgetStateReturn {
    const mouse_pos = input_state.mouse_position;
    const inside = MBBox.isInside(this.bbox, mouse_pos.x, mouse_pos.y);

    if (!inside && input_state.active_widget.widget_idx == this.widget_idx) {
      input_state.active_widget.widget_idx = -1;
      return {focus_window: false, action: UIAction.none};
    }

    if (!inside) {
      this.state = ButtonState.default;
      return {focus_window: false, action: UIAction.none};
    }

    if (input_state.active_widget.widget_idx != this.widget_idx && (input_state.frame_action.released)) {
      return {focus_window: false, action: UIAction.none};
    }

    if (input_state.frame_action.clicked) this.state = ButtonState.clicked;
    else if (input_state.mouse_down) this.state = ButtonState.down;
    else if (input_state.frame_action.released) this.state = ButtonState.released;
    else this.state = ButtonState.hovered;

    if (this.state != ButtonState.hovered)
      input_state.active_widget.widget_idx = this.widget_idx;

    if (this.state == ButtonState.clicked) {
      return { focus_window: true, action: UIAction.none };
    } else if (this.state == ButtonState.released) {
      return { focus_window: false, action: this.action_type };
    }

    return {focus_window: false, action: UIAction.none};

  }

  render(c: RENDERER): void {
    let color = this.style.default_color;
    if (this.state == ButtonState.hovered)
      color = this.style.hover_color;
    if (this.state == ButtonState.clicked || this.state == ButtonState.down || this.state == ButtonState.released)
      color = this.style.down_color;

    c.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
    c.fillRect(this.bbox.left, this.bbox.top, this.bbox.right - this.bbox.left, this.bbox.bottom - this.bbox.top);
    this.label.render(c);
  }


}

class WLabel implements Widget {
  bbox: BBox;
  action_type: UIAction;
  widget_idx: number;
  style: WLabelStyle;
  label: Label;
  state: WLabelState;

  constructor(c: RENDERER, idx: number, action_type: UIAction, cursor: Cursor, min_width: number, style: WLabelStyle, text: string) {
    this.action_type = action_type;
    this.widget_idx = idx;

    this.style = style;

    this.label = new Label(c, cursor, this.style.default_text_color, text, this.style.text_size);
    const label_width = this.label.bbox.right - this.label.bbox.left;

    this.bbox = {
      left: cursor.x,
      top: cursor.y,
      right: cursor.x + Math.max(min_width, label_width),
      bottom: cursor.y + this.style.text_size,
    }

    const width = this.bbox.right - this.bbox.left;
    const height = this.bbox.bottom - this.bbox.top;
    const labelLeft = this.bbox.left + 0.5 * (width - label_width);
    const labelTop = this.bbox.top + 0.5 * (height - this.style.text_size);

    this.label.bbox.left = labelLeft;
    this.label.bbox.right = labelLeft + label_width;
    this.label.bbox.top = labelTop;
    this.label.bbox.bottom = labelTop + 0.5*this.style.text_size;

    this.state = WLabelState.default;
  }

  setInputState(input_state: InputState): WidgetStateReturn {
    if (this.action_type == UIAction.none) return {focus_window: false, action: UIAction.none};
    const mouse_pos = input_state.mouse_position;
    const bounds = this.bbox;
    if (!(mouse_pos.x > bounds.left && mouse_pos.x < bounds.right && mouse_pos.y > bounds.top && mouse_pos.y < bounds.bottom)) {
      this.state = WLabelState.default;
      return {focus_window: false, action: UIAction.none};
    }

    this.state = WLabelState.hovered;

    return {focus_window: false, action: this.action_type};
  }

  render(c: RENDERER): void {
    if (this.state == WLabelState.hovered)
      this.label.color = this.style.hover_text_color;
    else
      this.label.color = this.style.default_text_color;

    this.label.render(c);

  }
}

class DraggableFloat implements Widget {
  bbox: BBox;
  action_type: UIAction;
  widget_idx: number;
  style: DraggableFloatStyle;
  label: Label;
  state: DraggableFloatState;

  constructor(c: RENDERER, idx: number, action_type: UIAction, cursor: Cursor, min_width: number, style: ButtonStyle, value: string) {
    this.action_type = action_type;
    this.widget_idx = idx;

    this.style = style;

    this.label = new Label(c, cursor, this.style.text_color, value, this.style.text_size);
    const label_width = this.label.bbox.right - this.label.bbox.left;

    this.bbox = {
      left: cursor.x,
      top: cursor.y,
      right: cursor.x + Math.max(min_width, label_width) + 2 * this.style.padding,
      bottom: cursor.y + this.style.text_size + 2 * this.style.padding,
    }

    const labelLeft = this.bbox.left + 0.5 * (MBBox.calcWidth(this.bbox) - label_width);
    const labelTop = this.bbox.top + 0.5 * (MBBox.calcHeight(this.bbox) - this.style.text_size);

    this.label.bbox.left = labelLeft;
    this.label.bbox.right = labelLeft + label_width;
    this.label.bbox.top = labelTop;
    this.label.bbox.bottom = labelTop + 0.5 * this.style.text_size;

    this.state = DraggableFloatState.default;
  }

  setInputState(input_state: InputState): WidgetStateReturn {
    const mouse_pos = input_state.mouse_position;

    const inside = MBBox.isInside(this.bbox, mouse_pos.x, mouse_pos.y);
    const same_idx = input_state.active_widget.widget_idx == this.widget_idx;

    if (inside && !input_state.mouse_down && !input_state.frame_action.released && !input_state.frame_action.clicked) {
      this.state = DraggableFloatState.hovered;
      return { focus_window: false, action: UIAction.none };
    }

    if (inside && input_state.frame_action.clicked) {
      this.state = DraggableFloatState.clicked;
      input_state.active_widget.widget_idx = this.widget_idx;
      return { focus_window: true, action: UIAction.RESPOND_TO_FLOATDRAG };
    }
    if (input_state.mouse_down && same_idx) {
      this.state = DraggableFloatState.down;
      return { focus_window: false, action: UIAction.RESPOND_TO_FLOATDRAG };
    }
    if (input_state.frame_action.released && same_idx) {
      this.state = DraggableFloatState.released;
      return { focus_window: false, action: UIAction.RESPOND_TO_FLOATDRAG };
    }

    return { focus_window: false, action: UIAction.none };

  }

  render(c: RENDERER): void {
    let color = this.style.default_color;
    if (this.state == DraggableFloatState.hovered)
      color = this.style.hover_color;
    if (this.state == DraggableFloatState.clicked || this.state == DraggableFloatState.down || this.state == DraggableFloatState.released)
      color = this.style.down_color;

    c.fillStyle = MColor.string(color);
    c.fillRect(this.bbox.left, this.bbox.top, this.bbox.right - this.bbox.left, this.bbox.bottom - this.bbox.top);
    this.label.render(c);
  }

}

class Persistent { // for persistent states
  c: RENDERER;
  input_state: InputState;
  window_data: PersistentWindowData[];

  constructor(canvas: HTMLCanvasElement, c: RENDERER, x: number, y: number) {
    this.c = c;
    this.input_state = new InputState(canvas, x, y);
    this.window_data = [];
  }

  getWindowDataIdx(window_id: number) {
    const idx = pers.window_data.findIndex(
      (data) => data.idx == window_id
    );
    return idx;
  }

  // FIX: height and width ==> dynamic ==> change window size.
  initWindow(layout: Layout, x: number, y: number, width: number, height: number, header: string) {
    let wind_idx = this.getWindowDataIdx(layout.windows.length);
    const window = new Window(layout.windows.length,
      wind_idx != -1 ? this.window_data[wind_idx].position.x : x,
      wind_idx != -1 ? this.window_data[wind_idx].position.y : y,
      width, height, header
    );
    layout.addWindow(pers.window_data, window);
    return pers.getWindowDataIdx(layout.windows.length - 1);
  }

}

class InputState {
  mouse_position: Cursor;
  mouse_down_position: Cursor;
  mouse_down: boolean;
  dragging_window: boolean;
  on_window: boolean;
  frame_action: {
    clicked: boolean;
    released: boolean;
  }

  active_widget: {
    window_idx: number,
    widget_idx: number,
  }

  constructor(canvas: HTMLCanvasElement, x: number, y: number) {
    this.mouse_position = { x, y };
    this.mouse_down_position = { x, y };
    this.mouse_down = false;
    this.dragging_window = false;
    this.on_window = false;
    this.frame_action = {
      clicked: false,
      released: false,
    }

    this.active_widget = {
      window_idx: -1,
      widget_idx: -1,
    }

    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.x;
      const y = e.clientY - rect.y;
      this.mouse_position.x = x;
      this.mouse_position.y = y;
    })

    canvas.addEventListener("mousedown", (e) => {
      this.frame_action.clicked = true;
      this.mouse_down = true;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.x;
      const y = e.clientY - rect.y;
      this.mouse_down_position.x = x;
      this.mouse_down_position.y = y;
    });

    canvas.addEventListener("mouseup", () => {
      this.frame_action.released = true;
      this.mouse_down = false;
      this.dragging_window = false;
    })
  }

  end() {
    this.frame_action.clicked = false;
    this.frame_action.released = false;
  }
}

class Header {
  bbox: BBox;
  style: HeaderStyle;
  text: string;

  constructor(x: number, y: number, style: HeaderStyle, text: string) {
    this.text = text;
    this.style = style;
    this.bbox = {
      left: x,
      top: y,
      bottom: y,
      right: x,
    };
  }

  render(c: RENDERER, focused: boolean) {
    if (focused)
      c.fillStyle = MColor.string(this.style.focused_bg_color);
    else
      c.fillStyle = MColor.string(this.style.default_bg_color);

    c.textBaseline = "middle";
    c.textAlign = "left";

    c.fillRect(this.bbox.left, this.bbox.top, MBBox.calcWidth(this.bbox), MBBox.calcHeight(this.bbox));
    c.font = this.style.text_size + "px ProggyCleanTT";
    c.fillStyle = MColor.string(this.style.text_color);
    c.fillText(this.text, this.bbox.left + 5, this.bbox.top + this.style.text_size / 4);
  }
}

class Window {
  header: Header;
  widgets: (Widget)[];
  pos: Cursor;
  cursor: Cursor;
  bbox: BBox;
  style: WindowStyle;
  layout_idx: number;
  min_width: number;
  min_height: number;

  constructor(layout_idx: number, x: number, y: number, min_width: number, min_height: number, header_text: string) {
    this.min_width = min_width;
    this.min_height = min_height;
    const header_style: HeaderStyle = {
      default_bg_color: { r: 14, g: 14, b: 14, a: 1 },
      focused_bg_color: { r: 42, g: 70, b: 115, a: 1 },
      text_size: 24,
      text_color: MColor.white,
    }

    const button_style: ButtonStyle = {
      text_color: MColor.white,
      text_size: 16,
      default_color: MColor.fromHex("#5e395c"),
      hover_color: MColor.fromHex("#a66ca3"),
      down_color: MColor.fromHex("#9c5498"),
      padding: 5,
    };

    const label_style: WLabelStyle = {
      text_size: 16,
      default_text_color: MColor.white,
      hover_text_color: {r: 128, g: 128, b: 128, a: 1},
    }

    const draggable_float_style: DraggableFloatStyle = {
      text_color: MColor.white,
      text_size: 16,
      default_color: button_style.default_color,
      hover_color: button_style.hover_color,
      down_color: button_style.down_color,
      padding: 4,
    }

    this.widgets = [];
    this.pos = { x: x, y: y };
    this.cursor = { x: x, y: y };
    this.bbox = { left: x, top: y, right: x, bottom: y };
    this.style = {
      padding: 10,
      bg_color: { r: 20, g: 20, b: 20, a: 0.9 },
      border_color: {r: 100, g: 100, b: 100, a: 1},
      border_width: 2,
      widget_gap: 5,
      header_style: header_style,
      button_style: button_style,
      label_style: label_style,
      draggable_float_style: draggable_float_style,
    };

    this.header = new Header(x, y, this.style.header_style, header_text);
    this.cursor.y += MBBox.calcHeight(this.header.bbox);
    this.layout_idx = layout_idx;
  }

  wadd(widget: Widget): void {
    this.widgets.push(widget);
    this.cursor.y += widget.bbox.bottom - widget.bbox.top + this.style.widget_gap;
  }

  makeButton(c: RENDERER, widget_states: WidgetState[], action_type: UIAction, min_width: number, off_text: string, on_text: string): void {
    let min_w = min_width;
    if (min_width == 0) {
      c.font = this.style.button_style.text_size + "px ProggyCleanTT";
      min_w = Math.max(c.measureText(off_text).width, c.measureText(on_text).width);
    }

    let button = new Button(c, this.widgets.length, action_type, this.cursor, min_w, this.style.button_style, off_text);
    if (widget_states.length < this.widgets.length + 1)
      widget_states.push({ start_value: false, value: false });
    else if (widget_states[this.widgets.length].value) {
      button = new Button(c, this.widgets.length, action_type, this.cursor, min_w, this.style.button_style, on_text);
    }
    this.wadd(button);
  }

  makeLabel(c: RENDERER, widget_states: WidgetState[], action_type: UIAction, min_width: number, text: string): void {
    let label = new WLabel(c, this.widgets.length, action_type, this.cursor, min_width, this.style.label_style, text);
    if (widget_states.length <= this.widgets.length)
      widget_states.push({ start_value: false, value: false });
    this.wadd(label);
  }

  makeDraggableFloat(c: RENDERER, widget_states: WidgetState[], action_type: UIAction, min_width: number, value: number): void {
    c.font = this.style.draggable_float_style.text_size + "px ProggyCleanTT";
    let width = Math.max(min_width, c.measureText("" + value).width);

    let draggable = new DraggableFloat(c, this.widgets.length, action_type, this.cursor, width, this.style.draggable_float_style, "<= " + value + " =>");
    if (widget_states.length <= this.widgets.length)
      widget_states.push({ start_value: value, value: value });
    else if (widget_states[this.widgets.length].value) {
    // else {
      draggable = new DraggableFloat(c, this.widgets.length, action_type, this.cursor, width, this.style.draggable_float_style, "<= " + widget_states[this.widgets.length].value + " =>");
    }
    this.wadd(draggable);
  }

  lockBBox() {
    for (let w of this.widgets) {
      if (w.bbox.left < this.bbox.left)
        this.bbox.left = w.bbox.left;
      if (w.bbox.right > this.bbox.right)
        this.bbox.right = w.bbox.right;
      if (w.bbox.top < this.bbox.top)
        this.bbox.top = w.bbox.top;
      if (w.bbox.bottom > this.bbox.bottom)
        this.bbox.bottom = w.bbox.bottom;
    }

    if (MBBox.calcWidth(this.bbox) < this.min_width) this.bbox.right = this.bbox.left + this.min_width;
    if (MBBox.calcHeight(this.bbox) < this.min_height) this.bbox.bottom = this.bbox.top + this.min_height;

    this.bbox.left -= this.style.padding;
    this.bbox.right += this.style.padding;
    this.bbox.top -= this.style.padding + this.style.header_style.text_size;
    this.bbox.bottom += this.style.padding;

    this.header.bbox.left = this.bbox.left;
    this.header.bbox.right = this.bbox.right;
    this.header.bbox.top = this.bbox.top;
    this.header.bbox.bottom = this.bbox.top + this.style.header_style.text_size;
  }

  render(c: RENDERER, focused: boolean) {
    const color = this.style.bg_color;
    c.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
    c.fillRect(this.bbox.left, this.bbox.top, this.bbox.right - this.bbox.left, this.bbox.bottom - this.bbox.top);
    this.header.render(c, focused);
    c.strokeStyle = MColor.string(this.style.border_color);
    c.lineWidth = this.style.border_width;
    c.strokeRect(this.bbox.left, this.bbox.top, this.bbox.right - this.bbox.left, this.bbox.bottom - this.bbox.top);
    for (var w of this.widgets) {
      w.render(c);
    }
  }

  handleActions(widget_states: WidgetState[], input_state: InputState): WidgetStateReturn {
    let focus = false;
    let action = UIAction.none;
    for (let wid of this.widgets) {
      const ret = wid.setInputState(input_state);
      // ret.focus_window ? focus = true : null;
      focus = ret.focus_window ? true : focus;
      if (ret.action != UIAction.none) {
        action = ret.action;
        input_state.active_widget.window_idx = this.layout_idx;
        console.log("WINDOWS");
      }

      const state = widget_states[wid.widget_idx];
      if (wid instanceof Button && ret.action == UIAction.RESPOND_TO_CLICK) {
        state.value = typeof state.value == "boolean" ? !state.value : state.value;
        if (wid.state == ButtonState.released)
          input_state.active_widget.widget_idx = -1;
      } else if (wid instanceof DraggableFloat && ret.action == UIAction.RESPOND_TO_FLOATDRAG) {
        state.value = (typeof state.value == "number" && typeof state.start_value == "number") ? input_state.mouse_position.x - input_state.mouse_down_position.x + state.start_value : state.value;
        if (wid.state == DraggableFloatState.released) {
          state.start_value = state.value;
          input_state.active_widget.widget_idx = -1;
        }
      }

      if (action != UIAction.none)
        break;

    }

    return { focus_window: focus, action };
  }


}

class Layout {
  windows: Window[];

  constructor() {
    this.windows = [];
  }

  addWindow(window_data: PersistentWindowData[], window: Window): void {
    this.windows.push(window);

    if (window_data.length < this.windows.length) {
      window_data.push({
        idx: window.layout_idx,
        position: window.pos,
        offset: {x: 0, y: 0},
        widget_states: [],
      });
    } else {
      const idx = window_data.findIndex(
        (data) => data.idx == window.layout_idx
      );
      window.pos.x = window_data[idx].position.x;
      window.pos.y = window_data[idx].position.y;
      window.cursor.x = window_data[idx].position.x;
      window.cursor.y = window_data[idx].position.y;
    }
  }

  render(canvas: HTMLCanvasElement, c: RENDERER, window_data: PersistentWindowData[]) {
    c.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = window_data.length - 1; i >= 0; i--) {
      this.windows[window_data[i].idx].render(c, i == 0);
    }
  }

  handleActions(window_data: PersistentWindowData[], input_state: InputState): void {
    const pos = input_state.mouse_position;

    console.log(input_state.active_widget.window_idx, input_state.active_widget.widget_idx);

    for (let i = 0; i < window_data.length; i++) {
      const curr_data = window_data[i];
      const window = this.windows[curr_data.idx];

      const res = window.handleActions(curr_data.widget_states, input_state);
      const inside = MBBox.isInside(window.bbox, pos.x, pos.y);

      if (res.focus_window) {
        input_state.on_window = true;
        window_data.splice(i, 1);
        window_data.unshift(curr_data);
        break;
      }

      if (res.action != UIAction.none) break;


      if (inside && input_state.frame_action.clicked) {
        window_data.splice(i, 1);
        window_data.unshift(curr_data);
        input_state.dragging_window = true;
        curr_data.offset.x = window.bbox.left - pos.x;
        curr_data.offset.y = window.bbox.top - pos.y;
      }

      if (input_state.mouse_down && input_state.dragging_window) {
        curr_data.position.x = pos.x + curr_data.offset.x + window.style.padding;
        curr_data.position.y = pos.y + curr_data.offset.y + window.style.padding + window.style.header_style.text_size;
        break;
      }

      if (inside) {
        input_state.on_window = true;
        break;
      }

      if (input_state.active_widget.widget_idx != -1 && input_state.active_widget.window_idx == window.layout_idx)
        break;

    }
  }

  lockWindows() {
    for (let win of this.windows) {
      win.lockBBox();
    }
  }

  getLastWindow() {
    return this.windows[this.windows.length - 1];
  }

}

const pers = new Persistent(canvas, <RENDERER>canvas.getContext("2d"), 0, 0);
const update = () => {
  updateCanvasSizing();

  const layout = new Layout();

  let id = pers.initWindow(layout, 200, 200, 400, 400, "Window 1");
  const window_1 = layout.getLastWindow();
  window_1.makeLabel(pers.c, pers.window_data[id].widget_states, UIAction.RESPOND_TO_HOVER, 0, "This is a very long test label");
  window_1.makeButton(pers.c, pers.window_data[id].widget_states, UIAction.RESPOND_TO_CLICK, 0, "off", "Shabaluba1");
  window_1.makeButton(pers.c, pers.window_data[id].widget_states, UIAction.RESPOND_TO_CLICK, 0, "off", "Shabaluba2");
  window_1.makeButton(pers.c, pers.window_data[id].widget_states, UIAction.RESPOND_TO_CLICK, 0, "off", "Shabaluba3");
  window_1.makeDraggableFloat(pers.c, pers.window_data[id].widget_states, UIAction.RESPOND_TO_FLOATDRAG, 150, 0.0);
  window_1.makeDraggableFloat(pers.c, pers.window_data[id].widget_states, UIAction.RESPOND_TO_FLOATDRAG, 150, 0.0);
  window_1.makeDraggableFloat(pers.c, pers.window_data[id].widget_states, UIAction.RESPOND_TO_FLOATDRAG, 150, 0.0);
  window_1.makeDraggableFloat(pers.c, pers.window_data[id].widget_states, UIAction.RESPOND_TO_FLOATDRAG, 150, 0.0);
  window_1.makeDraggableFloat(pers.c, pers.window_data[id].widget_states, UIAction.RESPOND_TO_FLOATDRAG, 150, 0.0);
  window_1.makeDraggableFloat(pers.c, pers.window_data[id].widget_states, UIAction.RESPOND_TO_FLOATDRAG, 150, 0.0);
  window_1.makeDraggableFloat(pers.c, pers.window_data[id].widget_states, UIAction.RESPOND_TO_FLOATDRAG, 150, 0.0);
  window_1.makeDraggableFloat(pers.c, pers.window_data[id].widget_states, UIAction.RESPOND_TO_FLOATDRAG, 150, 0.0);
  window_1.makeLabel(pers.c, pers.window_data[id].widget_states, UIAction.none, 0, "Hello, World! 2!!!");
  window_1.makeButton(pers.c, pers.window_data[id].widget_states, UIAction.RESPOND_TO_CLICK, 0, "off", "on");

  id = pers.initWindow(layout, 800, 200, 200, 400, "Window 2");
  const window_2 = layout.getLastWindow();
  window_2.makeLabel(pers.c, pers.window_data[id].widget_states, UIAction.none, 0, "This is an incredibly long label to test overshooting??");
  window_2.makeButton(pers.c, pers.window_data[id].widget_states, UIAction.RESPOND_TO_CLICK, 100, "off", "on");
  window_2.makeLabel(pers.c, pers.window_data[id].widget_states, UIAction.none, 0, "Draggable float widget:");
  window_2.makeDraggableFloat(pers.c, pers.window_data[id].widget_states, UIAction.RESPOND_TO_FLOATDRAG, 100, 100);
  window_2.makeLabel(pers.c, pers.window_data[id].widget_states, UIAction.none, 0, "float:");
  window_2.makeDraggableFloat(pers.c, pers.window_data[id].widget_states, UIAction.RESPOND_TO_FLOATDRAG, 150, 150);
  window_2.makeButton(pers.c, pers.window_data[id].widget_states, UIAction.RESPOND_TO_CLICK, 0, "off", "on");

  layout.lockWindows();
  layout.handleActions(pers.window_data, pers.input_state);

  layout.render(canvas, pers.c, pers.window_data);

  pers.input_state.end();

  requestAnimationFrame(update);
}

update();
