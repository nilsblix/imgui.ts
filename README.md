# nvb-imgui

## Overview
**nvb-imgui** is an immediate mode GUI framework designed for simplicity and speed. It operates without external dependencies, making it lightweight and easy to integrate into projects. The framework is built around the concept of *actions*, where a single action can be dispatched per frame using mouse or keyboard input. This design philosophy keeps the user interface responsive and straightforward.

## Features
- **Action-driven architecture**: User-defined actions manage interactions.
- **No external dependencies**: Minimalistic and efficient.
- **Dynamic UI elements**: Draggables, buttons, grids, and more.
- **Customizable background and window properties**.
- **Lightweight state management**: Tracks input states and active windows seamlessly.

## Usage

To use `nvb-imgui`, follow the example implementation below:

### Installation
Clone the repository and include the library in your project:
```bash
git clone https://github.com/nilsblix/nvb-imgui.git
Import the library in your code:

```typescript
import * as gui from "./gui/gui.ts";
```
Example Implementation
Start by defining your actions, which represent all possible user interactions:

```typescript
Copy code
enum UIAction {
  placeholder,
  increment,
  decrement,
  add_new_window,
  drag_num,
  drag_text_wrap_width,
  HIGH_drag_text_wrap_width,
  bg_color_r,
  bg_color_g,
  bg_color_b,
  toggle_window_1,
}
```
Initialize the GUI canvas, input state, and variables to manage the application's dynamic behavior:

```typescript
const c = <gui.REND>gui.canvas.getContext("2d");
const input_state = new gui.InputState(gui.canvas, 0, 0);

let num = 0;
let text_wrap_width = 400;
let num_windows = 1;
let bg_color: gui.Color = gui.MColor.fromHex("#738C99");
```
Set up a continuous rendering loop where windows, buttons, and draggable components are dynamically created and updated:

```typescript
Copy code
function update() {
  const stack = new gui.Stack<gui.N<UIAction>>();
  document.body.style.backgroundColor = gui.MColor.string(bg_color);

  // Example window
  const window = stack.makeWindow(c, input_state, { window: UIAction.placeholder }, { title: "Counter Example" });
  window.makeButton(c, UIAction.increment, "Increment");
  window.makeButton(c, UIAction.decrement, "Decrement");
  window.makeDraggable(c, UIAction.drag_num, `Current value: ${num}`);

  const action = stack.requestAction(input_state).action;

  switch (action) {
    case UIAction.increment:
      num++;
      break;
    case UIAction.decrement:
      num--;
      break;
    case UIAction.drag_num:
      num += input_state.mouse_delta_pos.x;
      break;
  }

  c.clearRect(0, 0, gui.canvas.width, gui.canvas.height);
  stack.stack_render(c, input_state);
  requestAnimationFrame(update);
}

update();
```
Key Features Demonstrated
Dynamic Windows: Add or toggle windows programmatically.
Buttons and Draggables: Handle numeric changes and interact with UI components.
Color Manipulation: Adjust background color through draggable RGB controls.
Action-Driven Logic: Manage user interactions effectively with an enum-based system.
Demo
The provided main.ts file demonstrates how to:

Create multiple windows dynamically.
Use draggable elements for fine-grained control.
Manage and toggle window visibility.
Display debugging information.
For a complete working example, refer to the main.ts file in the repository.
