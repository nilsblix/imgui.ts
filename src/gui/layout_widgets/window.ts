import { REND, WidgetLoc, MBBox, MColor, Widget, GlobalStyle, InputState, N } from "../gui.ts";
import { Layout, Header } from "./layout.ts";
import { Draggable } from "../basic_widgets/draggable.ts";

export class Window<ActionType> extends Layout<ActionType> implements Widget<ActionType> {
  header: Header<ActionType>;
  resizeable: N<Draggable<ActionType>>;
  min_size: { width: number, height: number };
  constructor(c: REND, window_action_type: ActionType, resizeable_action_type: ActionType, loc: WidgetLoc, x: number, y: number, width: number, height: number, title: string, min_size: {width: number, height: number}) {
    super(window_action_type, loc, x, y, width, height);

    const header_loc = loc.concat([]);
    header_loc.push(0);

    const header = new Header(header_loc, window_action_type, title, this.cursor.x, this.cursor.y, 10);
    this.header = header;
    this.cursor.y += MBBox.calcHeight(header.bbox) + GlobalStyle.layout_commons.widget_gap;

    const btn_loc = this.loc.concat([]);
    btn_loc.push(0);

    if (resizeable_action_type != null)
      this.resizeable = new Draggable<ActionType>(c, resizeable_action_type, btn_loc, { x: this.bbox.right - 27, y: this.bbox.bottom - 20 }, "res");
    else
      this.resizeable = null;

    this.min_size = min_size;

    this.header.bbox.left = this.bbox.left;
    this.header.bbox.right = this.bbox.right;
  }

  updateBBox(): void {}

  pushWidget(widget: Widget<ActionType>): void {
    super.pushWidget(widget);
    this.cursor.y += MBBox.calcHeight(widget.bbox) + GlobalStyle.layout_commons.widget_gap;
  }

  render(c: REND): void {
    c.save();

    c.beginPath();
    c.rect(this.bbox.left, this.bbox.top, MBBox.calcWidth(this.bbox), MBBox.calcHeight(this.bbox));
    c.clip();
    c.closePath();

    c.fillStyle = MColor.string(GlobalStyle.layout_commons.bg_color);
    c.fillRect(this.bbox.left, this.bbox.top, MBBox.calcWidth(this.bbox), MBBox.calcHeight(this.bbox));

    this.header.render(c);
    c.strokeStyle = GlobalStyle.layout_commons.border;
    c.lineWidth = 1;
    c.strokeRect(this.bbox.left, this.bbox.top, MBBox.calcWidth(this.bbox), MBBox.calcHeight(this.bbox));
    super.render(c);
    this.resizeable?.render(c);

    c.restore();
  }

  requestAction(input_state: InputState): { resize: boolean, wants_focus: boolean; action: N<ActionType>; } {

    if (this.resizeable != null) {
      const rez = this.resizeable.requestAction(input_state);
      if (rez.wants_focus || rez.action != null) {
        input_state.active_widget_loc = this.resizeable.loc;
        return { resize: true, wants_focus: true, action: rez.action };
      }
      if (MBBox.isInside(this.resizeable.bbox, input_state.mouse_position.x, input_state.mouse_position.y))
        return { resize: false, wants_focus: false, action: null };
    }

    const ret = super.requestAction(input_state);
    return { resize: false, ...ret }
  }

}
