-- Seed: Departments, Users, Companies, Contacts

-- 1. DEPARTMENTS
INSERT INTO departments (id, name) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Enterprise'),
  ('a0000000-0000-0000-0000-000000000002', 'Mid-Market'),
  ('a0000000-0000-0000-0000-000000000003', 'Strategic Accounts')
ON CONFLICT (name) DO NOTHING;

-- 2. USERS
INSERT INTO users (id, email, name, role, department_id, active, access_granted_at, access_expires_at, created_at, updated_at) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'sarah.chen@abbe.com',        'Sarah Chen',        'administrator',    NULL, true, NULL, NULL, '2026-09-01T08:00:00Z', '2026-10-10T14:30:00Z'),
  ('b1000000-0000-0000-0000-000000000002', 'michael.rodriguez@abbe.com',  'Michael Rodriguez',  'administrator',    NULL, true, NULL, NULL, '2026-09-01T08:00:00Z', '2026-10-08T11:15:00Z'),
  ('b2000000-0000-0000-0000-000000000001', 'jennifer.park@abbe.com',      'Jennifer Park',      'sales_leader',     'a0000000-0000-0000-0000-000000000001', true, '2026-10-14T06:00:00Z', '2026-10-15T06:00:00Z', '2026-09-01T08:00:00Z', '2026-10-14T06:00:00Z'),
  ('b2000000-0000-0000-0000-000000000002', 'david.thompson@abbe.com',     'David Thompson',     'sales_leader',     'a0000000-0000-0000-0000-000000000002', true, '2026-10-14T06:00:00Z', '2026-10-15T06:00:00Z', '2026-09-01T08:00:00Z', '2026-10-14T06:00:00Z'),
  ('b2000000-0000-0000-0000-000000000003', 'robert.lee@abbe.com',         'Robert Lee',         'sales_leader',     'a0000000-0000-0000-0000-000000000003', true, '2026-10-13T06:00:00Z', '2026-10-14T06:00:00Z', '2026-09-01T08:00:00Z', '2026-10-13T06:00:00Z'),
  ('b3000000-0000-0000-0000-000000000001', 'emma.wilson@abbe.com',        'Emma Wilson',        'account_manager',  'a0000000-0000-0000-0000-000000000001', true, NULL, NULL, '2026-09-02T08:00:00Z', NULL),
  ('b3000000-0000-0000-0000-000000000002', 'james.murphy@abbe.com',       'James Murphy',       'account_manager',  'a0000000-0000-0000-0000-000000000001', true, NULL, NULL, '2026-09-02T08:00:00Z', NULL),
  ('b3000000-0000-0000-0000-000000000003', 'lisa.garcia@abbe.com',        'Lisa Garcia',        'account_manager',  'a0000000-0000-0000-0000-000000000001', true, NULL, NULL, '2026-09-03T08:00:00Z', NULL),
  ('b3000000-0000-0000-0000-000000000004', 'alex.kumar@abbe.com',         'Alex Kumar',         'account_manager',  'a0000000-0000-0000-0000-000000000002', true, NULL, NULL, '2026-09-02T08:00:00Z', NULL),
  ('b3000000-0000-0000-0000-000000000005', 'natalie.ross@abbe.com',       'Natalie Ross',       'account_manager',  'a0000000-0000-0000-0000-000000000002', true, NULL, NULL, '2026-09-03T08:00:00Z', NULL),
  ('b3000000-0000-0000-0000-000000000006', 'thomas.baker@abbe.com',       'Thomas Baker',       'account_manager',  'a0000000-0000-0000-0000-000000000003', true, NULL, NULL, '2026-09-04T08:00:00Z', NULL),
  ('b3000000-0000-0000-0000-000000000007', 'sophie.martin@abbe.com',      'Sophie Martin',      'account_manager',  'a0000000-0000-0000-0000-000000000003', true, NULL, NULL, '2026-09-04T08:00:00Z', NULL)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, department_id = EXCLUDED.department_id,
  active = EXCLUDED.active, access_granted_at = EXCLUDED.access_granted_at, access_expires_at = EXCLUDED.access_expires_at;

