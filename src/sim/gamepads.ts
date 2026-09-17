import { useEffect, useState } from "react"

export const GAMEPAD_PORT_COUNT = 4

export type ControllerPort = {
  port: number
  gamepadIndex: number | null
  id: string | null
  connected: boolean
}

type PortAssignment = {
  gamepadIndex: number
  port: number
}

let assignments: PortAssignment[] = []

function connectedGamepads() {
  if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") return []
  return Array.from(navigator.getGamepads()).filter((gamepad): gamepad is Gamepad => gamepad !== null)
}

/**
 * Browser gamepad indices are not guaranteed to be a dense 0-3 array. Keep a
 * small logical-port registry so a disconnected pad cannot make the remaining
 * controllers shift to another robot.
 */
export function scanControllerPorts(): ControllerPort[] {
  const gamepads = connectedGamepads().sort((a, b) => a.index - b.index)
  const connectedIndices = new Set(gamepads.map((gamepad) => gamepad.index))
  const activeAssignments = assignments.filter((assignment) => connectedIndices.has(assignment.gamepadIndex))
  const assignedIndices = new Set(activeAssignments.map((assignment) => assignment.gamepadIndex))
  const assignedPorts = new Set(activeAssignments.map((assignment) => assignment.port))

  for (const gamepad of gamepads) {
    if (assignedIndices.has(gamepad.index)) continue
    const port = Array.from({ length: GAMEPAD_PORT_COUNT }, (_, index) => index).find((index) => !assignedPorts.has(index))
    if (port === undefined) break
    activeAssignments.push({ gamepadIndex: gamepad.index, port })
    assignedIndices.add(gamepad.index)
    assignedPorts.add(port)
  }
  assignments = activeAssignments

  return Array.from({ length: GAMEPAD_PORT_COUNT }, (_, port) => {
    const assignment = assignments.find((candidate) => candidate.port === port)
    const gamepad = assignment ? gamepads.find((candidate) => candidate.index === assignment.gamepadIndex) : undefined
    return { port, gamepadIndex: gamepad?.index ?? null, id: gamepad?.id ?? null, connected: gamepad !== undefined }
  })
}

export function gamepadForPort(port: number) {
  const status = scanControllerPorts()[port]
  if (!status || status.gamepadIndex === null) return null
  return connectedGamepads().find((gamepad) => gamepad.index === status.gamepadIndex) ?? null
}

export function useControllerPorts() {
  const [ports, setPorts] = useState<ControllerPort[]>(() => scanControllerPorts())

  useEffect(() => {
    const refresh = () => setPorts(scanControllerPorts())
    const connected = () => refresh()
    const disconnected = () => refresh()
    refresh()
    window.addEventListener("gamepadconnected", connected)
    window.addEventListener("gamepaddisconnected", disconnected)
    const poll = window.setInterval(refresh, 500)
    return () => {
      window.removeEventListener("gamepadconnected", connected)
      window.removeEventListener("gamepaddisconnected", disconnected)
      window.clearInterval(poll)
    }
  }, [])

  return ports
}

