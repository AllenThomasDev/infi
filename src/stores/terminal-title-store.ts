import { create } from "zustand";

interface TerminalTitleState {
  titles: Record<string, string>;
  setTitle: (id: string, title: string) => void;
  removeTitle: (id: string) => void;
}

export const useTerminalTitleStore = create<TerminalTitleState>()((set) => ({
  titles: {},
  setTitle: (id, title) =>
    set((state) => {
      if (state.titles[id] === title) {
        return state;
      }
      return { titles: { ...state.titles, [id]: title } };
    }),
  removeTitle: (id) =>
    set((state) => {
      if (!(id in state.titles)) {
        return state;
      }
      const { [id]: _, ...rest } = state.titles;
      return { titles: rest };
    }),
}));
