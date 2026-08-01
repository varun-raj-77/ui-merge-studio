import {
  emptyShowcaseSelection,
  scopeDecisionKey,
  type ShowcaseSelectionState
} from './showcaseSelection';

export interface SelectionHistoryTransition {
  selection: ShowcaseSelectionState;
  label: string;
}

export interface SelectionHistoryState {
  past: SelectionHistoryTransition[];
  present: ShowcaseSelectionState;
  future: SelectionHistoryTransition[];
  announcement: string;
  undoPrompt: string | null;
}

export type SelectionHistoryAction =
  | {
    type: 'commit';
    selection: ShowcaseSelectionState;
    label: string;
    offerImmediateUndo?: boolean;
  }
  | { type: 'undo' }
  | { type: 'redo' };

export const initialSelectionHistory: SelectionHistoryState = {
  past: [],
  present: emptyShowcaseSelection,
  future: [],
  announcement: '',
  undoPrompt: null
};

export function sameSelection(
  left: ShowcaseSelectionState,
  right: ShowcaseSelectionState
) {
  return left.incompatibleProductId === right.incompatibleProductId
    && left.scopes.length === right.scopes.length
    && left.scopes.every((scope, index) => (
      scopeDecisionKey(scope) === scopeDecisionKey(right.scopes[index])
    ));
}

export function selectionHistoryReducer(
  state: SelectionHistoryState,
  action: SelectionHistoryAction
): SelectionHistoryState {
  if (action.type === 'commit') {
    if (sameSelection(state.present, action.selection)) return state;
    return {
      past: [...state.past, { selection: state.present, label: action.label }],
      present: action.selection,
      future: [],
      announcement: action.label,
      undoPrompt: action.offerImmediateUndo ? action.label : null
    };
  }

  if (action.type === 'undo') {
    const transition = state.past.at(-1);
    if (!transition) return state;
    return {
      past: state.past.slice(0, -1),
      present: transition.selection,
      future: [
        ...state.future,
        { selection: state.present, label: transition.label }
      ],
      announcement: `Undid ${transition.label.toLowerCase()}`,
      undoPrompt: null
    };
  }

  const transition = state.future.at(-1);
  if (!transition) return state;
  return {
    past: [
      ...state.past,
      { selection: state.present, label: transition.label }
    ],
    present: transition.selection,
    future: state.future.slice(0, -1),
    announcement: `Redid ${transition.label.toLowerCase()}`,
    undoPrompt: null
  };
}

interface ShortcutEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  target: EventTarget | null;
}

function isTypingTarget(target: EventTarget | null) {
  if (!target || typeof (target as Element).closest !== 'function') return false;
  const editable = (target as Element).closest(
    'input, textarea, select, [contenteditable]:not([contenteditable="false"])'
  );
  return Boolean(editable);
}

export function selectionHistoryShortcut(event: ShortcutEvent): 'undo' | 'redo' | null {
  if (isTypingTarget(event.target)
    || event.altKey
    || (!event.ctrlKey && !event.metaKey)
    || event.key.toLowerCase() !== 'z') return null;
  return event.shiftKey ? 'redo' : 'undo';
}
