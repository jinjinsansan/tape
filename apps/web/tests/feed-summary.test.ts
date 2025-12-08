import { describe, expect, it } from "vitest";

import { buildReactionSummary } from "@/server/services/feed";

describe("buildReactionSummary", () => {
  it("aggregates counts and viewer reactions", () => {
    const reactions = [
      { reaction_type: "cheer", user_id: "u1" },
      { reaction_type: "cheer", user_id: "u2" },
      { reaction_type: "hug", user_id: "u3" }
    ];

    const summary = buildReactionSummary(reactions, "u2");

    expect(summary.counts).toEqual({ cheer: 2, hug: 1 });
    expect(summary.viewerReaction).toBe("cheer");
    expect(summary.total).toBe(3);
  });

  it("handles viewer without reaction", () => {
    const summary = buildReactionSummary([], "viewer");
    expect(summary.counts).toEqual({});
    expect(summary.viewerReaction).toBeNull();
    expect(summary.total).toBe(0);
  });
});
