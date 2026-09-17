import Matter from "matter-js"

import { scoreTowers } from "@/sim/scoring"
import { DEFAULT_CONFIG, FIELD, MAX_STACK_HEIGHT, type Alliance, type Cone, type DriverInput, type RobotSetup, type Snapshot, type Tower } from "@/sim/types"

const { Bodies, Body, Collision, Composite, Engine, Vector } = Matter
const PHYSICS_TICKS_PER_SECOND = 60
const SCORE_STANDOFF = 33
const SCORE_LATERAL_TOLERANCE = 4
const SCORE_LONGITUDINAL_TOLERANCE = 4
const SCORE_HEADING_TOLERANCE = Math.PI / 24
const towerPositions = [
  ["tl", 151.5, 29.5], ["tm", 324, 29.5], ["tr", 496.5, 29.5],
  ["ml", 43.5, 162], ["center", 324, 162], ["mr", 604.5, 162],
  ["bl", 151.5, 294.5], ["bm", 324, 294.5], ["br", 496.5, 294.5],
] as const
type BodyMeta = { kind: "robot"; robotId: number } | { kind: "cone"; coneId: string }
type RobotRuntime = { id: number; alliance: Alliance; body: Matter.Body; held: Cone | null; action: "idle" | "intake" | "score"; actionProgress: number; actionTargetId: string | null; input: DriverInput; driveVelocity: Matter.Vector; mobility: boolean; bunnyHeld: boolean }
type ConeEntry = { cone: Cone; body: Matter.Body }
type TowerApproach = { tower: Tower; normal: Matter.Vector; position: Matter.Vector; heading: number }

function random(seed: number) {
  let value = seed >>> 0
  return () => { value += 0x6d2b79f5; let next = value; next = Math.imul(next ^ (next >>> 15), next | 1); next ^= next + Math.imul(next ^ (next >>> 7), next | 61); return ((next ^ (next >>> 14)) >>> 0) / 4294967296 }
}

export class SimulatorEngine {
  readonly engine = Engine.create({ gravity: { x: 0, y: 0, scale: 0 } })
  readonly towers: Tower[] = towerPositions.map(([id, x, y]) => ({ id, x, y, stack: [], stackedBy: [], scoreable: id !== "center" }))
  readonly robots: RobotRuntime[] = Array.from({ length: 4 }, (_, id) => ({ id, alliance: id < 2 ? "red" : "blue", body: Bodies.rectangle(id < 2 ? 235 : 413, id % 2 ? 215 : 109, FIELD.robotSize, FIELD.robotSize, { density: 0.1, friction: 1, frictionStatic: 100, restitution: 0, label: "robot" }), held: null, action: "idle", actionProgress: 0, actionTargetId: null, input: emptyInput(), driveVelocity: { x: 0, y: 0 }, mobility: false, bunnyHeld: false }))
  readonly cones = new Map<string, ConeEntry>()
  readonly autoPoints: Record<Alliance, number> = { red: 0, blue: 0 }
  readonly feedRemaining: Record<Alliance, number[]> = { red: [15, 14], blue: [15, 14] }
  readonly bunnyRequested: Record<Alliance, boolean> = { red: false, blue: false }
  readonly bunnyStation: Record<Alliance, number | null> = { red: null, blue: null }
  readonly bunnyReleased: Record<Alliance, boolean> = { red: false, blue: false }
  readonly nextHumanPlayerDeploy: Record<Alliance, number[]> = { red: [0, 0], blue: [0, 0] }
  readonly events: Snapshot["events"] = []
  elapsed = 0
  started = false
  paused = false
  ended = false
  accumulator = 0
  nextCone = 0
  nextCenterEvent = 30
  readonly setups: RobotSetup[]
  readonly seed: number
  readonly centerTowerRandomEnabled: boolean

