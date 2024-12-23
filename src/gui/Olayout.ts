import { REND, N, WidgetLoc, Cursor, BBox, MBBox, MColor, Widget, GlobalStyle, InputState } from "./gui.ts";
import { Label } from "./basic_widgets/label.ts";
import { Button } from "./basic_widgets/button.ts";
import { Draggable } from "./basic_widgets/draggable.ts";
import { Text } from "./basic_widgets/text.ts";

export class Header<ActionType> implements Widget<ActionType> {
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

    const x = this.bbox.left + GlobalStyle.layout.widget_gap;
    const y = (this.bbox.top + this.bbox.bottom) / 2 - MBBox.calcHeight(this.bbox) / 4;
    c.fillText(this.title, x, y);
  }

  requestAction(input_state: InputState): { wants_focus: boolean, action: N<ActionType> } {
    // FIX: TODO: double click should dispatch default close action
    const x = input_state.mouse_position.x;
    x ?? null;
    return { wants_focus: false, action: null };
  }

}

const enum LayoutState {
  window,
  popup,
  grid
}

export class Layout<ActionType> implements Widget<ActionType> {
  bbox: BBox;
  action_type: ActionType;
  loc: WidgetLoc;
  widgets: Widget<ActionType>[];
  cursor: Cursor;
  state: LayoutState;
  tools: {
    columns: number,
  }

  constructor(action_type: ActionType, loc: WidgetLoc, x: number, y: number, width: number, height: number, title: string) {
    this.cursor = { x: x + GlobalStyle.layout.padding, y: y };
    this.state = LayoutState.window;
    this.tools = { columns: -1 };

    this.bbox = { left: x, top: y, right: x + width, bottom: y + height };

    this.action_type = action_type;
    this.loc = loc;
    this.widgets = [];

    const header_loc = loc.concat([]);
    header_loc.push(0);

    const header = new Header(header_loc, action_type, title, this.cursor.x, this.cursor.y, 10);
    this.widgets.push(header);
    this.cursor.y += MBBox.calcHeight(header.bbox) + GlobalStyle.layout.widget_gap;
  }

