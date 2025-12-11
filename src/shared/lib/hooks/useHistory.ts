import { useState, useCallback, useRef } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useHistory<T>(initialPresent: T) {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialPresent,
    future: [],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const undo = useCallback(() => {
    setState((currentState) => {
      if (currentState.past.length === 0) return currentState;
      const previous = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, currentState.past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [currentState.present, ...currentState.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((currentState) => {
      if (currentState.future.length === 0) return currentState;
      const next = currentState.future[0];
      const newFuture = currentState.future.slice(1);
      return {
        past: [...currentState.past, currentState.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const set = useCallback((newPresent: T | ((current: T) => T)) => {
    setState((currentState) => {
      const nextValue = newPresent instanceof Function ? newPresent(currentState.present) : newPresent;
      
      if (currentState.present === nextValue) return currentState;

      return {
        past: [...currentState.past, currentState.present],
        present: nextValue,
        future: [],
      };
    });
  }, []);

  // Update without pushing to history (for transient updates like dragging)
  // Note: If you commit this later, you need to handle it carefully.
  // Ideally, dragging updates a separate "transient" state, and "commit" pushes to history.
  // For now, we'll assume granular updates might push history, which can be spammy.
  // We might need a debounce or "commit" action.
  
  // Implementation for "transient" set (replaces current present without adding to past)
  const setTransient = useCallback((newPresent: T | ((current: T) => T)) => {
    setState((currentState) => {
      const nextValue = newPresent instanceof Function ? newPresent(currentState.present) : newPresent;
      return {
        ...currentState,
        present: nextValue,
      };
    });
  }, []);

  const clearHistory = useCallback(() => {
    setState((currentState) => ({
      past: [],
      present: currentState.present,
      future: [],
    }));
  }, []);

  const setHistory = useCallback((present: T) => {
      setState({
          past: [],
          present,
          future: []
      });
  }, []);

  return { 
    state: state.present, 
    set, 
    setTransient, 
    undo, 
    redo, 
    canUndo, 
    canRedo, 
    clearHistory,
    setHistory 
  };
}
