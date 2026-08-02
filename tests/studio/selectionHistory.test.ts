import { describe, expect, it } from 'vitest';
import {
  candidateKey,
  emptyShowcaseSelection,
  showcaseSelectionReducer,
  type ShowcaseScope,
  type ShowcaseSelectionState
} from '../../apps/studio/src/showcaseSelection';
import {
  initialSelectionHistory,
  selectionHistoryReducer,
  selectionHistoryShortcut,
  type SelectionHistoryState
} from '../../apps/studio/src/selectionHistory';
import {
  acceptIntentionalContext,
  defaultPreviewContext
} from '../../apps/studio/src/previewContext';
import {
  catalogueCapabilityFromRuntime,
  catalogueScopesForCapability,
  quickViewAllCapabilityId
} from '../../apps/studio/src/catalogueSelectionCapabilities';

const sidebar: ShowcaseScope = {
  kind: 'feature',
  featureId: 'category-sidebar',
  branch: 'branch-a',
  capabilityId: 'category-sidebar',
  route: '/catalogue',
  pageId: 'product-catalogue'
};
const deskStand: ShowcaseScope = {
  kind: 'feature-instance',
  featureId: 'product-quick-view',
  branch: 'branch-b',
  instanceId: 'p-105',
  capabilityId: 'product-quick-view:p-105',
  route: '/catalogue',
  pageId: 'product-catalogue'
};
const taskLamp: ShowcaseScope = {
  kind: 'feature-instance',
  featureId: 'product-quick-view',
  branch: 'branch-b',
  instanceId: 'p-103',
  capabilityId: 'product-quick-view:p-103',
  route: '/catalogue',
  pageId: 'product-catalogue'
};

function reduceSelection(
  state: ShowcaseSelectionState,
  action: Parameters<typeof showcaseSelectionReducer>[1]
) {
  return showcaseSelectionReducer(state, action);
}

function commit(
  history: SelectionHistoryState,
  selection: ShowcaseSelectionState,
  label: string,
  offerImmediateUndo = false
) {
  return selectionHistoryReducer(history, {
    type: 'commit',
    selection,
    label,
    offerImmediateUndo
  });
}

