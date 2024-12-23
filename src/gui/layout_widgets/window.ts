import { REND, N, WidgetLoc, Cursor, BBox, MBBox, MColor, Widget, GlobalStyle, InputState } from "../gui.ts";
import { Layout, Header } from "./layout.ts";

export class Window<ActionType> extends Layout<ActionType> implements Widget<ActionType> {
  header: Header<ActionType>;
  constructor(action_type: ActionType, loc: WidgetLoc, x: number, y: number, width: number, height: number, title: string) {
    super(action_type, loc, x, y, width, height);

    const header_loc = loc.concat([]);
    header_loc.push(0);

    const header = new Header(header_loc, action_type, title, this.cursor.x, this.cursor.y, 10);
    this.header = header;
    this.cursor.y += MBBox.calcHeight(header.bbox) + GlobalStyle.layout_commons.widget_gap;
  }

  updateBBox(widget: Widget<ActionType>): void {
    const p = GlobalStyle.layout_commons.padding;

    if (widget.bbox.left < this.bbox.left + p) {
      this.bbox.left = widget.bbox.left - p;
    } if (widget.bbox.top < this.bbox.top + p) {
      this.bbox.top = widget.bbox.top - p;
    } if (widget.bbox.right > this.bbox.right - p) {
      this.bbox.right = widget.bbox.right + p;
    } if (widget.bbox.bottom > this.bbox.bottom - p) {
      this.bbox.bottom = widget.bbox.bottom + p;
    }

    this.header.bbox.left = this.bbox.left;
    this.header.bbox.right = this.bbox.right;
  }

  pushWidget(widget: Widget<ActionType>): void {
    super.pushWidget(widget);
    this.updateBBox(widget);
    this.cursor.y += MBBox.calcHeight(widget.bbox) + GlobalStyle.layout_commons.widget_gap;
  }

  render(c: REND): void {
    c.fillStyle = MColor.string(GlobalStyle.layout_commons.bg_color);
    c.fillRect(this.bbox.left, this.bbox.top, MBBox.calcWidth(this.bbox), MBBox.calcHeight(this.bbox));
    c.strokeStyle = GlobalStyle.layout_commons.border;
    c.lineWidth = 1;
    c.strokeRect(this.bbox.left, this.bbox.top, MBBox.calcWidth(this.bbox), MBBox.calcHeight(this.bbox));

    this.header.render(c);

    super.render(c);
  }

}
