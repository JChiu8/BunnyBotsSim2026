import { CheckCircle2, CircleOff, Gamepad2, Play, RotateCcw } from "lucide-react"
import { useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useControllerPorts } from "@/sim/gamepads"
import { MAX_STACK_HEIGHT } from "@/sim/types"
import { useUiStore } from "@/stores/ui-store"

export function SetupPage() {
  const navigate = useNavigate()
  const { seed, isCenterTowerDisabled, robotSetups, setSeed, setCenterTowerDisabled, updateRobotSetup } = useUiStore()
  const ports = useControllerPorts()
  const connectedCount = ports.filter((port) => port.connected).length
  const duplicatePorts = robotSetups.filter((setup, id) => setup.controllerIndex !== null && robotSetups.findIndex((candidate) => candidate.controllerIndex === setup.controllerIndex) !== id)

  return <section className="space-y-6">
    <div className="space-y-2"><p className="text-sm font-medium text-muted-foreground">Match setup</p><h1 className="text-3xl font-semibold tracking-tight">Cone Zone simulator</h1><p className="max-w-2xl text-muted-foreground">Assign up to four standard Xbox controllers, tune each robot, then begin a local 2:30 match. Unassigned robots remain physical obstacles.</p></div>
    <section aria-labelledby="controller-status-heading" className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><div><h2 className="font-semibold" id="controller-status-heading">Controller verification</h2><p className="text-sm text-muted-foreground">Press a button on each controller if it is not detected yet. These are browser controller ports, 1–4.</p></div><p className="text-sm font-semibold tabular-nums">{connectedCount} / {ports.length} connected</p></div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{ports.map((port) => <div className={`rounded-lg border p-3 ${port.connected ? "border-emerald-500/50 bg-emerald-500/10" : "bg-muted/40"}`} key={port.port}>
        <div className="flex items-center gap-2">{port.connected ? <CheckCircle2 aria-hidden="true" className="size-5 text-emerald-600" /> : <CircleOff aria-hidden="true" className="size-5 text-muted-foreground" />}<p className="font-semibold">Port {port.port + 1}</p><span className={`ml-auto text-xs font-medium ${port.connected ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>{port.connected ? "Connected" : "Not connected"}</span></div>
        <p className="mt-2 truncate text-xs text-muted-foreground" title={port.id ?? undefined}>{port.id ?? "No controller detected"}</p>
      </div>)}</div>
      <p className="text-xs text-muted-foreground">The sim accepts up to four controllers. A controller keeps its assigned port while it remains connected, even when the browser’s underlying gamepad index is not 0–3.</p>
    </section>
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"><div className="grid gap-2"><Label htmlFor="seed">Match seed</Label><Input className="w-36" id="seed" onChange={(event) => setSeed(Number(event.target.value) || 0)} type="number" value={seed} /></div><Button onClick={() => setSeed(Math.floor(Math.random() * 2_000_000_000))} variant="outline"><RotateCcw /> Randomize</Button><Label className="flex items-center gap-2 text-sm"><Checkbox checked={isCenterTowerDisabled} onCheckedChange={(checked) => setCenterTowerDisabled(checked === true)} /> Disable center tower and random scoring</Label><Button className="ml-auto" onClick={() => navigate("/simulator")}><Play /> Start match</Button></div>
    <div className="grid gap-4 lg:grid-cols-2">{robotSetups.map((setup, id) => <RobotCard duplicate={duplicatePorts.includes(setup)} id={id} key={id} port={setup.controllerIndex === null ? null : ports[setup.controllerIndex]} setup={setup} update={updateRobotSetup} />)}</div>
    <p className="text-sm text-muted-foreground">Controls: left stick translates, right stick rotates, LT intakes, RT scores, A aligns to the nearest tower, and Y requests your alliance’s bonus bunny at the nearest human-player station.</p>
  </section>
}

function RobotCard({ duplicate, id, port, setup, update }: { duplicate: boolean; id: number; port: ReturnType<typeof useControllerPorts>[number] | null | undefined; setup: ReturnType<typeof useUiStore.getState>["robotSetups"][number]; update: ReturnType<typeof useUiStore.getState>["updateRobotSetup"] }) {
  return <article className="space-y-4 rounded-xl border bg-card p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold">{id < 2 ? "Red" : "Blue"} robot {id % 2 + 1}</h2><p className="text-sm text-muted-foreground">30 in square swerve robot</p></div><Gamepad2 className={port?.connected ? "text-emerald-600" : "text-muted-foreground"} /></div><div className="grid gap-3 sm:grid-cols-2">
    <NumberField id={`robot-${id}-controller-port`} label="Controller port (1–4)" max={4} min={1} value={setup.controllerIndex === null ? "" : setup.controllerIndex + 1} onChange={(value) => update(id, { controllerIndex: value === "" ? null : Math.min(3, Math.max(0, Number(value) - 1)) })} />
    <NumberField id={`robot-${id}-speed`} label="Speed (ft/s)" max={20} min={4} step={1} value={setup.translationSpeed} onChange={(value) => update(id, { translationSpeed: Number(value) })} />
    <NumberField id={`robot-${id}-rotation`} label="Rotation (°/s)" max={720} min={90} step={30} value={setup.rotationSpeed} onChange={(value) => update(id, { rotationSpeed: Number(value) })} />
    <NumberField id={`robot-${id}-intake`} label="Intake seconds" max={3} min={0.1} step={0.1} value={setup.intakeSeconds} onChange={(value) => update(id, { intakeSeconds: Number(value) })} />
    <NumberField id={`robot-${id}-score`} label="Score seconds" max={3} min={0.1} step={0.1} value={setup.scoreSeconds} onChange={(value) => update(id, { scoreSeconds: Number(value) })} />
    <NumberField id={`robot-${id}-max-stack-height`} label="Max stack height" max={MAX_STACK_HEIGHT} min={1} value={setup.maxStackHeight} onChange={(value) => update(id, { maxStackHeight: Math.min(MAX_STACK_HEIGHT, Math.max(1, Number(value) || 1)) })} />
  </div><div className="space-y-1"><p className={`text-xs font-medium ${port?.connected ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>{port?.connected ? `Port ${port.port + 1} connected` : setup.controllerIndex === null ? "No controller assigned" : `Port ${(setup.controllerIndex ?? 0) + 1} not connected`}</p>{duplicate && <p className="text-xs font-medium text-destructive">This port is assigned to more than one robot.</p>}</div><Label className="flex items-center gap-2 text-sm"><Checkbox checked={setup.keyboard} onCheckedChange={(checked) => update(id, { keyboard: checked === true })} /> Keyboard fallback (WASD translate, Q/E rotate, F intake, G score)</Label></article>
}

function NumberField({ id, label, value, onChange, ...props }: { label: string; value: string | number; onChange: (value: string) => void } & React.ComponentProps<typeof Input>) { const fieldId = id ?? label.replaceAll(/[^a-z]/gi, "-").toLowerCase(); return <div className="grid gap-2"><Label htmlFor={fieldId}>{label}</Label><Input id={fieldId} onChange={(event) => onChange(event.target.value)} type="number" value={value} {...props} /></div> }