  constructor(setups: RobotSetup[], seed: number, options: { centerTowerRandomEnabled?: boolean } = {}) {
    this.setups = setups
    this.seed = seed
    this.centerTowerRandomEnabled = options.centerTowerRandomEnabled ?? true
    for (const robot of this.robots) {
      robot.body.plugin.meta = { kind: "robot", robotId: robot.id } satisfies BodyMeta
      Composite.add(this.engine.world, robot.body)
    }
    const walls = [Bodies.rectangle(324, -5, 658, 10, { isStatic: true }), Bodies.rectangle(324, 329, 658, 10, { isStatic: true }), Bodies.rectangle(-5, 162, 10, 334, { isStatic: true }), Bodies.rectangle(653, 162, 10, 334, { isStatic: true })]
    const towerBodies = this.towers.map((tower) => Bodies.rectangle(tower.x, tower.y, FIELD.towerSize, FIELD.towerSize, { isStatic: true, label: "tower" }))
    const corralHalf = FIELD.minibotCorralSize / 2
    const corralThickness = FIELD.corralWallThickness
    const corral = [
      Bodies.rectangle(FIELD.centerX, FIELD.centerY - corralHalf, FIELD.minibotCorralSize + corralThickness, corralThickness, { isStatic: true, label: "minibot-corral" }),
      Bodies.rectangle(FIELD.centerX, FIELD.centerY + corralHalf, FIELD.minibotCorralSize + corralThickness, corralThickness, { isStatic: true, label: "minibot-corral" }),
      Bodies.rectangle(FIELD.centerX - corralHalf, FIELD.centerY, corralThickness, FIELD.minibotCorralSize, { isStatic: true, label: "minibot-corral" }),
      Bodies.rectangle(FIELD.centerX + corralHalf, FIELD.centerY, corralThickness, FIELD.minibotCorralSize, { isStatic: true, label: "minibot-corral" }),
    ]
    Composite.add(this.engine.world, [...walls, ...towerBodies, ...corral])
    const rand = random(seed)
    for (let index = 0; index < 42; index++) {
      const position = this.initialConePosition(index, 42, rand)
      this.spawnCone(index % 2 ? "blue" : "red", position.x, position.y)
    }
  }

  start() {
    if (this.started) return
    this.started = true
    this.record("match-start", `Seed ${this.seed}`)
  }

  setInput(id: number, input: DriverInput) { this.robots[id].input = input }
  togglePause() { if (!this.ended) this.paused = !this.paused }
  private record(kind: string, detail: string) { this.events.push({ atSeconds: Math.round(this.elapsed * 10) / 10, kind, detail }) }

  update(deltaMs: number) {
    if (!this.started || this.paused || this.ended) return
    this.accumulator += Math.min(deltaMs, 100) / 1000
    while (this.accumulator >= 1 / 60) { this.step(1 / 60); this.accumulator -= 1 / 60 }
  }

  private step(dt: number) {
    this.elapsed += dt
    const phase = this.elapsed < 15 ? "auto" : "teleop"
    for (const robot of this.robots) this.driveRobot(robot, dt, phase)
    if (phase === "teleop") this.processFeeds()
    while (this.centerTowerRandomEnabled && this.elapsed >= this.nextCenterEvent && this.nextCenterEvent <= 120) {
      this.addToTower("center", this.seededAlliance(this.nextCenterEvent), "center-event")
      this.nextCenterEvent += 30
    }
    Engine.update(this.engine, dt * 1000)
    // Drivetrains immediately reassert their commanded velocity after a collision impulse.
    // This keeps robots from being easily shoved by cones or another robot.
    for (const robot of this.robots) Body.setVelocity(robot.body, robot.driveVelocity)
    if (this.elapsed >= 150) { this.ended = true; this.record("match-end", "Clock expired") }
  }

