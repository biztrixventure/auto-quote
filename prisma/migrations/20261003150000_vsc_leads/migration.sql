-- Vehicle service contract leads: insurance-only fields get defaults, vehicles record mileage.
ALTER TABLE "Lead" ALTER COLUMN "currentlyInsured" SET DEFAULT false;
ALTER TABLE "Lead" ALTER COLUMN "coverageLevel" SET DEFAULT '';
ALTER TABLE "Vehicle" ADD COLUMN "mileage" INTEGER;
