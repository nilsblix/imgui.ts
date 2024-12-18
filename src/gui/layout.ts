import { REND, N, WidgetLoc, Cursor, BBox, MBBox, MColor, Widget, GlobalStyle, InputState } from "./basics.ts";
import { Label } from "./label.ts";
import { Button } from "./button.ts";

class Header<ActionType> implements Widget<ActionType> {
  bbox: BBox;
  action_type: ActionType;
  loc: WidgetLoc;
  widgets: Widget<ActionType>[];
  title: string;
  title_font_size: number;

  constructor(loc: WidgetLoc, action_type: ActionType, title: string, x: number, y: number, width: number) {
    this.action_type = action_type;
    this.title = title;
    this.title_font_size = GlobalStyle.header.font_size;
    this.bbox = {
      left: x,
      top: y,
      right: x + width,
      bottom: y + GlobalStyle.header.font_size,
    }
    this.loc = loc;
    this.widgets = [];
  }

  render(c: REND) {
    c.fillStyle = GlobalStyle.header.bg_color;
    c.fillRect(this.bbox.left, this.bbox.top, MBBox.calcWidth(this.bbox), MBBox.calcHeight(this.bbox));

    c.font = this.title_font_size + "px " + GlobalStyle.font;
    c.fillStyle = GlobalStyle.header.color;
    c.textBaseline = "middle";
    c.textAlign = "left";

    // const x = (this.bbox.left + this.bbox.right) / 2;
    const x = this.bbox.left + GlobalStyle.layout.widget_gap;
    const y = (this.bbox.top + this.bbox.bottom) / 2 - MBBox.calcHeight(this.bbox) / 4;
    c.fillText(this.title, x, y);
  }

  requestAction(input_state: InputState): N<ActionType> {
    // FIX: TODO: double click should dispatch default close action
    const x = input_state.mouse_position.x;
    x ?? null;
    return null;
  }

}

export class Layout<ActionType> implements Widget<ActionType> {
  bbox: BBox;
  action_type: ActionType;
  loc: WidgetLoc;
  widgets: Widget<ActionType>[];
  cursor: Cursor;

  constructor(action_type: ActionType, loc: WidgetLoc, x: number, y: number, width: number, height: number, title: string) {
    this.cursor = { x: x, y: y };

    this.bbox = { left: x, top: y, right: x + width, bottom: y + height };

    this.action_type = action_type;
    this.loc = loc;
    this.widgets = [];

    const header_loc = loc.concat([]);
    header_loc.push(0);

    const header = new Header(header_loc, action_type, title, this.cursor.x, this.cursor.y, 10);
    this.pushWidget(header);

    this.cursor.x += GlobalStyle.layout.padding;
  }

  pushWidget(widget: Widget<ActionType>) {
    this.widgets.push(widget);
    this.cursor.y += MBBox.calcHeight(widget.bbox) + GlobalStyle.layout.widget_gap;
  }

  render(c: REND): void {
    c.fillStyle = MColor.string(GlobalStyle.layout.bg_color);
    c.fillRect(this.bbox.left, this.bbox.top, MBBox.calcWidth(this.bbox), MBBox.calcHeight(this.bbox));

    c.strokeStyle = GlobalStyle.layout.border;
    c.lineWidth = 1;
    c.strokeRect(this.bbox.left, this.bbox.top, MBBox.calcWidth(this.bbox), MBBox.calcHeight(this.bbox));

    for (let widget of this.widgets) {
      widget.render(c);
    }
  }

  requestAction(input_state: InputState): N<ActionType> {
    if (this.action_type == null)
      return null;

    const [x, y] = [input_state.mouse_position.x, input_state.mouse_position.y];
    const inside = MBBox.isInside(this.bbox, x, y);

    if (!input_state.moving_window) {
      for (let widget of this.widgets) {
        // FIX: CASTING HELL
        const ret = <N<ActionType>>widget.requestAction(input_state);
        if (ret != null)
          return ret;
      }
    }

    if (JSON.stringify(input_state.active_widget_loc) != JSON.stringify([]) && JSON.stringify(input_state.active_widget_loc) != JSON.stringify(this.loc))
      return null;

    if (inside && input_state.mouse_frame.clicked) {
      input_state.moving_window = true;
      input_state.active_widget_loc = this.loc;
    }

    if (input_state.moving_window && input_state.mouse_frame.released) {
      input_state.moving_window = false;
      input_state.active_widget_loc = [];
    }

    return null;

  };

  updateBBox() {
    for (let widget of this.widgets) {
      if (widget.bbox.left < this.bbox.left)
        this.bbox.left = widget.bbox.left;
      if (widget.bbox.right > this.bbox.right)
        this.bbox.right = widget.bbox.right;
      if (widget.bbox.top < this.bbox.top)
        this.bbox.top = widget.bbox.top;
      if (widget.bbox.bottom > this.bbox.bottom)
        this.bbox.bottom = widget.bbox.bottom;

      this.bbox.right += 0.5 * GlobalStyle.layout.padding;
      this.bbox.bottom += 0.5 * GlobalStyle.layout.padding;

      this.widgets[0].bbox.right = this.bbox.right;

    }
  }

  makeLabel(c: REND, action_type: ActionType, text: string): Label<ActionType> {
    const label = new Label(c, action_type, this.loc.concat([this.widgets.length - 1]), this.cursor, text);
    this.pushWidget(label);
    return label;
  }

  makeButton(c: REND, action_type: ActionType, text: string): Button<ActionType> {
    const button = new Button(c, action_type, this.loc.concat([this.widgets.length - 1]), this.cursor, text);
    this.pushWidget(button);
    return button;
  }

}
