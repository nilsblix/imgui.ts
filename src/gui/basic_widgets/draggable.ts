import { REND, N, WidgetLoc, Cursor, BBox, MBBox, MColor, Widget, GlobalStyle, InputState } from "../gui.ts";

const enum DraggableState {
  default,
  hovered,
  clicked,
  down,
  released,
}

export class Draggable<ActionType> implements Widget<ActionType> {
  bbox: BBox;
  action_type: ActionType;
  loc: WidgetLoc;
  widgets: Widget<ActionType>[];
  text: string;
  state: DraggableState;

  constructor(c: REND, action_type: ActionType, loc: WidgetLoc, cursor: Cursor, text: string) {
    c.font = GlobalStyle.button.font_size + "px " + GlobalStyle.font;
    c.textBaseline = "middle";
    const m = c.measureText(text);
    const width = m.width;
    const height = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;
    this.bbox = { left: cursor.x, top: cursor.y, right: cursor.x + width + 2 * GlobalStyle.button.padding, bottom: cursor.y + height + 2 * GlobalStyle.button.padding };
    this.text = text;
    this.action_type = action_type;
    this.state = DraggableState.default;
    this.loc = loc;
    this.widgets = [];
  }

  render(c: REND): void {
    let color = GlobalStyle.widget.default_bg_color;
    if (this.state == DraggableState.hovered)
      color = GlobalStyle.widget.hover_bg_color;
    if (this.state == DraggableState.clicked)
      color = GlobalStyle.widget.down_bg_color;
    if (this.state == DraggableState.down)
      color = GlobalStyle.widget.down_bg_color;
    if (this.state == DraggableState.released)
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

  requestAction(input_state: InputState): { wants_focus: boolean, action: N<ActionType> } {
    if (this.action_type == null)
      return { wants_focus: false, action: null };
    const [x, y] = [input_state.mouse_position.x, input_state.mouse_position.y];

    const inside = MBBox.isInside(this.bbox, x, y);

    if (inside && input_state.mouse_frame.clicked) {
      this.state = DraggableState.clicked;
      input_state.active_widget_loc = JSON.parse(JSON.stringify(this.loc));
    } else if (JSON.stringify(input_state.active_widget_loc) == JSON.stringify(this.loc)&& input_state.mouse_frame.released) {
      this.state = DraggableState.released;
    } else if (JSON.stringify(input_state.active_widget_loc) == JSON.stringify(this.loc) && input_state.mouse_down) {
      this.state = DraggableState.down;
    } else if (inside) {
      this.state = DraggableState.hovered;
    }

    if (this.state == DraggableState.clicked || this.state == DraggableState.down)
      return { wants_focus: true, action: this.action_type };
    if (this.state == DraggableState.released)
      return { wants_focus: false, action: this.action_type };

    for (let widget of this.widgets) {
      const ret = widget.requestAction(input_state);
      if (ret.wants_focus || ret.action != null )
        return ret;
    }

    return { wants_focus: false, action: null };

  };

}
