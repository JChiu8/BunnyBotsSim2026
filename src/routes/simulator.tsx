import { useEffect, useRef, useState } from "react"
import { useMutation } from "convex/react"
import { Pause, Play, RotateCcw } from "lucide-react"
import { useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { FieldCanvas } from "@/sim/field-canvas"
import { SimulatorEngine } from "@/sim/engine"
import { gamepadForPort } from "@/sim/gamepads"
import type { DriverInput, ScoreBreakdown, ScoreParts, Snapshot } from "@/sim/types"
import { api } from "../../convex/_generated/api"
import { useUiStore } from "@/stores/ui-store"

const emptyInput = (): DriverInput => ({ x: 0, y: 0, rotation: 0, intake: false, score: false, align: false, bunny: false })

export function SimulatorPage() {
  const navigate = useNavigate()
  const { seed, isCenterTowerDisabled, robotSetups } = useUiStore()
  const engineRef = useRef<SimulatorEngine | null>(null)
  const keys = useRef(new Set<string>())
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [countdown, setCountdown] = useState<number | null>(3)
  const [saved, setSaved] = useState(false)
  const [matchNumber, setMatchNumber] = useState(0)
  const saveResult = useMutation(api.simulator.saveResult)

  useEffect(() => {
    const engine = new SimulatorEngine(robotSetups, seed, { centerTowerRandomEnabled: !isCenterTowerDisabled })
    engineRef.current = engine
    let animation = 0
    let previous = performance.now()
    let lastPaint = 0
    const countdownStartedAt = previous
    let lastCountdown = 3
    const loop = (now: number) => {
      if (!engine.started) {
        const secondsLeft = Math.ceil(3 - (now - countdownStartedAt) / 1000)
        if (secondsLeft <= 0) {
          engine.start()
          previous = now
          setCountdown(null)
        } else if (secondsLeft !== lastCountdown) {
          lastCountdown = secondsLeft
          setCountdown(secondsLeft)
        }
      }
      engine.update(now - previous)
      previous = now
      applyInputs(engine, robotSetups, keys.current)
      if (now - lastPaint > 40 || engine.ended) { setSnapshot(engine.snapshot()); lastPaint = now }
      animation = requestAnimationFrame(loop)
    }
    const down = (event: KeyboardEvent) => keys.current.add(event.key.toLowerCase())
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase())
    window.addEventListener("keydown", down); window.addEventListener("keyup", up)
    setCountdown(3); setSnapshot(engine.snapshot()); animation = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(animation); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); engine.dispose(); engineRef.current = null }
  }, [isCenterTowerDisabled, matchNumber, robotSetups, seed])

  useEffect(() => {
    if (!snapshot?.ended || saved) return
    void saveResult({ seed, redScore: snapshot.redScore, blueScore: snapshot.blueScore, configuration: JSON.stringify(robotSetups), events: snapshot.events }).then(() => setSaved(true)).catch(() => undefined)
  }, [robotSetups, saveResult, saved, seed, snapshot])

  if (!snapshot) return <div className="text-muted-foreground">Preparing field…</div>
  const minutes = Math.floor(snapshot.remaining / 60)
  const seconds = Math.ceil(snapshot.remaining % 60).toString().padStart(2, "0")
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center gap-3"><div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{snapshot.phase === "auto" ? "Autonomous" : snapshot.phase === "teleop" ? "Teleoperated" : "Final"}</p><h1 className="font-mono text-3xl font-semibold">{minutes}:{seconds}</h1></div><Score alliance="red" score={snapshot.redScore} /><Score alliance="blue" score={snapshot.blueScore} /><div className="ml-auto flex gap-2"><Button disabled={countdown !== null} onClick={() => engineRef.current?.togglePause()} variant="outline">{snapshot.paused ? <Play /> : <Pause />}{snapshot.paused ? "Resume" : "Pause"}</Button><Button onClick={() => navigate("/")} variant="outline"><RotateCcw /> Setup</Button></div></div>
    <div className="relative"><FieldCanvas snapshot={snapshot} />{countdown !== null && <div aria-live="assertive" className="absolute inset-0 grid place-items-center rounded-xl bg-black/45"><div className="text-center text-white"><p className="text-sm font-semibold uppercase tracking-[0.35em]">Match starts in</p><p className="mt-2 font-mono text-8xl font-bold tabular-nums drop-shadow-lg">{countdown}</p></div></div>}{snapshot.ended && snapshot.finalBreakdown && <FinalScoreScreen breakdown={snapshot.finalBreakdown} onRunAgain={() => { setSnapshot(null); setSaved(false); setMatchNumber((current) => current + 1) }} onBackToSetup={() => navigate("/")} />}</div>
    <div className="grid gap-4 md:grid-cols-3"><div className="rounded-xl border bg-card p-4 md:col-span-2"><h2 className="font-semibold">Driver controls</h2><p className="mt-2 text-sm text-muted-foreground">Left stick: translate · right stick: rotate · LT: intake · RT: score · A: align · Y: request the bunny at the nearest human-player station.</p><p className="mt-2 text-sm text-muted-foreground">Keyboard fallback: WASD moves, Q/E rotate, F intake, G score, R align, T bunny.</p></div><div className="rounded-xl border bg-card p-4"><h2 className="font-semibold">Match events</h2><ol className="mt-2 max-h-24 space-y-1 overflow-y-auto text-xs text-muted-foreground">{snapshot.events.slice(-6).reverse().map((event, index) => <li key={`${event.kind}-${index}`}>{event.atSeconds.toFixed(1)}s — {event.detail}</li>)}</ol></div></div>
  </section>
}
function Score({ alliance, score }: { alliance: "red" | "blue"; score: number }) { return <div className={`rounded-lg px-4 py-2 font-semibold text-white ${alliance === "red" ? "bg-red-600" : "bg-blue-600"}`}>{alliance === "red" ? "RED" : "BLUE"} <span className="font-mono text-xl">{score}</span></div> }
function FinalScoreScreen({ breakdown, onRunAgain, onBackToSetup }: { breakdown: ScoreBreakdown; onRunAgain: () => void; onBackToSetup: () => void }) {
  return <div aria-label="Final score" aria-modal="true" className="absolute inset-0 z-10 grid place-items-center overflow-y-auto rounded-lg bg-slate-950/80 p-3 backdrop-blur-sm" role="dialog">
    <div className="w-full max-w-3xl overflow-hidden rounded-2xl border-4 border-slate-950 bg-white shadow-2xl">
      <div className="grid grid-cols-2 text-center font-mono font-black text-white"><div className="bg-red-600 px-3 py-2 text-3xl sm:text-5xl">{breakdown.red.total}</div><div className="bg-blue-600 px-3 py-2 text-3xl sm:text-5xl">{breakdown.blue.total}</div></div>
      <div className="grid grid-cols-2 divide-x-4 divide-slate-950">
        <ScoreColumn alliance="red" score={breakdown.red} />
        <ScoreColumn alliance="blue" score={breakdown.blue} />
      </div>
      <div className="flex flex-wrap justify-center gap-2 border-t-4 border-slate-950 bg-slate-50 p-3"><Button onClick={onRunAgain}>Run again</Button><Button onClick={onBackToSetup} variant="outline">Back to setup</Button></div>
    </div>
  </div>
}
function ScoreColumn({ alliance, score }: { alliance: "red" | "blue"; score: ScoreParts }) {
  const rows = [["Raw cone points", score.cones], ["Auto bonus", score.auto], ["Runs", score.runs], ["Tic-tac-toes", score.tictactoes], ["Bonus from bunnies", score.bunnies]]
  return <div className="min-w-0"><div className={`px-3 py-2 text-center text-sm font-black uppercase tracking-[0.2em] text-white ${alliance === "red" ? "bg-red-600" : "bg-blue-600"}`}>{alliance}</div><dl className="divide-y-2 divide-slate-950 text-sm sm:text-base">{rows.map(([label, value]) => <div className="flex items-center justify-between gap-2 px-3 py-2" key={label as string}><dt className="font-semibold">{label}</dt><dd className="font-mono text-lg font-black tabular-nums">{value}</dd></div>)}</dl></div>
}
function applyInputs(engine: SimulatorEngine, setups: ReturnType<typeof useUiStore.getState>["robotSetups"], keys: Set<string>) {
  for (let id = 0; id < 4; id++) {
    const setup = setups[id]; const gamepad = setup.controllerIndex === null ? null : gamepadForPort(setup.controllerIndex)
    const input = emptyInput()
    if (gamepad) { input.x = gamepad.axes[0] ?? 0; input.y = gamepad.axes[1] ?? 0; input.rotation = gamepad.axes[2] ?? 0; input.intake = (gamepad.buttons[6]?.value ?? 0) > 0.2; input.score = (gamepad.buttons[7]?.value ?? 0) > 0.2; input.align = gamepad.buttons[0]?.pressed ?? false; input.bunny = gamepad.buttons[3]?.pressed ?? false }
    if (setup.keyboard) { input.x += (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0); input.y += (keys.has("s") ? 1 : 0) - (keys.has("w") ? 1 : 0); input.rotation += (keys.has("e") ? 1 : 0) - (keys.has("q") ? 1 : 0); input.intake ||= keys.has("f"); input.score ||= keys.has("g"); input.align ||= keys.has("r"); input.bunny ||= keys.has("t") }
    engine.setInput(id, input)
  }
}
