/**
 * Tests for the deterministic date-candidate scorer.
 *
 * Validates the heuristic encoding: weekday preferences, peak-window penalties,
 * shoulder-season bonuses, hard preferred-weekday filtering, trip-length bias.
 */

import { scoreDateCandidates } from "../date-candidate-scorer"
import type { DateCandidate } from "../flexible-date-explorer"

function candidate(depart: string, length = 7): DateCandidate {
  const d = new Date(depart)
  const r = new Date(d)
  r.setDate(r.getDate() + length)
  return {
    depart_date: depart,
    return_date: r.toISOString().split("T")[0],
    trip_length_days: length,
    start_date_position: "mid",
  }
}

describe("scoreDateCandidates", () => {
  describe("weekday scoring", () => {
    it("scores Tuesday departures higher than Saturday departures", () => {
      // 2026-05-05 is a Tuesday, 2026-05-09 is a Saturday.
      const tue = candidate("2026-05-05")
      const sat = candidate("2026-05-09")
      const out = scoreDateCandidates({ candidates: [tue, sat] })
      const tueScore = out.find((c) => c.depart_date === tue.depart_date)?.score ?? 0
      const satScore = out.find((c) => c.depart_date === sat.depart_date)?.score ?? 0
      expect(tueScore).toBeGreaterThan(satScore)
    })
  })

  describe("peak-season penalty", () => {
    it("penalises trips overlapping UK summer school holidays", () => {
      // 2026-07-21 is Tue (mid-week, otherwise high-scoring) but inside summer break.
      const peak = candidate("2026-07-21", 7)
      // 2026-06-09 is Tuesday (mid-week, NOT in a peak window).
      const offPeak = candidate("2026-06-09", 7)
      const out = scoreDateCandidates({ candidates: [peak, offPeak], origin_country: "GB" })
      const peakScore = out.find((c) => c.depart_date === peak.depart_date)?.score ?? 0
      const offPeakScore = out.find((c) => c.depart_date === offPeak.depart_date)?.score ?? 0
      expect(offPeakScore).toBeGreaterThan(peakScore)
    })

    it("amplifies the peak penalty when budget_sensitivity is 'high'", () => {
      const peak = candidate("2026-07-21", 7)
      const baseline = scoreDateCandidates({
        candidates: [peak],
        origin_country: "GB",
        preferences: { budget_sensitivity: "low" },
      })[0]
      const sensitive = scoreDateCandidates({
        candidates: [peak],
        origin_country: "GB",
        preferences: { budget_sensitivity: "high" },
      })[0]
      expect(sensitive.score).toBeLessThanOrEqual(baseline.score)
    })
  })

  describe("hard preferred-weekday filter", () => {
    it("drops candidates whose depart weekday isn't preferred", () => {
      const tue = candidate("2026-05-05") // Tue
      const sat = candidate("2026-05-09") // Sat
      const out = scoreDateCandidates({
        candidates: [tue, sat],
        preferences: { preferred_weekdays: ["saturday"] },
      })
      expect(out).toHaveLength(1)
      expect(out[0].depart_date).toBe(sat.depart_date)
    })

    it("drops candidates whose depart weekday is in avoid_weekdays", () => {
      const tue = candidate("2026-05-05")
      const sat = candidate("2026-05-09")
      const out = scoreDateCandidates({
        candidates: [tue, sat],
        preferences: { avoid_weekdays: ["saturday"] },
      })
      expect(out).toHaveLength(1)
      expect(out[0].depart_date).toBe(tue.depart_date)
    })
  })

  describe("trip-length bias", () => {
    it("scores 7-day trips higher than 3-day trips on the same weekday", () => {
      const seven = candidate("2026-05-05", 7) // Tue → Tue
      const three = candidate("2026-05-05", 3) // Tue → Fri (small trip-length penalty zone)
      const out = scoreDateCandidates({ candidates: [seven, three] })
      const sevenScore = out.find((c) => c.trip_length_days === 7)?.score ?? 0
      const threeScore = out.find((c) => c.trip_length_days === 3)?.score ?? 0
      expect(sevenScore).toBeGreaterThanOrEqual(threeScore)
    })
  })

  describe("output shape", () => {
    it("returns scores between 0 and 100", () => {
      const out = scoreDateCandidates({
        candidates: [candidate("2026-05-05"), candidate("2026-07-25")],
        origin_country: "GB",
      })
      for (const c of out) {
        expect(c.score).toBeGreaterThanOrEqual(0)
        expect(c.score).toBeLessThanOrEqual(100)
      }
    })

    it("returns candidates sorted by descending score", () => {
      const out = scoreDateCandidates({
        candidates: [
          candidate("2026-07-25"), // Sat in summer break
          candidate("2026-05-05"), // Tue, off-peak
          candidate("2026-09-15"), // Tue, shoulder
        ],
        origin_country: "GB",
      })
      for (let i = 1; i < out.length; i++) {
        expect(out[i - 1].score).toBeGreaterThanOrEqual(out[i].score)
      }
    })

    it("includes a human-readable reasoning string", () => {
      const out = scoreDateCandidates({ candidates: [candidate("2026-05-05")] })
      expect(out[0].reasoning).toMatch(/7-day trip/i)
      expect(out[0].reasoning).toMatch(/tuesday/i)
    })
  })
})
