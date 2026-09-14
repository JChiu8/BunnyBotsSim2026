import { authTables } from "@convex-dev/auth/server"
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  ...authTables,
  userPreferences: defineTable({
    tokenIdentifier: v.string(),
    robotConfigs: v.array(
      v.object({
        translationSpeed: v.number(),
        rotationSpeed: v.number(),
        intakeSeconds: v.number(),
        scoreSeconds: v.number(),
      }),
    ),
  }).index("by_token_identifier", ["tokenIdentifier"]),
  matchResults: defineTable({
    tokenIdentifier: v.string(),
    seed: v.number(),
    redScore: v.number(),
    blueScore: v.number(),
    endedAt: v.number(),
    configuration: v.string(),
  }).index("by_token_identifier_and_ended_at", ["tokenIdentifier", "endedAt"]),
  matchEvents: defineTable({
    matchId: v.id("matchResults"),
    sequence: v.number(),
    atSeconds: v.number(),
    kind: v.string(),
    detail: v.string(),
  }).index("by_match_id_and_sequence", ["matchId", "sequence"]),
})