  private driveRobot(robot: RobotRuntime, dt: number, phase: "auto" | "teleop") {
    const config = this.setups[robot.id] ?? DEFAULT_CONFIG
    const active = config.controllerIndex !== null || config.keyboard
    if (!active) { robot.driveVelocity = { x: 0, y: 0 }; Body.setVelocity(robot.body, robot.driveVelocity); return }
    let input = robot.input
    if (input.align) input = this.alignInput(robot)
    // Matter velocities are expressed in inches per physics tick, not inches per second.
    const requestedVelocity = { x: input.x * config.translationSpeed * 12 / PHYSICS_TICKS_PER_SECOND, y: input.y * config.translationSpeed * 12 / PHYSICS_TICKS_PER_SECOND }
    const resistance = this.robotResistance(robot, requestedVelocity)
    const velocity = Vector.mult(requestedVelocity, resistance)
    robot.driveVelocity = velocity
    Body.setVelocity(robot.body, velocity)
    Body.setAngularVelocity(robot.body, input.rotation * (config.rotationSpeed * Math.PI / 180) / PHYSICS_TICKS_PER_SECOND)
    if (phase === "auto" && !robot.mobility && (robot.alliance === "red" ? robot.body.position.x < 105 : robot.body.position.x > 543)) { robot.mobility = true; this.autoPoints[robot.alliance] += 5; this.record("mobility", `${robot.alliance} robot ${robot.id + 1}`) }
    // Keeping Y held through the auto-to-teleop transition should still request the bunny.
    if (input.bunny && phase === "teleop" && !this.bunnyReleased[robot.alliance] && !this.bunnyRequested[robot.alliance]) { this.bunnyRequested[robot.alliance] = true; this.bunnyStation[robot.alliance] = this.nearestFeedStation(robot.body.position, robot.alliance); this.record("bunny-request", `${robot.alliance} robot ${robot.id + 1}`) }
    const wants = robot.held ? input.score : input.intake
    const duration = robot.held ? config.scoreSeconds : config.intakeSeconds
    if (!wants) { robot.action = "idle"; robot.actionProgress = 0; robot.actionTargetId = null; return }
    const target = robot.held ? this.nearestScoreTower(robot) : this.nearestCone(robot)
    if (!target && !robot.held) { robot.action = "idle"; robot.actionProgress = 0; robot.actionTargetId = null; return }
    robot.action = robot.held ? "score" : "intake"
    const targetId = robot.held ? (target as Tower | null)?.id ?? null : null
    // A scoring countdown is only valid while the same tower remains in the robot's forward scoring zone.
    // A countdown away from every tower is a deliberate release countdown instead.
    if (robot.actionTargetId !== targetId) robot.actionProgress = 0
    robot.actionTargetId = targetId
    robot.actionProgress += dt / duration
    if (robot.actionProgress >= 1) {
      if (robot.held && target) this.score(robot, target as Tower, phase)
      else if (robot.held) this.release(robot)
      else this.intake(robot, target as ConeEntry)
      robot.action = "idle"; robot.actionProgress = 0; robot.actionTargetId = null
    }
  }

  private alignInput(robot: RobotRuntime): DriverInput {
    const tower = this.towers.filter((candidate) => candidate.scoreable).sort((a, b) => distance(robot.body.position, a) - distance(robot.body.position, b))[0]
    const target = this.closestApproach(robot.body.position, tower)
    const dx = target.position.x - robot.body.position.x; const dy = target.position.y - robot.body.position.y
    const dist = Math.hypot(dx, dy); const angle = Math.atan2(dy, dx)
    const headingDiff = normalize(target.heading - robot.body.angle)
    return { x: dist > 2 ? Math.cos(angle) * 0.55 : 0, y: dist > 2 ? Math.sin(angle) * 0.55 : 0, rotation: Math.max(-1, Math.min(1, headingDiff / 0.95)), intake: robot.input.intake, score: robot.input.score, align: true, bunny: robot.input.bunny }
  }