-- 3. COMPANIES
INSERT INTO companies (id, company_name, industry, location, domain, created_at, updated_at) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Nexford Dynamics',        'Manufacturing & Robotics',     'Detroit, MI',        'nexford-dynamics.com',  '2026-10-01T09:00:00Z', '2026-10-10T14:00:00Z'),
  ('c1000000-0000-0000-0000-000000000002', 'Brightwell Energy',       'Renewable Energy',             'Austin, TX',         'brightwell-energy.com', '2026-10-02T09:00:00Z', '2026-10-11T10:00:00Z'),
  ('c1000000-0000-0000-0000-000000000003', 'Meridian Health Systems',  'Healthcare Technology',        'Boston, MA',         'meridianhealth.io',     '2026-10-03T09:00:00Z', '2026-10-09T16:00:00Z'),
  ('c1000000-0000-0000-0000-000000000004', 'Vantix Logistics',        'Supply Chain & Logistics',     'Chicago, IL',        'vantix-logistics.com',  '2026-10-04T09:00:00Z', '2026-10-12T08:00:00Z'),
  ('c1000000-0000-0000-0000-000000000005', 'Corvus Aerospace',         'Aerospace & Defense',          'Seattle, WA',        'corvus-aero.com',       '2026-10-05T09:00:00Z', '2026-10-08T11:00:00Z'),
  ('c1000000-0000-0000-0000-000000000006', 'Halcyon Financial Group',  'Financial Services',           'New York, NY',       'halcyon-fin.com',       '2026-10-06T09:00:00Z', '2026-10-12T15:00:00Z'),
  ('c1000000-0000-0000-0000-000000000007', 'Pinnacle Retail Corp',     'Retail & E-Commerce',          'San Francisco, CA',  'pinnacleretail.com',    '2026-10-07T09:00:00Z', '2026-10-13T09:00:00Z'),
  ('c1000000-0000-0000-0000-000000000008', 'Terranova Biotech',        'Biotechnology',                'San Diego, CA',      'terranova-bio.com',     '2026-10-08T09:00:00Z', '2026-10-11T12:00:00Z'),
  ('c1000000-0000-0000-0000-000000000009', 'Quantum Edge Computing',   'Technology & Cloud',           'Denver, CO',         'quantumedge.io',        '2026-10-09T09:00:00Z', '2026-10-14T10:00:00Z'),
  ('c1000000-0000-0000-0000-000000000010', 'Stellarcomm Networks',     'Telecommunications',           'Dallas, TX',         'stellarcomm.net',       '2026-10-10T09:00:00Z', '2026-10-14T14:00:00Z'),
  ('c1000000-0000-0000-0000-000000000011', 'Apex Construction Group',  'Construction & Infrastructure','Phoenix, AZ',        'apex-construction.com', '2026-10-11T09:00:00Z', NULL),
  ('c1000000-0000-0000-0000-000000000012', 'Velora Motors',            'Automotive',                   'Nashville, TN',      'veloramotors.com',      '2026-10-12T09:00:00Z', NULL)
ON CONFLICT (id) DO NOTHING;

-- 4. CONTACTS
INSERT INTO contacts (id, company_id, name, email, phone, linkedin_url, created_at) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Karen Iverson',     'k.iverson@nexford-dynamics.com',  '+1-313-555-0142', 'linkedin.com/in/kareniverson', '2026-10-01T10:00:00Z'),
  ('d1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'Mark Sullivan',     'm.sullivan@brightwell-energy.com','+1-512-555-0287', 'linkedin.com/in/marksullivan', '2026-10-02T10:00:00Z'),
  ('d1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 'Dr. Amara Okafor',  'a.okafor@meridianhealth.io',      '+1-617-555-0391', 'linkedin.com/in/amaraokafor',  '2026-10-03T10:00:00Z'),
  ('d1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000004', 'Peter Novak',       'p.novak@vantix-logistics.com',    '+1-312-555-0452', 'linkedin.com/in/peternovak',   '2026-10-04T10:00:00Z'),
  ('d1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000005', 'Rachel Stern',      'r.stern@corvus-aero.com',         '+1-206-555-0567', 'linkedin.com/in/rachelstern',  '2026-10-05T10:00:00Z'),
  ('d1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000006', 'Daniel Friedman',   'd.friedman@halcyon-fin.com',      '+1-212-555-0678', 'linkedin.com/in/danfriedman',  '2026-10-06T10:00:00Z'),
  ('d1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000007', 'Tara Williams',     't.williams@pinnacleretail.com',   '+1-415-555-0789', 'linkedin.com/in/tarawilliams', '2026-10-07T10:00:00Z'),
  ('d1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000008', 'Dr. Jian Chen',     'j.chen@terranova-bio.com',        '+1-858-555-0823', 'linkedin.com/in/jianchen',     '2026-10-08T10:00:00Z'),
  ('d1000000-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000009', 'Olivia Hayes',      'o.hayes@quantumedge.io',          '+1-303-555-0934', 'linkedin.com/in/oliviahayes',  '2026-10-09T10:00:00Z'),
  ('d1000000-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000010', 'Marcus Webb',       'm.webb@stellarcomm.net',          '+1-214-555-0145', NULL,                            '2026-10-10T10:00:00Z'),
  ('d1000000-0000-0000-0000-000000000011', 'c1000000-0000-0000-0000-000000000011', 'Frank Delgado',     'f.delgado@apex-construction.com', '+1-602-555-0156', NULL,                            '2026-10-11T10:00:00Z'),
  ('d1000000-0000-0000-0000-000000000012', 'c1000000-0000-0000-0000-000000000012', 'Janet Kowalski',    'j.kowalski@veloramotors.com',     NULL,              NULL,                            '2026-10-12T10:00:00Z')
ON CONFLICT (id) DO NOTHING;