  pushWidget(widget: Widget<ActionType>) {
    this.widgets.push(widget);
    this.updateBBox(widget);
    switch (this.state) {
      case LayoutState.window:
        this.cursor.y += MBBox.calcHeight(widget.bbox) + GlobalStyle.layout.widget_gap;
        break;
      case LayoutState.popup:
        this.cursor.y += MBBox.calcHeight(widget.bbox) + GlobalStyle.layout.widget_gap;
        break;
      case LayoutState.grid:
        const offset = this.widgets[0] instanceof Header ? -1 : 0;
        if ((this.widgets.length + offset) % this.tools.columns == 0) {
          let row_height = 0;
          for (let i = this.widgets.length - this.tools.columns; i < this.widgets.length; i++) {
            const h = MBBox.calcHeight(this.widgets[i].bbox)
            if (h > row_height)
              row_height = h;
          }
          this.cursor.x = this.bbox.left + GlobalStyle.layout.padding;
          this.cursor.y += row_height + GlobalStyle.grid.widget_gap;
        } else {
          this.cursor.x = this.bbox.left + GlobalStyle.grid.widget_gap + (this.widgets.length + offset) % this.tools.columns * MBBox.calcWidth(this.bbox) / this.tools.columns;
        }
        break;
    }
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

  requestAction(input_state: InputState): { wants_focus: boolean, action: N<ActionType> } {
    const is_candidate_for_active = (widget: Widget<ActionType>) => {
      if (input_state.active_widget_loc.length === 0) return true;
      const activePath = input_state.active_widget_loc.slice(0, widget.loc.length);
      return activePath.length === widget.loc.length && activePath.every((v, i) => v === widget.loc[i]);
    };

    // FIXME: this might have to be activated when working with popups again
    // if (!is_candidate_for_active(this)) {
    //   return { wants_focus: false, action: null };
    // }

    const [x, y] = [input_state.mouse_position.x, input_state.mouse_position.y];
    const inside = MBBox.isInside(this.bbox, x, y);

    if (!input_state.moving_window) {
      for (let widget of this.widgets) {
        if (!is_candidate_for_active(widget)) {
          continue;
        }
        const ret = widget.requestAction(input_state);
        if (ret.wants_focus || ret.action != null)
          return ret;
      }
    }

    if (this.action_type == null) {
      if (inside && input_state.mouse_frame.clicked)
        return { wants_focus: true, action: null };
    }

    if (input_state.active_widget_loc.length > 1 && JSON.stringify(input_state.active_widget_loc) != JSON.stringify(this.loc)) {
      input_state.active_widget_loc = [];
      return { wants_focus: false, action: null };
    }

    if (inside && input_state.mouse_frame.clicked) {
      input_state.moving_window = true;
      input_state.active_widget_loc = this.loc;
    }

    if (input_state.moving_window && input_state.mouse_frame.released) {
      input_state.moving_window = false;
      input_state.active_widget_loc = [];
    }

    return { wants_focus: false, action: null };

  };

  updateBBox(widget: Widget<ActionType>) {
    const p = GlobalStyle.layout.padding;

    if (widget.bbox.left < this.bbox.left + p) {
      this.bbox.left = widget.bbox.left - (this.state == LayoutState.grid ? 0 : p);
    }
    if (widget.bbox.right > this.bbox.right - (this.state == LayoutState.grid ? 0 : p)) {
      this.bbox.right = widget.bbox.right + p;
    }
    if (widget.bbox.top < this.bbox.top + p) {
      this.bbox.top = widget.bbox.top - p;
    }
    if (widget.bbox.bottom > this.bbox.bottom - p) {
      this.bbox.bottom = widget.bbox.bottom + p;
    }

    if (this.widgets[0] instanceof Header) {
      this.widgets[0].bbox.left = this.bbox.left;
      this.widgets[0].bbox.right = this.bbox.right;
    }
  }

  makeLabel(c: REND, action_type: ActionType, text: string): Label<ActionType> {
    const label = new Label<ActionType>(c, action_type, this.loc.concat([this.widgets.length]), this.cursor, text);
    this.pushWidget(label);
    return label;
  }

  makeButton(c: REND, action_type: ActionType, text: string): Button<ActionType> {
    const button = new Button<ActionType>(c, action_type, this.loc.concat([this.widgets.length]), this.cursor, text);
    this.pushWidget(button);
    return button;
  }

  makeDraggable(c: REND, action_type: ActionType, text: string): Draggable<ActionType> {
    const draggable = new Draggable<ActionType>(c, action_type, this.loc.concat([this.widgets.length]), this.cursor, text);
    this.pushWidget(draggable);
    return draggable;
  }

  makeText(c: REND, action_type: ActionType, text: string, max_width: number): Text<ActionType> {
    const wtext = new Text<ActionType>(c, action_type, this.loc.concat([this.widgets.length]), this.cursor, text, max_width);
    this.pushWidget(wtext);
    return wtext;
  }

  makePopup(action_type: ActionType, x: number, y: number): Layout<ActionType> {
    const pop = new Layout<ActionType>(action_type, this.loc.concat([this.widgets.length]), x, y, 0, 0, "");
    pop.state = LayoutState.popup;
    pop.cursor.y -= MBBox.calcHeight(pop.widgets[0].bbox) + GlobalStyle.layout.widget_gap - GlobalStyle.layout.padding;
    pop.widgets = [];
    this.widgets.push(pop);
    return pop;
  }

  makeGrid(action_type: ActionType, columns: number, relative_width: number, title?: string): Layout<ActionType> {
    const grid = new Layout<ActionType>(action_type, this.loc.concat([this.widgets.length]), this.cursor.x, this.cursor.y, relative_width * (MBBox.calcWidth(this.bbox) - 2 * GlobalStyle.layout.padding), 0, title ?? "");
    if (!title) {
      grid.cursor.y -= MBBox.calcHeight(grid.widgets[0].bbox) + GlobalStyle.layout.widget_gap - GlobalStyle.layout.padding;
      grid.widgets = [];
    }
    grid.tools.columns = columns;
    grid.state = LayoutState.grid;
    this.pushWidget(grid);
    return grid;
  }

  resetCursor(): void {
    this.cursor.x = this.bbox.left + GlobalStyle.layout.padding;
    this.cursor.y = this.bbox.bottom;
    // switch (this.state) {
    //   case LayoutState.grid:
    //     break;
    // }
  }

}
