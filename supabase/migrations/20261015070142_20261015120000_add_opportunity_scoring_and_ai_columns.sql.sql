/*
# Add Scoring and AI Analysis Columns to Opportunities

## Purpose
Extend the opportunities table with numeric scoring fields and AI-generated
analysis columns so the UI can display real, data-driven scoring and AI
findings instead of placeholder/heuristic values.

## New Columns on `opportunities`

1. **fit_score_value** (integer, nullable) — Numeric FIT score (0–40)
2. **person_score_value** (integer, nullable) — Numeric PERSON score (0–30)
3. **timing_score_value** (integer, nullable) — Numeric TIMING score (0–30)
4. **total_score** (integer, nullable) — Computed total (0–100), kept in sync by the app
5. **ai_summary** (text, nullable) — AI-generated executive summary
6. **ai_supporting_findings** (text[], nullable) — Array of AI-identified supporting findings
7. **ai_conflicts** (text[], nullable) — Array of AI-identified conflicts
8. **ai_missing_information** (text[], nullable) — Array of AI-identified missing info
9. **ai_confidence** (text, nullable) — Confidence level: 'high' | 'medium' | 'low'
10. **ai_rationale** (text, nullable) — AI reasoning for the FIT assessment
11. **ai_person_assessment** (text, nullable) — AI reasoning for the PERSON assessment
12. **ai_timing_assessment** (text, nullable) — AI reasoning for the TIMING assessment

## Security
No RLS changes — the opportunities table already has RLS enabled with
existing policies. No new tables are created.

## Backfill
Existing rows are updated with derived scores based on their current
fit_score text value so the UI shows meaningful data immediately.
*/

-- Add scoring columns
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS fit_score_value integer;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS person_score_value integer;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS timing_score_value integer;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS total_score integer;

-- Add AI analysis columns
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS ai_summary text;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS ai_supporting_findings text[];
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS ai_conflicts text[];
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS ai_missing_information text[];
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS ai_confidence text CHECK (ai_confidence IN ('high', 'medium', 'low'));
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS ai_rationale text;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS ai_person_assessment text;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS ai_timing_assessment text;

-- Backfill existing rows with derived scores and AI placeholders based on fit_score
UPDATE opportunities SET
  fit_score_value = CASE fit_score
    WHEN 'strong' THEN 35
    WHEN 'moderate' THEN 25
    WHEN 'weak' THEN 10
    ELSE 0
  END,
  person_score_value = 18,
  timing_score_value = 18,
  total_score = CASE fit_score
    WHEN 'strong' THEN 71
    WHEN 'moderate' THEN 61
    WHEN 'weak' THEN 46
    ELSE 36
  END,
  ai_confidence = CASE fit_score
    WHEN 'strong' THEN 'high'::text
    WHEN 'moderate' THEN 'medium'::text
    ELSE 'low'::text
  END
WHERE fit_score_value IS NULL;
