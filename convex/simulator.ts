import { paginationOptsValidator, paginationResultValidator } from "convex/server"
import { v } from "convex/values"

import { query, mutation } from "./_generated/server"

const robotConfigValidator = v.object({
  translationSpeed: v.number(),
  rotationSpeed: v.number(),
  intakeSeconds: v.number(),
  scoreSeconds: v.number(),
})

async function identityOrThrow(ctx: { auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error("Sign in to save simulator data.")
  return identity
}

export const getPreferences = query({
  args: {},
  returns: v.union(v.null(), v.object({ robotConfigs: v.array(robotConfigValidator) })),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique()
    return preferences ? { robotConfigs: preferences.robotConfigs } : null
  },
})

export const savePreferences = mutation({
  args: { robotConfigs: v.array(robotConfigValidator) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await identityOrThrow(ctx)
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique()
    if (existing) await ctx.db.patch(existing._id, { robotConfigs: args.robotConfigs })
    else await ctx.db.insert("userPreferences", { tokenIdentifier: identity.tokenIdentifier, robotConfigs: args.robotConfigs })
    return null
  },
})

export const saveResult = mutation({
  args: {
    seed: v.number(),
    redScore: v.number(),
    blueScore: v.number(),
    configuration: v.string(),
    events: v.array(v.object({ atSeconds: v.number(), kind: v.string(), detail: v.string() })),
  },
  returns: v.id("matchResults"),
  handler: async (ctx, args) => {
    const identity = await identityOrThrow(ctx)
    const matchId = await ctx.db.insert("matchResults", {
      tokenIdentifier: identity.tokenIdentifier,
      seed: args.seed,
      redScore: args.redScore,
      blueScore: args.blueScore,
      endedAt: Date.now(),
      configuration: args.configuration,
    })
    for (const [sequence, event] of args.events.slice(0, 512).entries()) {
      await ctx.db.insert("matchEvents", { matchId, sequence, ...event })
    }
    return matchId
  },
})

export const listResults = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(
    v.object({ _id: v.id("matchResults"), _creationTime: v.number(), seed: v.number(), redScore: v.number(), blueScore: v.number(), endedAt: v.number() }),
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return { page: [], isDone: true, continueCursor: "" }
    return await ctx.db
      .query("matchResults")
      .withIndex("by_token_identifier_and_ended_at", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .order("desc")
      .paginate(args.paginationOpts)
  },
})
