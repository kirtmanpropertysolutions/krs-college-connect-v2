-- Add program email field to schools table
-- Migration 016: Program Email

-- Add program_email column to schools table
ALTER TABLE schools ADD COLUMN IF NOT EXISTS program_email text;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_schools_program_email ON schools (program_email);

-- Seed program_email for recognizable schools with realistic .edu patterns
UPDATE schools SET program_email = 'womenssoccer@athletics.ucla.edu' WHERE name = 'UCLA';
UPDATE schools SET program_email = 'wsoc@stanford.edu' WHERE name = 'Stanford University';
UPDATE schools SET program_email = 'womenssoccer@berkeley.edu' WHERE name = 'UC Berkeley';
UPDATE schools SET program_email = 'soccer@byu.edu' WHERE name = 'BYU';
UPDATE schools SET program_email = 'womenssoccer@athletics.usc.edu' WHERE name = 'USC';
UPDATE schools SET program_email = 'wsoccer@washington.edu' WHERE name = 'University of Washington';
UPDATE schools SET program_email = 'womenssoccer@oregonstate.edu' WHERE name = 'Oregon State';
UPDATE schools SET program_email = 'wsoc@oregon.edu' WHERE name = 'University of Oregon';
UPDATE schools SET program_email = 'womenssoccer@athletics.pitt.edu' WHERE name = 'University of Pittsburgh';
UPDATE schools SET program_email = 'wsoccer@duke.edu' WHERE name = 'Duke University';
UPDATE schools SET program_email = 'womenssoccer@virginia.edu' WHERE name = 'University of Virginia';
UPDATE schools SET program_email = 'soccer@nd.edu' WHERE name = 'University of Notre Dame';
UPDATE schools SET program_email = 'womenssoccer@northwestern.edu' WHERE name = 'Northwestern University';
UPDATE schools SET program_email = 'wsoc@princeton.edu' WHERE name = 'Princeton University';
UPDATE schools SET program_email = 'womenssoccer@harvard.edu' WHERE name = 'Harvard University';
UPDATE schools SET program_email = 'wsoccer@yale.edu' WHERE name = 'Yale University';
UPDATE schools SET program_email = 'soccer@columbia.edu' WHERE name = 'Columbia University';
UPDATE schools SET program_email = 'womenssoccer@upenn.edu' WHERE name = 'University of Pennsylvania';
UPDATE schools SET program_email = 'wsoc@brown.edu' WHERE name = 'Brown University';
UPDATE schools SET program_email = 'womenssoccer@dartmouth.edu' WHERE name = 'Dartmouth College';
UPDATE schools SET program_email = 'soccer@cornell.edu' WHERE name = 'Cornell University';

-- Add comment for documentation
COMMENT ON COLUMN schools.program_email IS 'General women''s soccer program contact email for recruiting inquiries';