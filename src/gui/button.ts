import { REND, N, WidgetLoc, Cursor, BBox, MBBox, MColor, Widget, GlobalStyle, InputState } from "./basics.ts";

const enum ButtonState {
  default,
  hovered,
  clicked,
  down,
  released,
}

export class Button<ActionType> implements Widget<ActionType> {
  bbox: BBox;
  action_type: ActionType;
  loc: WidgetLoc;
  widgets: Widget<ActionType>[];
  text: string;
  state: ButtonState;

  constructor(c: REND, action_type: ActionType, loc: WidgetLoc, cursor: Cursor, text: string) {
    c.font = GlobalStyle.button.font_size + "px " + GlobalStyle.font;
    c.textBaseline = "middle";
    const m = c.measureText(text);
    const width = m.width;
    const height = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;
    this.bbox = { left: cursor.x, top: cursor.y, right: cursor.x + width + 2 * GlobalStyle.button.padding, bottom: cursor.y + height + 2 * GlobalStyle.button.padding };
    this.text = text;
    this.action_type = action_type;
    this.state = ButtonState.default;
    this.loc = loc;
    this.widgets = [];
  }

  render(c: REND): void {
    let color = GlobalStyle.widget.default_bg_color;
    if (this.state == ButtonState.hovered)
      color = GlobalStyle.widget.hover_bg_color;
    if (this.state == ButtonState.clicked)
      color = GlobalStyle.widget.down_bg_color;
    if (this.state == ButtonState.down)
      color = GlobalStyle.widget.down_bg_color;
    if (this.state == ButtonState.released)
      color = GlobalStyle.widget.down_bg_color;

    c.fillStyle = color;
    c.fillRect(this.bbox.left, this.bbox.top, MBBox.calcWidth(this.bbox), MBBox.calcHeight(this.bbox));

    c.font = GlobalStyle.button.font_size + "px " + GlobalStyle.font;
    c.fillStyle = MColor.string(MColor.white);
    c.textBaseline = "middle";
    c.textAlign = "center";

    const x = (this.bbox.left + this.bbox.right) / 2;
    const y = (this.bbox.top + this.bbox.bottom) / 2 - GlobalStyle.button.font_size * 0.25; // Adjust 0.3 as needed
    c.fillText(this.text, x, y);


  }

  requestAction(input_state: InputState): N<ActionType> {
    if (this.action_type == null)
      return null;

    const [x, y] = [input_state.mouse_position.x, input_state.mouse_position.y];

    if (MBBox.isInside(this.bbox, x, y) && this.action_type != null) {
      if (input_state.mouse_frame.clicked) {
        this.state = ButtonState.clicked;
        input_state.active_widget_loc = this.loc;
      } else if (input_state.mouse_frame.released) {
        this.state = ButtonState.released;
        input_state.active_widget_loc = [];
      } else if (input_state.mouse_down)
        this.state = ButtonState.down;
      else
        this.state = ButtonState.hovered;
    }

    if (this.state == ButtonState.released) {
      return this.action_type;
    }

    for (let widget of this.widgets) {
      // FIX: CASTING HELL
      const ret = <N<ActionType>>widget.requestAction(input_state);
      if (ret != null)
        return ret;
    }

    return null;

  };

}
