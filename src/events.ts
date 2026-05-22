import { nextTick } from 'essor';

export interface FireEventOptions extends EventInit {
  target?: Record<string, unknown>;
  key?: string;
  code?: string;
  detail?: unknown;
}

const mouseEvents = new Set([
  'click',
  'dblclick',
  'mousedown',
  'mouseup',
  'mousemove',
  'mouseover',
  'mouseout',
]);

const keyboardEvents = new Set(['keydown', 'keyup', 'keypress']);
const focusEvents = new Set(['focus', 'blur', 'focusin', 'focusout']);
const toggleableInputs = new Set(['checkbox', 'radio']);

function applyTarget(element: Element, target?: Record<string, unknown>): void {
  if (!target) return;

  for (const key of Object.keys(target)) {
    const value = target[key];
    // Plain assignment when the property is writable on the prototype chain;
    // otherwise fall back to defineProperty. Avoids try/catch as flow control
    // and skips Reflect.set's silent-failure mode on read-only properties.
    const descriptor = getWritableDescriptor(element, key);
    if (descriptor) {
      (element as unknown as Record<string, unknown>)[key] = value;
    } else {
      Object.defineProperty(element, key, { configurable: true, value });
    }
  }
}

function getWritableDescriptor(target: object, key: string): PropertyDescriptor | undefined {
  let cursor: object | null = target;
  while (cursor) {
    const desc = Object.getOwnPropertyDescriptor(cursor, key);
    if (desc) return desc.writable || desc.set ? desc : undefined;
    cursor = Object.getPrototypeOf(cursor);
  }
  return undefined;
}

function createEvent(type: string, options: FireEventOptions = {}): Event {
  const { target: _target, detail, ...init } = options;
  const eventInit: EventInit & { detail?: unknown } = {
    bubbles: true,
    cancelable: true,
    ...init,
  };
  // MouseEvent / KeyboardEvent / FocusEvent / UIEvent / CustomEvent all accept
  // `detail` via their *EventInit dictionaries — set it once on eventInit and
  // every constructor below picks it up.
  if (detail !== undefined) eventInit.detail = detail;

  if (mouseEvents.has(type)) return new MouseEvent(type, eventInit as MouseEventInit);
  if (keyboardEvents.has(type)) return new KeyboardEvent(type, eventInit as KeyboardEventInit);
  if (focusEvents.has(type)) return new FocusEvent(type, eventInit as FocusEventInit);
  if (detail !== undefined) return new CustomEvent(type, eventInit as CustomEventInit);
  return new Event(type, eventInit);
}

export async function dispatch(
  element: Element,
  type: string,
  options?: FireEventOptions,
): Promise<void> {
  applyTarget(element, options?.target);
  element.dispatchEvent(createEvent(type, options));
  await nextTick();
}

type FireEventMethod = (element: Element, options?: FireEventOptions) => Promise<void>;

export interface FireEvent {
  (element: Element, event: Event): Promise<void>;
  click: FireEventMethod;
  dblclick: FireEventMethod;
  input: FireEventMethod;
  change: FireEventMethod;
  submit: FireEventMethod;
  focus: FireEventMethod;
  blur: FireEventMethod;
  keydown: FireEventMethod;
  keyup: FireEventMethod;
}

const firedEventTypes = [
  'click',
  'dblclick',
  'input',
  'change',
  'submit',
  'focus',
  'blur',
  'keydown',
  'keyup',
] as const;

export const fireEvent = (async (element: Element, event: Event) => {
  element.dispatchEvent(event);
  await nextTick();
}) as FireEvent;

for (const type of firedEventTypes) {
  (fireEvent as unknown as Record<string, FireEventMethod>)[type] = (element, options) =>
    dispatch(element, type, options);
}

export async function setValue(element: Element, value: unknown): Promise<void> {
  if (element instanceof HTMLInputElement && toggleableInputs.has(element.type)) {
    element.checked = Boolean(value);
    await fireEvent.change(element);
    return;
  }

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    element.value = String(value);
    await fireEvent.input(element);
    return;
  }

  throw new Error('setValue() can only be used on input, textarea, or select elements');
}