describe('selection history', () => {
  it('starts with explicit empty past, present, and future state', () => {
    expect(initialSelectionHistory).toEqual({
      past: [],
      present: emptyShowcaseSelection,
      future: [],
      announcement: '',
      undoPrompt: null
    });
  });

  it('undoes and redoes feature additions and removals', () => {
    const withSidebar = reduceSelection(emptyShowcaseSelection, {
      type: 'toggle-scope',
      scope: sidebar
    });
    const added = commit(initialSelectionHistory, withSidebar, 'Added Category sidebar');
    const removed = commit(
      added,
      reduceSelection(withSidebar, { type: 'remove-scope', scope: sidebar }),
      'Removed Category sidebar',
      true
    );

    const undoRemove = selectionHistoryReducer(removed, { type: 'undo' });
    expect(undoRemove.present).toEqual(withSidebar);
    expect(undoRemove.announcement).toBe('Undid removed category sidebar');

    const redoRemove = selectionHistoryReducer(undoRemove, { type: 'redo' });
    expect(redoRemove.present).toEqual(emptyShowcaseSelection);
    expect(redoRemove.announcement).toBe('Redid removed category sidebar');
  });

  it('restores all selections with one Undo after Clear all', () => {
    const selected = [sidebar, deskStand].reduce(
      (state, scope) => reduceSelection(state, { type: 'toggle-scope', scope }),
      emptyShowcaseSelection
    );
    const beforeClear = commit(initialSelectionHistory, selected, 'Added two selections');
    const cleared = commit(
      beforeClear,
      reduceSelection(selected, { type: 'clear' }),
      'Cleared 2 selections',
      true
    );

    expect(cleared.present).toEqual(emptyShowcaseSelection);
    expect(cleared.undoPrompt).toBe('Cleared 2 selections');
    expect(selectionHistoryReducer(cleared, { type: 'undo' }).present).toEqual(selected);
  });

  it('invalidates redo when a new selection follows Undo', () => {
    const withSidebar = reduceSelection(emptyShowcaseSelection, {
      type: 'toggle-scope',
      scope: sidebar
    });
    const withBoth = reduceSelection(withSidebar, {
      type: 'toggle-scope',
      scope: deskStand
    });
    const first = commit(initialSelectionHistory, withSidebar, 'Added Category sidebar');
    const second = commit(first, withBoth, 'Added Quick View · Desk Stand');
    const undone = selectionHistoryReducer(second, { type: 'undo' });
    expect(undone.future).toHaveLength(1);

    const alternative = reduceSelection(undone.present, {
      type: 'toggle-scope',
      scope: taskLamp
    });
    const branched = commit(undone, alternative, 'Added Quick View · Task Lamp');
    expect(branched.future).toEqual([]);
    expect(selectionHistoryReducer(branched, { type: 'redo' })).toBe(branched);
  });

  it('suppresses duplicate snapshots and history entries', () => {
    const withSidebar = reduceSelection(emptyShowcaseSelection, {
      type: 'toggle-scope',
      scope: sidebar
    });
    const first = commit(initialSelectionHistory, withSidebar, 'Added Category sidebar');
    expect(commit(first, withSidebar, 'Added Category sidebar')).toBe(first);
    expect(first.past).toHaveLength(1);
  });

  it('keeps preview browsing context outside selection history', () => {
    const history = initialSelectionHistory;
    const result = acceptIntentionalContext(
      defaultPreviewContext,
      {
        ...defaultPreviewContext,
        catalogue: {
          ...defaultPreviewContext.catalogue,
          categoryId: 'desk'
        }
      },
      1,
      -1,
      ['catalogue.category']
    );
    expect(result.context.catalogue.categoryId).toBe('desk');
    expect(history).toBe(initialSelectionHistory);
    expect(history.past).toEqual([]);
  });

  it('undoes conflict recovery while preserving all safe selections', () => {
    const safe = [sidebar, deskStand].reduce(
      (state, scope) => reduceSelection(state, { type: 'toggle-scope', scope }),
      emptyShowcaseSelection
    );
    const conflicted = reduceSelection(safe, { type: 'toggle-incompatible' });
    const conflictAdded = commit(initialSelectionHistory, conflicted, 'Added Product-ID change');
    const recovered = commit(
      conflictAdded,
      reduceSelection(conflicted, { type: 'toggle-incompatible' }),
      'Removed Product-ID change',
      true
    );

    expect(recovered.present).toEqual(safe);
    const restored = selectionHistoryReducer(recovered, { type: 'undo' });
    expect(restored.present.selections.some(selection => selection.capabilityId === 'experimental-product-id')).toBe(true);
    expect(restored.present.selections.filter(selection => selection.capabilityId !== 'experimental-product-id')).toEqual(safe.selections);
  });

  it('restores exact canonical candidate identities independent of click order', () => {
    const firstSelection = [sidebar, taskLamp, deskStand].reduce(
      (state, scope) => reduceSelection(state, { type: 'toggle-scope', scope }),
      emptyShowcaseSelection
    );
    const otherOrder = [deskStand, sidebar, taskLamp].reduce(
      (state, scope) => reduceSelection(state, { type: 'toggle-scope', scope }),
      emptyShowcaseSelection
    );
    expect(candidateKey(firstSelection)).toBe(candidateKey(otherOrder));

    const added = commit(initialSelectionHistory, firstSelection, 'Added selections');
    const cleared = commit(added, emptyShowcaseSelection, 'Cleared 3 selections');
    const restored = selectionHistoryReducer(cleared, { type: 'undo' });
    expect(candidateKey(restored.present)).toBe(candidateKey(firstSelection));
  });

  it('undoes and redoes the all-instances capability as one atomic history action', () => {
    const allQuickViews = catalogueScopesForCapability(
      catalogueCapabilityFromRuntime(quickViewAllCapabilityId, 'branch-b')
    ).reduce(
      (state, scope) => reduceSelection(state, { type: 'toggle-scope', scope }),
      emptyShowcaseSelection
    );
    const added = commit(
      initialSelectionHistory,
      allQuickViews,
      'Added Quick View to all products'
    );
    expect(added.past).toHaveLength(1);
    expect(added.present.selections).toHaveLength(5);

    const undone = selectionHistoryReducer(added, { type: 'undo' });
    expect(undone.present).toEqual(emptyShowcaseSelection);
    expect(undone.future).toHaveLength(1);

    const redone = selectionHistoryReducer(undone, { type: 'redo' });
    expect(redone.present.selections).toHaveLength(5);
    expect(candidateKey(redone.present)).toBe(candidateKey(allQuickViews));
  });
});

describe('selection history keyboard shortcuts', () => {
  function shortcut(
    overrides: Partial<Parameters<typeof selectionHistoryShortcut>[0]> = {}
  ) {
    return selectionHistoryShortcut({
      key: 'z',
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      target: document.body,
      ...overrides
    });
  }

  it('maps Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z', () => {
    expect(shortcut()).toBe('undo');
    expect(shortcut({ ctrlKey: false, metaKey: true })).toBe('undo');
    expect(shortcut({ shiftKey: true })).toBe('redo');
  });

  it('ignores shortcuts while typing or when modifiers do not match', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    const editableChild = document.createElement('span');
    editable.append(editableChild);
    const frame = document.createElement('iframe');
    document.body.append(input, textarea, editable, frame);
    const framedInput = frame.contentDocument!.createElement('input');
    frame.contentDocument!.body.append(framedInput);

    expect(shortcut({ target: input })).toBeNull();
    expect(shortcut({ target: textarea })).toBeNull();
    expect(shortcut({ target: editableChild })).toBeNull();
    expect(shortcut({ target: framedInput })).toBeNull();
    expect(shortcut({ key: 'x' })).toBeNull();
    expect(shortcut({ ctrlKey: false })).toBeNull();
    expect(shortcut({ altKey: true })).toBeNull();
  });
});
