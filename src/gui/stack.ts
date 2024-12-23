import { REND, N, BBox, MBBox, Widget, InputState, WidgetLoc } from "./basics.ts";
import { Layout } from "./layout.ts";

export class Stack<ActionType> implements Widget<ActionType> { // root
  bbox: BBox;
  widgets: Widget<ActionType>[]; // is actually layouts
  loc: WidgetLoc;

  constructor() {
    this.bbox = {left: 0, right: 0, top: 0, bottom: 0};
    this.widgets = [];
    this.loc = [-1];
  }

  render(c: REND): void {
    c.lineWidth = 1;
  }

  stack_render(c: REND, input_state: InputState) {
    for (let o = input_state.window_order.length - 1; o >= 0; o--) {
      const i = input_state.window_order[o];
      this.widgets[i].render(c);
    }
  }

  makeLayout(input_state: InputState, action_type: ActionType, x: number, y: number, width: number, height: number, title: string): Layout<ActionType> {
    const idx = this.widgets.length;

    if (input_state.window_offsets.length <= this.widgets.length) {
      input_state.window_offsets.push({ x: 0, y: 0 });
      input_state.window_positions.push({ x: x, y: y });
      input_state.window_order.unshift(idx);
    }

    const lay = new Layout<ActionType>(action_type, [idx], input_state.window_positions[idx].x, input_state.window_positions[idx].y, width, height, title);
    this.widgets.push(lay);

    return lay;
  }

  requestAction(input_state: InputState): { wants_focus: boolean, action: N<ActionType> } {
    for (let o = 0; o < input_state.window_order.length; o++) {
      const i = input_state.window_order[o];
      const widget = this.widgets[i];
      const action = widget.requestAction(input_state);

      if (action.wants_focus) {
        input_state.window_order.splice(o, 1);
        input_state.window_order.unshift(i);
      }

      if (input_state.moving_window && JSON.stringify(input_state.active_widget_loc) === JSON.stringify(widget.loc)) {
        if (input_state.mouse_frame.clicked) {
          input_state.window_order.splice(o, 1);
          input_state.window_order.unshift(i);
          input_state.window_offsets[i].x = widget.bbox.left - input_state.mouse_position.x;
          input_state.window_offsets[i].y = widget.bbox.top - input_state.mouse_position.y;
        } else if (input_state.mouse_down) {
          input_state.window_positions[i].x = input_state.window_offsets[i].x + input_state.mouse_position.x;
          input_state.window_positions[i].y = input_state.window_offsets[i].y + input_state.mouse_position.y;
        }
        break;
      }

      if (action.action == null && (!MBBox.isInside(widget.bbox, input_state.mouse_position.x, input_state.mouse_position.y) || input_state.moving_window))
        continue;
      return action;
    }
    return { wants_focus: false, action: null };
  }
}
