export type Alliance = "red" | "blue"
export type Phase = "auto" | "teleop" | "final"

export type RobotConfig = {
  translationSpeed: number
  rotationSpeed: number
  intakeSeconds: number
  scoreSeconds: number
}

export type RobotSetup = RobotConfig & { controllerIndex: number | null; keyboard: boolean }

export type Cone = { id: string; alliance: Alliance | "white"; x: number; y: number; radius: number; heldBy: number | null }
export type Tower = { id: string; x: number; y: number; stack: Array<Alliance | "white">; scoreable: boolean }
export type RobotSnapshot = { id: number; alliance: Alliance; x: number; y: number; angle: number; held: Alliance | "white" | null; action: "idle" | "intake" | "score"; progress: number; active: boolean }
export type SimEvent = { atSeconds: number; kind: string; detail: string }
export type Snapshot = { phase: Phase; remaining: number; redScore: number; blueScore: number; towers: Tower[]; cones: Cone[]; robots: RobotSnapshot[]; paused: boolean; ended: boolean; events: SimEvent[]; finalBreakdown: ScoreBreakdown | null }
export type ScoreBreakdown = { red: ScoreParts; blue: ScoreParts }
export type ScoreParts = { auto: number; cones: number; runs: number; tictactoes: number; total: number }
export type DriverInput = { x: number; y: number; rotation: number; intake: boolean; score: boolean; align: boolean; bunny: boolean }

export const DEFAULT_CONFIG: RobotConfig = { translationSpeed: 12, rotationSpeed: 360, intakeSeconds: 0.5, scoreSeconds: 0.75 }
export const FIELD = { width: 648, height: 324, centerX: 324, centerY: 162, robotSize: 30, towerSize: 15, minibotCorralSize: 120, corralWallThickness: 4 }
