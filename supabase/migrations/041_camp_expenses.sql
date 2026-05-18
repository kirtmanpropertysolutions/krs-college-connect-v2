-- 041_camp_expenses.sql
-- Budget Builder columns on scheduled_camps. The athletes' camp-fee
-- ($475 Stanford ID Camp) is in the existing `cost` column; the five
-- new columns let athletes break out travel/lodging/food/gear/misc.
ALTER TABLE scheduled_camps
  ADD COLUMN IF NOT EXISTS travel_cost  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lodging_cost integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS food_cost    integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gear_cost    integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS misc_cost    integer DEFAULT 0;
