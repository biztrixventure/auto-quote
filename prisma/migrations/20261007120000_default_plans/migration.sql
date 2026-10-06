-- Starter price cards for the car insurance results page, added only when no partners exist yet.
-- Generic plan names (no carrier brands); edit, rename or turn them off in Admin -> Partners.
INSERT INTO "Partner" ("id", "updatedAt", "name", "active", "sortOrder", "tagline", "priceFactor", "states", "coverageLevels", "minAge", "maxAccidents", "maxViolations", "acceptsUninsured")
SELECT v.* FROM (VALUES
  ('plan_preferred', CURRENT_TIMESTAMP, 'Preferred Plan', true, 1, 'Lower price for drivers with a clean record', 0.88::double precision, '', 'state_minimum,standard,premium', 25, 0, 1, false),
  ('plan_standard',  CURRENT_TIMESTAMP, 'Standard Plan',  true, 2, 'A fit for most drivers',                       1.0::double precision,  '', 'state_minimum,standard,premium', NULL::integer, 1, 2, true),
  ('plan_flex',      CURRENT_TIMESTAMP, 'Flex Plan',      true, 3, 'Accepts accidents, tickets or a gap in coverage', 1.18::double precision, '', 'state_minimum,standard,premium', NULL::integer, NULL::integer, NULL::integer, true)
) AS v("id", "updatedAt", "name", "active", "sortOrder", "tagline", "priceFactor", "states", "coverageLevels", "minAge", "maxAccidents", "maxViolations", "acceptsUninsured")
WHERE NOT EXISTS (SELECT 1 FROM "Partner");
