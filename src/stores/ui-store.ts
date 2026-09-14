import { create } from "zustand"

import { DEFAULT_CONFIG, type RobotSetup } from "@/sim/types"

type UiState = {
  isSidebarOpen: boolean
  activePanel: string | null
  setSidebarOpen: (isOpen: boolean) => void
  setActivePanel: (panel: string | null) => void
  seed: number
  isCenterTowerDisabled: boolean
  robotSetups: RobotSetup[]
  setSeed: (seed: number) => void
  setCenterTowerDisabled: (isDisabled: boolean) => void
  updateRobotSetup: (id: number, update: Partial<RobotSetup>) => void
}

const robotSetups: RobotSetup[] = Array.from({ length: 4 }, (_, id) => ({
  ...DEFAULT_CONFIG,
  controllerIndex: null,
  keyboard: id === 0,
}))

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: false,
  activePanel: null,
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  setActivePanel: (activePanel) => set({ activePanel }),
  seed: 2026,
  isCenterTowerDisabled: false,
  robotSetups,
  setSeed: (seed) => set({ seed }),
  setCenterTowerDisabled: (isCenterTowerDisabled) => set({ isCenterTowerDisabled }),
  updateRobotSetup: (id, update) => set((state) => ({
    robotSetups: state.robotSetups.map((setup, index) => index === id ? { ...setup, ...update } : setup),
  })),
}))
