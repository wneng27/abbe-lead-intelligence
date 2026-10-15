-- Seed: Sources, Source Registry, Signals

-- 5. SOURCES
INSERT INTO sources (id, source_name, source_type, source_url, created_at) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'Crunchbase',               'Database',   'crunchbase.com',     '2026-10-01T09:00:00Z'),
  ('e1000000-0000-0000-0000-000000000002', 'LinkedIn Sales Navigator',  'Social',     'linkedin.com/sales', '2026-10-01T09:00:00Z'),
  ('e1000000-0000-0000-0000-000000000003', 'Google News',              'News Feed',  'news.google.com',    '2026-10-01T09:00:00Z'),
  ('e1000000-0000-0000-0000-000000000004', 'SEC Filings (EDGAR)',      'Regulatory', 'sec.gov/edgar',      '2026-10-01T09:00:00Z'),
  ('e1000000-0000-0000-0000-000000000005', 'Industry Week',            'Trade Press','industryweek.com',   '2026-10-01T09:00:00Z'),
  ('e1000000-0000-0000-0000-000000000006', 'TechCrunch',               'News Feed',  'techcrunch.com',     '2026-10-01T09:00:00Z'),
  ('e1000000-0000-0000-0000-000000000007', 'Gartner Reports',          'Analyst',    'gartner.com',        '2026-10-01T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- 6. SOURCE REGISTRY
INSERT INTO source_registry (id, source_name, source_type, description, created_at, updated_at) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'Crunchbase API',           'API Integration', 'Automated company data enrichment via Crunchbase API', '2026-09-15T08:00:00Z', '2026-10-01T09:00:00Z'),
  ('f1000000-0000-0000-0000-000000000002', 'LinkedIn Sales Navigator', 'Social',          'Decision-maker identification and contact discovery',  '2026-09-15T08:00:00Z', '2026-10-01T09:00:00Z'),
  ('f1000000-0000-0000-0000-000000000003', 'n8n News Monitor',         'Automation',      'Automated news monitoring via n8n workflows',          '2026-09-15T08:00:00Z', '2026-10-01T09:00:00Z'),
  ('f1000000-0000-0000-0000-000000000004', 'SEC EDGAR Feed',           'Regulatory',      'Automated SEC filing monitoring for funding and M&A',  '2026-09-15T08:00:00Z', '2026-10-01T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- 7. SIGNALS
INSERT INTO signals (id, company_id, signal_type, signal_description, signal_date, confidence, created_at) VALUES
  ('1000000a-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Funding Round',         'Series C funding of $45M closed, led by Accel Partners',                      '2026-10-01', 'high',   '2026-10-01T11:00:00Z'),
  ('1000000a-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'Leadership Change',     'New VP of Operations hired from Tesla Gigafactory',                           '2026-09-28', 'medium', '2026-10-01T11:00:00Z'),
  ('1000000a-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'Product Launch',        'Announced new automated assembly line product for Q1 2027',                   '2026-10-05', 'medium', '2026-10-05T12:00:00Z'),
  ('1000000a-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000002', 'Government Contract',   'Awarded $120M DOE grant for grid-scale battery storage project',             '2026-10-02', 'high',   '2026-10-02T11:00:00Z'),
  ('1000000a-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000002', 'Expansion',             'Opening new manufacturing facility in Phoenix, AZ',                           '2026-09-30', 'medium', '2026-10-02T11:00:00Z'),
  ('1000000a-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000003', 'Acquisition',           'Acquired MedAI Systems for $85M to expand AI diagnostics capabilities',       '2026-10-03', 'high',   '2026-10-03T11:00:00Z'),
  ('1000000a-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000003', 'Regulatory Approval',   'Received FDA 510(k) clearance for new patient monitoring platform',           '2026-10-07', 'high',   '2026-10-07T12:00:00Z'),
  ('1000000a-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000004', 'Technology Investment', 'Published RFP for warehouse automation system, budget $8M',                   '2026-10-04', 'high',   '2026-10-04T11:00:00Z'),
  ('1000000a-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000004', 'Hiring Surge',          'Posted 12 open positions for robotics engineers and system integrators',      '2026-10-01', 'low',    '2026-10-04T11:00:00Z'),
  ('1000000a-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000005', 'Contract Win',          'Won $200M DoD contract for next-gen drone components',                        '2026-10-05', 'high',   '2026-10-05T11:00:00Z'),
  ('1000000a-0000-0000-0000-000000000011', 'c1000000-0000-0000-0000-000000000005', 'Expansion',             'Building new 80,000 sq ft production facility in Everett, WA',                '2026-09-25', 'medium', '2026-10-05T11:00:00Z'),
  ('1000000a-0000-0000-0000-000000000012', 'c1000000-0000-0000-0000-000000000006', 'Compliance Initiative', 'Announced digital transformation initiative to modernize compliance systems', '2026-10-06', 'medium', '2026-10-06T11:00:00Z'),
  ('1000000a-0000-0000-0000-000000000013', 'c1000000-0000-0000-0000-000000000007', 'E-Commerce Pivot',      'Launched new D2C platform, exiting 40% of physical retail locations',         '2026-10-07', 'high',   '2026-10-07T11:00:00Z'),
  ('1000000a-0000-0000-0000-000000000014', 'c1000000-0000-0000-0000-000000000007', 'Revenue Growth',        'Q3 revenue up 34% YoY driven by online channel expansion',                    '2026-10-09', 'medium', '2026-10-09T11:00:00Z'),
  ('1000000a-0000-0000-0000-000000000015', 'c1000000-0000-0000-0000-000000000008', 'Clinical Trial',        'Phase III clinical trial for oncology drug showing positive interim results', '2026-10-08', 'high',   '2026-10-08T11:00:00Z'),
  ('1000000a-0000-0000-0000-000000000016', 'c1000000-0000-0000-0000-000000000009', 'Product Launch',        'Released new edge AI processor with 3x performance improvement',             '2026-10-09', 'medium', '2026-10-09T11:00:00Z'),
  ('1000000a-0000-0000-0000-000000000017', 'c1000000-0000-0000-0000-000000000009', 'Partnership',           'Strategic partnership announced with AWS for edge computing services',        '2026-10-12', 'medium', '2026-10-12T11:00:00Z'),
  ('1000000a-0000-0000-0000-000000000018', 'c1000000-0000-0000-0000-000000000010', 'Infrastructure Project','5G network expansion across 14 states, $300M infrastructure investment',       '2026-10-10', 'high',   '2026-10-10T11:00:00Z'),
  ('1000000a-0000-0000-0000-000000000019', 'c1000000-0000-0000-0000-000000000010', 'Leadership Change',     'New CTO appointed from Cisco, signaling technology modernization push',       '2026-10-08', 'low',    '2026-10-10T11:00:00Z'),
  ('1000000a-0000-0000-0000-000000000020', 'c1000000-0000-0000-0000-000000000011', 'Project Win',           'Awarded $95M municipal infrastructure contract for highway expansion',        '2026-10-11', 'medium', '2026-10-11T11:00:00Z'),
  ('1000000a-0000-0000-0000-000000000021', 'c1000000-0000-0000-0000-000000000012', 'Plant Investment',      'Breaking ground on new EV battery assembly plant, $180M investment',          '2026-10-12', 'medium', '2026-10-12T11:00:00Z')
ON CONFLICT (id) DO NOTHING;