/**
 * Tests for the flexible date explorer.
 *
 * Validates the edge cases the algorithm has historically gotten wrong:
 *   - very narrow date ranges
 *   - trip_length_max > totalDays (overflow handling)
 *   - position labels matching actual position
 *   - seeded reproducibility
 *   - anchor-based exploitation
 */

import {
  generateFlexibleDateCandidates,
  createSeededRng,
  hashStringToSeed,
  type DateCandidate,
} from "../flexible-date-explorer"

const ymd = (date: string) => date

function tripLengthDays(c: DateCandidate): number {
  const a = new Date(c.depart_date).getTime()
  const b = new Date(c.return_date).getTime()
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

describe("generateFlexibleDateCandidates", () => {
  describe("happy path", () => {
    it("produces candidates within the requested window and trip length range", () => {
      const out = generateFlexibleDateCandidates({
        start_date: ymd("2026-05-01"),
        end_date: ymd("2026-06-15"),
        trip_length_min: 7,
        trip_length_max: 14,
        target_candidates: 20,
        seed: 1,
      })
      expect(out.length).toBeGreaterThan(0)
      for (const c of out) {
        expect(c.depart_date >= "2026-05-01").toBe(true)
        expect(c.return_date <= "2026-06-15").toBe(true)
        const len = tripLengthDays(c)
        expect(len).toBeGreaterThanOrEqual(7)
        expect(len).toBeLessThanOrEqual(14)
      }
    })

    it("position label matches actual position in the window", () => {
      const out = generateFlexibleDateCandidates({
        start_date: ymd("2026-05-01"),
        end_date: ymd("2026-06-30"),
        trip_length_min: 7,
        trip_length_max: 7,
        target_candidates: 30,
        seed: 42,
      })
      const startMs = new Date("2026-05-01").getTime()
      const endMs = new Date("2026-06-30").getTime()
      const totalDays = (endMs - startMs) / (1000 * 60 * 60 * 24)
      for (const c of out) {
        const offset = (new Date(c.depart_date).getTime() - startMs) / (1000 * 60 * 60 * 24)
        const progress = offset / totalDays
        const expectedPos = progress < 0.33 ? "early" : progress < 0.66 ? "mid" : "late"
        expect(c.start_date_position).toBe(expectedPos)
      }
    })
  })

  describe("edge cases", () => {
    it("produces every viable pair when window is narrower than trip_length_max", () => {
      // 4-day window, 3-7 day trip — only 2 viable pairs (May 1→4 and May 2→5
      // exhaust the window). Old code returned a single candidate; minimal
      // generator now enumerates.
      const out = generateFlexibleDateCandidates({
        start_date: ymd("2026-05-01"),
        end_date: ymd("2026-05-05"),
        trip_length_min: 3,
        trip_length_max: 7,
        target_candidates: 10,
      })
      // 5-day window allows depart on day 0/1/2 with length 3, day 0/1 with 4, day 0 with 5.
      // All trip lengths above 5 don't fit. So at minimum we expect more than 1.
      expect(out.length).toBeGreaterThan(1)
      for (const c of out) {
        expect(c.return_date <= "2026-05-05").toBe(true)
      }
    })

    it("does not return candidates with negative day offsets when range < trip_length_max", () => {
      const out = generateFlexibleDateCandidates({
        start_date: ymd("2026-05-01"),
        end_date: ymd("2026-05-20"),
        trip_length_min: 5,
        trip_length_max: 25, // larger than the 19-day window
        target_candidates: 15,
        seed: 7,
      })
      for (const c of out) {
        expect(c.depart_date >= "2026-05-01").toBe(true)
        expect(c.return_date <= "2026-05-20").toBe(true)
      }
    })

    it("returns no candidates with return_date past end_date even at exact window boundary", () => {
      const out = generateFlexibleDateCandidates({
        start_date: ymd("2026-05-01"),
        end_date: ymd("2026-05-08"),
        trip_length_min: 7,
        trip_length_max: 7,
        target_candidates: 10,
        seed: 99,
      })
      for (const c of out) {
        expect(c.return_date <= "2026-05-08").toBe(true)
      }
    })
  })

  describe("seeded reproducibility", () => {
    it("returns identical candidates for identical seeds", () => {
      const args = {
        start_date: ymd("2026-05-01"),
        end_date: ymd("2026-07-15"),
        trip_length_min: 5,
        trip_length_max: 12,
        target_candidates: 25,
        seed: 12345,
      }
      const a = generateFlexibleDateCandidates(args)
      const b = generateFlexibleDateCandidates(args)
      expect(a).toEqual(b)
    })

    it("returns different candidates for different seeds", () => {
      const a = generateFlexibleDateCandidates({
        start_date: ymd("2026-05-01"),
        end_date: ymd("2026-07-15"),
        trip_length_min: 5,
        trip_length_max: 12,
        target_candidates: 25,
        seed: 1,
      })
      const b = generateFlexibleDateCandidates({
        start_date: ymd("2026-05-01"),
        end_date: ymd("2026-07-15"),
        trip_length_min: 5,
        trip_length_max: 12,
        target_candidates: 25,
        seed: 2,
      })
      // Not strictly required to be entirely different, but ordering at least.
      const same = JSON.stringify(a) === JSON.stringify(b)
      expect(same).toBe(false)
    })
  })

  describe("anchors", () => {
    it("clusters a portion of candidates around anchors with ±3 day jitter", () => {
      const anchorDate = "2026-06-10"
      const out = generateFlexibleDateCandidates({
        start_date: ymd("2026-05-01"),
        end_date: ymd("2026-07-15"),
        trip_length_min: 7,
        trip_length_max: 7,
        target_candidates: 20,
        seed: 314,
        anchors: [{ depart_date: anchorDate, weight: 1 }],
        exploit_share: 0.5,
      })
      const anchorMs = new Date(anchorDate).getTime()
      const within = out.filter((c) => {
        const diffDays = Math.abs(new Date(c.depart_date).getTime() - anchorMs) / 86400000
        return diffDays <= 3
      })
      // At least one candidate within the jitter window of the anchor.
      expect(within.length).toBeGreaterThan(0)
    })

    it("ignores anchors outside the date window", () => {
      const out = generateFlexibleDateCandidates({
        start_date: ymd("2026-05-01"),
        end_date: ymd("2026-05-31"),
        trip_length_min: 5,
        trip_length_max: 7,
        target_candidates: 15,
        seed: 9,
        anchors: [{ depart_date: "2025-12-25", weight: 5 }], // before window
      })
      for (const c of out) {
        expect(c.depart_date >= "2026-05-01").toBe(true)
      }
    })
  })
})

describe("createSeededRng", () => {
  it("produces deterministic float sequences in [0, 1)", () => {
    const rng = createSeededRng(42)
    const seq = Array.from({ length: 10 }, () => rng())
    for (const v of seq) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
    const rng2 = createSeededRng(42)
    const seq2 = Array.from({ length: 10 }, () => rng2())
    expect(seq).toEqual(seq2)
  })
})

describe("hashStringToSeed", () => {
  it("returns the same seed for the same input", () => {
    expect(hashStringToSeed("holiday-123:2026-W17")).toBe(hashStringToSeed("holiday-123:2026-W17"))
  })

  it("returns different seeds for different inputs", () => {
    expect(hashStringToSeed("holiday-123:2026-W17")).not.toBe(hashStringToSeed("holiday-123:2026-W18"))
  })
})
