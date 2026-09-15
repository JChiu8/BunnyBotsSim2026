import type { Alliance, ScoreBreakdown, Tower } from "@/sim/types"

const LINES = [
  ["tl", "tm", "tr"], ["ml", "center", "mr"], ["bl", "bm", "br"],
  ["tl", "ml", "bl"], ["tm", "center", "bm"], ["tr", "mr", "br"],
  ["tl", "center", "br"], ["tr", "center", "bl"],
]

function hasBunny(tower: Tower) { return tower.stack.includes("white") }
function control(tower: Tower): Alliance | null {
  for (let index = tower.stack.length - 1; index >= 0; index--) {
    const cone = tower.stack[index]
    if (cone !== "white") return cone
  }
  return null
}

export function scoreTowers(towers: Tower[], autoPoints: Record<Alliance, number>): ScoreBreakdown {
  const scores = { red: { auto: autoPoints.red, cones: 0, runs: 0, tictactoes: 0, bunnies: 0, total: 0 }, blue: { auto: autoPoints.blue, cones: 0, runs: 0, tictactoes: 0, bunnies: 0, total: 0 } }
  const byId = new Map(towers.map((tower) => [tower.id, tower]))
  for (const tower of towers) {
    const bunnyBonus = hasBunny(tower)
    for (const alliance of ["red", "blue"] as const) {
      const coneCount = tower.stack.filter((cone) => cone === alliance).length
      scores[alliance].cones += coneCount
      if (bunnyBonus) scores[alliance].bunnies += coneCount
      let consecutive = 0
      let runs = 0
      for (const cone of tower.stack) {
        if (cone === alliance) {
          consecutive++
          // Each non-overlapping group of exactly three makes one run: 3 -> 1, 6 -> 2.
          if (consecutive === 3) { runs++; consecutive = 0 }
        } else if (cone !== "white") consecutive = 0
      }
      scores[alliance].runs += runs * 5
      // A bonus bunny doubles only the first two vertical runs. Additional
      // runs still score their normal five points each.
      if (bunnyBonus) scores[alliance].bunnies += Math.min(2, runs) * 5
    }
  }
  for (const ids of LINES) {
    const line = ids.map((id) => byId.get(id)!).filter(Boolean)
    const owner = control(line[0])
    if (owner && line.every((tower) => control(tower) === owner)) {
      scores[owner].tictactoes += 20
      if (line.some(hasBunny)) scores[owner].bunnies += 20
    }
  }
  for (const alliance of ["red", "blue"] as const) {
    const score = scores[alliance]
    score.total = score.auto + score.cones + score.runs + score.tictactoes + score.bunnies
  }
  return scores
}
