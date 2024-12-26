import { REND, WidgetLoc, MBBox, MColor, Widget, GlobalStyle } from "../gui.ts";
import { Layout } from "./layout.ts";

export class Grid<ActionType> extends Layout<ActionType> implements Widget<ActionType> {
  columns: number;

  constructor(action_type: ActionType, loc: WidgetLoc, x: number, y: number, width: number, columns: number) {
    super(action_type, loc, x, y, width, 0);

    this.columns = columns;
  }

  updateBBox(widget: Widget<ActionType>): void {
    const p = GlobalStyle.layout_commons.padding;

    if (widget.bbox.top < this.bbox.top + p) {
      this.bbox.top = widget.bbox.top - p;
    } if (widget.bbox.bottom > this.bbox.bottom - p) {
      this.bbox.bottom = widget.bbox.bottom + p;
    }
  }

  pushWidget(widget: Widget<ActionType>): void {
    super.pushWidget(widget);
    this.updateBBox(widget);

    const col = this.widgets.length % this.columns;
    if (col == 0) { // ==> switch row
      let bot = Number.NEGATIVE_INFINITY;
      for (let i = this.widgets.length - this.columns; i < this.widgets.length; i++) {
        if (this.widgets[i].bbox.bottom > bot)
          bot = this.widgets[i].bbox.bottom;
      }
      this.cursor.x = this.bbox.left + GlobalStyle.layout_commons.padding;
      this.cursor.y = bot + GlobalStyle.layout_commons.widget_gap;
      return;
    }

    this.cursor.x += MBBox.calcWidth(this.bbox) / this.columns;

  }

  render(c: REND): void {
    c.fillStyle = MColor.string(GlobalStyle.layout_commons.bg_color);
    c.fillRect(this.bbox.left, this.bbox.top, MBBox.calcWidth(this.bbox), MBBox.calcHeight(this.bbox));
    c.strokeStyle = GlobalStyle.layout_commons.border;
    c.lineWidth = 1;
    c.strokeRect(this.bbox.left, this.bbox.top, MBBox.calcWidth(this.bbox), MBBox.calcHeight(this.bbox));

    super.render(c);
  }

}
