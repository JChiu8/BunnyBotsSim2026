import { useEffect, useRef } from "react"

import { FIELD, type Alliance, type Snapshot, type Tower } from "@/sim/types"

type FieldCanvasProps = { snapshot: Snapshot | null }
const colors: Record<Alliance | "white", string> = { red: "#ef4444", blue: "#3b82f6", white: "#f8fafc" }

export function FieldCanvas({ snapshot }: FieldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !snapshot) return
    const width = canvas.clientWidth
    const height = width * (FIELD.height / FIELD.width)
    const scale = window.devicePixelRatio || 1
    canvas.width = width * scale
    canvas.height = height * scale
    const context = canvas.getContext("2d")
    if (!context) return
    context.scale(scale, scale)
    context.fillStyle = "#2a3038"
    context.fillRect(0, 0, width, height)
    context.save()
    context.scale(width / FIELD.width, height / FIELD.height)
    context.strokeStyle = "#d9b45a"
    context.lineWidth = 2
    context.strokeRect(3, 3, FIELD.width - 6, FIELD.height - 6)
    context.strokeStyle = "#64748b"
    context.setLineDash([6, 5])
    context.beginPath(); context.moveTo(FIELD.centerX, 0); context.lineTo(FIELD.centerX, FIELD.height); context.stroke()
    context.setLineDash([])
    const corralHalf = FIELD.minibotCorralSize / 2
    context.strokeStyle = "#b45309"; context.lineWidth = FIELD.corralWallThickness
    context.strokeRect(FIELD.centerX - corralHalf, FIELD.centerY - corralHalf, FIELD.minibotCorralSize, FIELD.minibotCorralSize)
    for (const station of [[20, 20, "red"], [628, 304, "red"], [20, 304, "blue"], [628, 20, "blue"]] as const) {
      context.fillStyle = station[2] === "red" ? "#7f1d1d" : "#172554"
      context.fillRect(station[0] - 15, station[1] - 11, 30, 22)
    }
    for (const tower of snapshot.towers) drawTower(context, tower)
    for (const cone of snapshot.cones) drawCone(context, cone.x, cone.y, cone.radius, cone.alliance)
    for (const robot of snapshot.robots) {
      context.save(); context.translate(robot.x, robot.y); context.rotate(robot.angle)
      context.fillStyle = robot.alliance === "red" ? "#b91c1c" : "#1d4ed8"
      context.fillRect(-15, -15, 30, 30)
      context.strokeStyle = robot.active ? "#f8fafc" : "#475569"; context.lineWidth = 2; context.strokeRect(-15, -15, 30, 30)
      context.fillStyle = "white"; context.fillRect(4, -3, 14, 6)
      context.fillStyle = "white"; context.font = "bold 11px sans-serif"; context.textAlign = "center"; context.fillText(String(robot.id + 1), 0, 4)
      if (robot.held) drawCone(context, 21, 0, 5, robot.held)
      context.restore()
    }
    context.restore()
  }, [snapshot])

  return <canvas aria-label="Top-down BunnyBots competition field" className="block w-full rounded-lg border bg-slate-900 shadow-sm" ref={canvasRef} />
}

function drawTower(context: CanvasRenderingContext2D, tower: Tower) {
  const top = [...tower.stack].reverse().find((cone) => cone !== "white")
  const topRun = top ? consecutiveTopRun(tower.stack, top) : 0
  const bunny = tower.stack.includes("white")
  context.fillStyle = tower.id === "center" ? "#a16207" : "#9a6a26"
  context.fillRect(tower.x - 8, tower.y - 8, 16, 16)
  context.strokeStyle = bunny ? "#f8fafc" : "#111827"; context.lineWidth = bunny ? 3 : 1; context.strokeRect(tower.x - 8, tower.y - 8, 16, 16)
  if (top) { context.fillStyle = colors[top]; context.beginPath(); context.arc(tower.x, tower.y, 5, 0, Math.PI * 2); context.fill() }
  if (topRun > 1) { context.fillStyle = "white"; context.font = "bold 8px sans-serif"; context.textAlign = "center"; context.fillText(`x${topRun}`, tower.x, tower.y - 11) }
  context.fillStyle = "#f8fafc"; context.font = "bold 8px sans-serif"; context.textAlign = "center"; context.fillText(`H ${tower.stack.length}`, tower.x, tower.y + 19)
}
function consecutiveTopRun(stack: Tower["stack"], color: Alliance) { let count = 0; for (const cone of [...stack].reverse()) { if (cone === "white") continue; if (cone !== color) break; count++ } return count }
function drawCone(context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: Alliance | "white") { context.fillStyle = colors[color]; context.strokeStyle = color === "white" ? "#64748b" : "#0f172a"; context.lineWidth = 1; context.beginPath(); context.moveTo(x, y - radius); context.lineTo(x + radius, y + radius); context.lineTo(x - radius, y + radius); context.closePath(); context.fill(); context.stroke() }
