-- Seed: Reviews, CRM Nominations, Existing Accounts, System Settings

-- 11. REVIEWS
INSERT INTO reviews (id, opportunity_id, reviewer_id, review_status, disposition, comments, reviewed_at, created_at) VALUES
  ('a3000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000005', 'b3000000-0000-0000-0000-000000000001', 'in_progress', NULL,              'Strong fit with ABBE manufacturing capabilities. DoD contract provides clear budget and timeline. Proceeding with full assessment.', NULL,                       '2026-10-06T10:00:00Z'),
  ('a3000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000007', 'b3000000-0000-0000-0000-000000000003', 'in_progress', NULL,              'D2C pivot creates immediate need for supply chain optimization. Reviewing fit with ABBE logistics platform.', NULL,                       '2026-10-08T10:00:00Z'),
  ('a3000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000006', 'b3000000-0000-0000-0000-000000000004', 'approved',    'nominate',        'Digital transformation initiative aligns well with ABBE compliance solutions. Recommend nomination to CRM.', '2026-10-12T15:00:00Z', '2026-10-07T10:00:00Z'),
  ('a3000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000003', 'b3000000-0000-0000-0000-000000000005', 'approved',    'nominate',        'Acquisition of MedAI plus FDA clearance creates strong engagement window. AI diagnostics aligns with ABBE healthcare practice.', '2026-10-09T16:00:00Z', '2026-10-04T10:00:00Z'),
  ('a3000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000004', 'b3000000-0000-0000-0000-000000000004', 'approved',    'nominate',        'RFP for warehouse automation with defined $8M budget is a direct match for ABBE robotics solutions. High confidence.', '2026-10-12T08:00:00Z', '2026-10-05T10:00:00Z'),
  ('a3000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'approved',    'nominate',        'Series C funding, new product line, and VP hire from Tesla all signal strong growth and automation investment. Excellent fit.', '2026-10-10T14:00:00Z', '2026-10-02T10:00:00Z'),
  ('a3000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000002', 'b3000000-0000-0000-0000-000000000004', 'approved',    'nominate',        'DOE grant and facility expansion create clear budget for automation and energy management systems. Strong timing signal.', '2026-10-11T10:00:00Z', '2026-10-03T10:00:00Z'),
  ('a3000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000013', 'b3000000-0000-0000-0000-000000000001', 'returned',    'needs_more_info',  'DoD contract is strong signal but need more detail on specific automation requirements and decision timeline before nominating.', '2026-10-13T09:00:00Z', '2026-10-11T10:00:00Z'),
  ('a3000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000014', 'b3000000-0000-0000-0000-000000000003', 'rejected',    'not_nominatable',  'D2C pivot is interesting but company already has an existing automation vendor. No clear budget for ABBE solutions at this time.', '2026-10-13T14:00:00Z', '2026-10-09T10:00:00Z'),
  ('a3000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000015', 'b3000000-0000-0000-0000-000000000004', 'pending',     NULL,              'Digital transformation announced but no timeline or budget yet. Deferring until more concrete signals emerge.', NULL, '2026-10-08T10:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- 13. CRM NOMINATIONS
INSERT INTO crm_nominations (id, opportunity_id, nominated_by, status, comments, created_at) VALUES
  ('a5000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'nominated', 'Strong fit: Series C funding, new product line, VP hire from Tesla. All signals point to automation investment. Recommend immediate outreach to Karen Iverson.', '2026-10-10T14:00:00Z'),
  ('a5000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'nominated', 'DOE grant of $120M creates clear budget for energy management systems. Facility expansion in Phoenix adds urgency. Mark Sullivan is confirmed decision-maker.', '2026-10-11T10:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- 14. EXISTING ACCOUNTS
INSERT INTO existing_accounts (id, company_name, created_at) VALUES
  ('a6000000-0000-0000-0000-000000000001', 'Global Foundries',      '2026-09-01T08:00:00Z'),
  ('a6000000-0000-0000-0000-000000000002', 'Siemens Energy',        '2026-09-01T08:00:00Z'),
  ('a6000000-0000-0000-0000-000000000003', 'UnitedHealth Group',    '2026-09-01T08:00:00Z'),
  ('a6000000-0000-0000-0000-000000000004', 'FedEx Corporation',     '2026-09-01T08:00:00Z'),
  ('a6000000-0000-0000-0000-000000000005', 'Lockheed Martin',       '2026-09-01T08:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- 15. SYSTEM SETTINGS (add more beyond the existing one)
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('n8n_webhook_url',              'https://n8n.abbe.com/webhook/lead-intel', 'URL for n8n workflow webhook that delivers new company/signal data'),
  ('notification_email',           'intel-team@abbe.com',                     'Email address for system-wide intelligence notifications'),
  ('max_opportunities_per_dept',   '50',                                       'Maximum number of active opportunities per department before auto-archival')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;