  private nearestCone(robot: RobotRuntime) {
    // Matter owns the live position. Cone.x/y are only a snapshot fallback while held.
    return this.freeCones().filter((entry) => distance(robot.body.position, entry.body.position) < 32).sort((a, b) => distance(robot.body.position, a.body.position) - distance(robot.body.position, b.body.position))[0] ?? null
  }
  private nearestScoreTower(robot: RobotRuntime) {
    return this.towers.filter((tower) => tower.scoreable && this.robotStackHeight(robot.id, tower) < this.robotMaxStackHeight(robot.id)).map((tower) => this.closestApproach(robot.body.position, tower)).find((approach) => this.isAlignedForScore(robot, approach))?.tower ?? null
  }
  private intake(robot: RobotRuntime, entry: ConeEntry) {
    entry.cone.x = entry.body.position.x; entry.cone.y = entry.body.position.y
    robot.held = entry.cone; entry.cone.heldBy = robot.id
    Composite.remove(this.engine.world, entry.body)
    this.record("intake", `${robot.alliance} robot ${robot.id + 1} picked up ${entry.cone.alliance}`)
  }
  private score(robot: RobotRuntime, tower: Tower, phase: "auto" | "teleop") { if (this.robotStackHeight(robot.id, tower) >= this.robotMaxStackHeight(robot.id)) return; const cone = robot.held!; tower.stack.push(cone.alliance); tower.stackedBy.push(robot.id); if (phase === "auto") this.autoPoints[robot.alliance] += 5; this.cones.delete(cone.id); robot.held = null; this.record("score", `${robot.alliance} robot ${robot.id + 1} scored ${cone.alliance} on ${tower.id}`) }
  private release(robot: RobotRuntime) {
    const cone = robot.held!
    const position = this.heldPosition(robot)
    cone.x = position.x; cone.y = position.y; cone.heldBy = null
    const body = this.createConeBody(cone, position.x, position.y)
    Body.setVelocity(body, Vector.mult(robot.body.velocity, 0.75))
    this.cones.set(cone.id, { cone, body }); Composite.add(this.engine.world, body)
    robot.held = null
    this.record("release", `${robot.alliance} robot ${robot.id + 1} released ${cone.alliance}`)
  }
  private heldPosition(robot: RobotRuntime) { return { x: robot.body.position.x + Math.cos(robot.body.angle) * 21, y: robot.body.position.y + Math.sin(robot.body.angle) * 21 } }
  private processFeeds() {
    for (const alliance of ["red", "blue"] as const) {
      for (const station of [0, 1]) {
        if (this.elapsed < this.nextHumanPlayerDeploy[alliance][station]) continue
        const location = feedLocation(alliance, station)
        const occupied = this.freeCones().some(({ body }) => distance(body.position, location) < 22)
        if (occupied) continue
        if (this.bunnyRequested[alliance] && !this.bunnyReleased[alliance] && this.bunnyStation[alliance] === station) { this.spawnCone("white", location.x, location.y); this.bunnyReleased[alliance] = true; this.bunnyStation[alliance] = null; this.nextHumanPlayerDeploy[alliance][station] = this.elapsed + 3; this.record("bunny-release", `${alliance} bunny at station ${station + 1}`); continue }
        if (this.feedRemaining[alliance][station] > 0) { this.feedRemaining[alliance][station]--; this.spawnCone(alliance, location.x, location.y); this.nextHumanPlayerDeploy[alliance][station] = this.elapsed + 3 }
      }
    }
  }
  private nearestFeedStation(position: Matter.Vector, alliance: Alliance) {
    return [0, 1].reduce((nearest, station) => distance(position, feedLocation(alliance, station)) < distance(position, feedLocation(alliance, nearest)) ? station : nearest)
  }
  private robotResistance(robot: RobotRuntime, velocity: Matter.Vector) {
    if (Vector.magnitudeSquared(velocity) === 0) return 1
    const isDrivingToward = (body: Matter.Body) => {
      const towardBody = Vector.sub(body.position, robot.body.position)
      // Require a mostly head-on interaction; side-by-side scraping is not a push.
      return Vector.dot(Vector.normalise(velocity), Vector.normalise(towardBody)) >= 0.8
    }
    const isDrivingIntoRobot = this.robots.some((other) => other.id !== robot.id && Collision.collides(robot.body, other.body) && isDrivingToward(other.body))
    const cones = this.freeCones()
    const pushedCones = cones.filter(({ body }) => Collision.collides(robot.body, body) && isDrivingToward(body))
    // Walk the entire touching-cone pile, so several cones between robots cannot
    // bypass the robot-to-robot drivetrain limit.
    const connectedConeBodies = new Set(pushedCones.map(({ body }) => body))
    const pendingConeBodies = [...connectedConeBodies]
    let isPushingRobotThroughCones = false
    while (pendingConeBodies.length > 0 && !isPushingRobotThroughCones) {
      const coneBody = pendingConeBodies.pop()!
      isPushingRobotThroughCones = this.robots.some((other) => other.id !== robot.id && Collision.collides(coneBody, other.body) && isDrivingToward(other.body))
      for (const { body } of cones) {
        if (!connectedConeBodies.has(body) && Collision.collides(coneBody, body)) { connectedConeBodies.add(body); pendingConeBodies.push(body) }
      }
    }
    // This is a deliberate drivetrain limit rather than a bounce: pushing robots becomes slow.
    if (isDrivingIntoRobot || isPushingRobotThroughCones) return 0.12
    // Cones provide noticeable but lighter resistance when they are not braced against another robot.
    return pushedCones.length > 0 ? 0.7 : 1
  }
  private approaches(tower: Tower): TowerApproach[] {
    return [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }].map((normal) => ({
      tower,
      normal,
      position: { x: tower.x + normal.x * SCORE_STANDOFF, y: tower.y + normal.y * SCORE_STANDOFF },
      heading: Math.atan2(-normal.y, -normal.x),
    }))
  }
  private closestApproach(position: Matter.Vector, tower: Tower) {
    return this.approaches(tower).sort((a, b) => distance(position, a.position) - distance(position, b.position))[0]
  }
  private isAlignedForScore(robot: RobotRuntime, approach: TowerApproach) {
    const offset = Vector.sub(robot.body.position, approach.position)
    const lateral = Math.abs(offset.x * -approach.normal.y + offset.y * approach.normal.x)
    const longitudinal = Math.abs(Vector.dot(offset, approach.normal))
    const headingError = Math.abs(normalize(robot.body.angle - approach.heading))
    return lateral <= SCORE_LATERAL_TOLERANCE && longitudinal <= SCORE_LONGITUDINAL_TOLERANCE && headingError <= SCORE_HEADING_TOLERANCE
  }
  private initialConePosition(index: number, total: number, rand: () => number) {
    const half = FIELD.minibotCorralSize / 2 + FIELD.corralWallThickness / 2 + 5.25 + 3
    const perimeter = half * 8
    const distanceAlong = ((index + rand()) / total) * perimeter
    const side = Math.floor(distanceAlong / (half * 2))
    const offset = distanceAlong % (half * 2)
    if (side === 0) return { x: FIELD.centerX - half + offset, y: FIELD.centerY - half }
    if (side === 1) return { x: FIELD.centerX + half, y: FIELD.centerY - half + offset }
    if (side === 2) return { x: FIELD.centerX + half - offset, y: FIELD.centerY + half }
    return { x: FIELD.centerX - half, y: FIELD.centerY + half - offset }
  }
  private addToTower(id: string, alliance: Alliance, event: string) { const tower = this.towers.find((candidate) => candidate.id === id)!; tower.stack.push(alliance); tower.stackedBy.push(null); this.record(event, `${alliance} cone added to ${id}`) }
  private robotMaxStackHeight(robotId: number) { return Math.min(MAX_STACK_HEIGHT, Math.max(1, Math.round(this.setups[robotId]?.maxStackHeight ?? DEFAULT_CONFIG.maxStackHeight))) }
  private robotStackHeight(robotId: number, tower: Tower) { return tower.stackedBy.filter((owner) => owner === robotId).length }
  private seededAlliance(at: number): Alliance { return random(this.seed ^ Math.floor(at * 997))() < 0.5 ? "red" : "blue" }
  private freeCones() { return [...this.cones.values()].filter((entry) => entry.cone.heldBy === null) }
  private createConeBody(cone: Cone, x: number, y: number) {
    // Cones should resist being bulldozed while still remaining movable enough for play.
    const body = Bodies.circle(x, y, cone.radius, { density: 0.3, friction: 1, frictionStatic: 50, frictionAir: 0.2, restitution: 0, label: "cone" })
    body.plugin.meta = { kind: "cone", coneId: cone.id } satisfies BodyMeta
    return body
  }
  private spawnCone(alliance: Alliance | "white", x: number, y: number) { const cone: Cone = { id: `cone-${this.nextCone++}`, alliance, x, y, radius: alliance === "white" ? 6 : 5.25, heldBy: null }; const body = this.createConeBody(cone, x, y); this.cones.set(cone.id, { cone, body }); Composite.add(this.engine.world, body) }
  snapshot(): Snapshot {
    const towers = this.towers.map((tower) => ({ ...tower, stack: [...tower.stack], stackedBy: [...tower.stackedBy] }))
    const cones = this.freeCones().map(({ cone, body }) => ({ ...cone, x: body.position.x, y: body.position.y }))
    const robots = this.robots.map((robot) => ({ id: robot.id, alliance: robot.alliance, x: robot.body.position.x, y: robot.body.position.y, angle: robot.body.angle, held: robot.held?.alliance ?? null, action: robot.action, progress: robot.actionProgress, active: this.setups[robot.id]?.controllerIndex !== null || this.setups[robot.id]?.keyboard, maxStackHeight: this.robotMaxStackHeight(robot.id) }))
    const breakdown = this.ended ? scoreTowers(towers, this.autoPoints) : null
    const live = breakdown ?? scoreTowers(towers, this.autoPoints)
    return { phase: this.elapsed < 15 ? "auto" : this.ended ? "final" : "teleop", remaining: Math.max(0, 150 - this.elapsed), redScore: live.red.total, blueScore: live.blue.total, towers, cones, robots, paused: this.paused, ended: this.ended, events: [...this.events], finalBreakdown: breakdown }
  }
  dispose() { Composite.clear(this.engine.world, false); Engine.clear(this.engine) }
}
function emptyInput(): DriverInput { return { x: 0, y: 0, rotation: 0, intake: false, score: false, align: false, bunny: false } }
function distance(a: { x: number; y: number }, b: { x: number; y: number }) { return Math.hypot(a.x - b.x, a.y - b.y) }
function normalize(angle: number) { return Math.atan2(Math.sin(angle), Math.cos(angle)) }
function feedLocation(alliance: Alliance, station: number) { const locations = alliance === "red" ? [{ x: 20, y: 20 }, { x: 628, y: 304 }] : [{ x: 20, y: 304 }, { x: 628, y: 20 }]; return locations[station] }
