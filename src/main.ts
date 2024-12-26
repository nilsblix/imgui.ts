import * as gui from "./gui/gui.ts";

// USER BASED THING.
// NOT PART OF GUI FRAMEWORK // USER

enum UIAction {
  placeholder,
  increment,
  decrement,
  add_new_window,
  drag_num,
  drag_text_wrap_width,
  HIGH_drag_text_wrap_width,
  bg_color_r, bg_color_g, bg_color_b,
}

const c = <gui.REND>gui.canvas.getContext("2d");
const input_state = new gui.InputState(gui.canvas, 0, 0);

let num = 0;
let dt = -1;
let last_time = 0;
let frame_time = -1;
let num_windows = 1;

let make_time = -1;
let action_time = -1;
let render_time = -1;

let text_wrap_width = 400;

let bg_color: gui.Color = { r: gui.MColor.white.r, g: gui.MColor.white.g, b: gui.MColor.white.b, a: 1 };

function update() {
  document.body.style.backgroundColor = gui.MColor.string(bg_color);

  const st = performance.now();

  gui.updateCanvasSizing();

  const stack = new gui.Stack<gui.N<UIAction>>();

  const mst = performance.now();

  const q = stack.makeWindow(c, input_state, null, null, {title: "debug info"});
  q.makeLabel(c, null, "gui-time = " + dt.toFixed(2));
  q.makeLabel(c, null, "frt = " + frame_time.toFixed(4));
  q.makeLabel(c, null, "active loc = " + input_state.active_widget_loc);
  q.makeLabel(c, null, "resizing = " + input_state.resizing_window);
  q.makeLabel(c, null, "make_dt = " + make_time.toFixed(4));
  q.makeLabel(c, null, "action_dt = " + action_time.toFixed(4));
  q.makeLabel(c, null, "render_dt = " + render_time.toFixed(4));

  for (let i = 0; i < num_windows; i++) {
    if (i == 0) {
      const l = stack.makeWindow(c, input_state, UIAction.placeholder, UIAction.placeholder, {title: "window 1", x: 100, y: 100});
      l.makeButton(c, UIAction.increment, "Increment");
      l.makeButton(c, UIAction.decrement, "Decrement");
      l.makeLabel(c, null, "Drag some arbitrary number").bbox;
      l.makeDraggable(c, UIAction.drag_num, "number = " + num);
      l.makeDraggable(c, UIAction.drag_text_wrap_width, "Wrap width: " + text_wrap_width);
      l.makeLabel(c, null, " ");
      l.makeButton(c, UIAction.add_new_window, "Add a window. " + num_windows);
      // l.makeText(c, UIAction.increment, "Some more standard placeholder text that isn't some weird loremm ipsum shit that everyone is tired of. Wow have I offended someone with that statement. Fuck you those that are offended. I don't give a fuck", text_wrap_width);
      l.makeText(c, UIAction.increment, "Some more standard placeholder text that isn't some weird loremm ipsum shit that everyone is tired of.", text_wrap_width);

      l.makeLabel(c, null, " ");

      l.makeLabel(c, null, "* Grid => ");
      const g = gui.Stack.makeGrid(l, UIAction.placeholder, 3, 1.0);
      g.makeDraggable(c, UIAction.drag_text_wrap_width, "g00");
      g.makeDraggable(c, UIAction.drag_num, "g10");
      g.makeDraggable(c, UIAction.drag_num, "g20");
      g.makeDraggable(c, UIAction.drag_num, "g01");
      g.makeDraggable(c, UIAction.drag_num, "g11");
      g.makeDraggable(c, UIAction.drag_num, "g21");
      g.makeDraggable(c, UIAction.drag_num, "g02");
      g.makeDraggable(c, UIAction.drag_num, "g12");
      g.makeDraggable(c, UIAction.HIGH_drag_text_wrap_width, "g22");
      l.resetCursor();
      l.makeLabel(c, null, "Testing text after grid");

      l.makeLabel(c, null, " ");

      l.makeLabel(c, null, "* bg color: ");
      const padd = " ";
      const bg1 = l.makeDraggable(c, UIAction.bg_color_r, padd + "R: " + bg_color.r + padd);
      l.cursor.x = bg1.bbox.right + 4;
      l.cursor.y = bg1.bbox.top;
      const bg2 = l.makeDraggable(c, UIAction.bg_color_g, padd + "G: " + bg_color.g + padd);
      l.cursor.x = bg2.bbox.right + 4;
      l.cursor.y = bg2.bbox.top;
      l.makeDraggable(c, UIAction.bg_color_b, padd + "B: " + bg_color.b + padd);
      l.resetCursor();
      l.makeLabel(c, null, "testing after rgb")

    } else if (i == 1) {
      const l = stack.makeWindow(c, input_state, UIAction.placeholder, UIAction.placeholder, {title: ":) " + (i + 1), x: 200 + 10*i, y: 100+10*i});
      l.makeText(c, null, "Testing cursor before grid. PLS lorem ipsum save me here i'm about to LOSE my mind!! Ha ha ha ha HA. What is happening to me. How do I take of my mask if I'm the mask? What does my face look like");
      const g = gui.Stack.makeGrid(l, UIAction.placeholder, 2, 1.0);
      const w = gui.MBBox.calcWidth(l.bbox) / 2.5;
      const te = "some long debug text";
      g.makeText(c, null, te, w);
      g.makeText(c, null, te, w);
      g.makeText(c, null, te, w);
      g.makeText(c, null, te, w);
      g.makeText(c, null, te, w);
      g.makeText(c, null, te, w);
      l.resetCursor();
      l.makeLabel(c, null, "Testing cursor after grid");
    } else {
      const l = stack.makeWindow(c, input_state, UIAction.placeholder, UIAction.placeholder, {title: ":) " + (i + 1), x: 200 + 10*i, y: 100+10*i});
      l.makeText(c, null, "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.", text_wrap_width);
    }
  }

  const met = performance.now();
  make_time = met - mst;

  const ast = performance.now();
  const ret = stack.requestAction(input_state);
  const aet = performance.now();
  action_time = aet - ast;

  const action = ret.action;

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
    case UIAction.bg_color_r:
      bg_color.r += input_state.mouse_delta_pos.x;
      break;
    case UIAction.bg_color_g:
      bg_color.g += input_state.mouse_delta_pos.x;
      break;
    case UIAction.bg_color_b:
      bg_color.b += input_state.mouse_delta_pos.x;
      break;
  }

  const rst = performance.now();
  c.clearRect(0, 0, gui.canvas.width, gui.canvas.height);
  stack.stack_render(c, input_state);
  const rret = performance.now();
  render_time = rret - rst;

  input_state.end();

  const et = performance.now();
  dt = et - st;
  frame_time = et - last_time;
  last_time = et;

  requestAnimationFrame(update)
}

// setInterval(update, 1E3/120)
update();
