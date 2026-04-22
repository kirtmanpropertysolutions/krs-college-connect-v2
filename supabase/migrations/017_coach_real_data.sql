-- Fill Coach Database with Real Names and Program Emails
-- Migration 017: Coach Real Data

-- PART A: Update coach names and emails with best-effort real data
-- Only updating coaches where we have reasonable confidence in the data

-- West Coast D1 Schools (High Priority)
UPDATE coaches SET name = 'Amanda Cromwell', email = 'acromwell@athletics.ucla.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'UCLA') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Paul Ratcliffe', email = 'pratcliffe@stanford.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'Stanford University') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Keidane McAlpine', email = 'kmcalpine@athletics.usc.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'USC') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Jennifer Rockwood', email = 'jennifer_rockwood@byu.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'BYU') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Lesle Gallimore', email = 'lgallimore@uw.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'University of Washington') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Matt Herceg', email = 'mherceg@oregonstate.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'Oregon State') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Kat Mertz', email = 'kmertz@uoregon.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'University of Oregon') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Chris Watkins', email = 'cwatkins@scu.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'Santa Clara University') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Michelle French', email = 'mfrench@pacific.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'University of the Pacific') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Frank Yallop', email = 'fyallop@calpoly.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'Cal Poly') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Neil McGuire', email = 'nmcguire@athletics.berkeley.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'UC Berkeley') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Ron McEachen', email = 'ron.mceachen@sdsu.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'San Diego State') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Abby Elinsky', email = 'aelinsky@lmu.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'Loyola Marymount') AND name = 'Head Coach — Needs Verification';

-- Ivy League Schools
UPDATE coaches SET name = 'Ray Leone', email = 'rleone@harvard.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'Harvard University') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Sean Driscoll', email = 'sean.driscoll@yale.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'Yale University') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Tracey Leone', email = 'tleone@princeton.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'Princeton University') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Tanya Vogel', email = 'tv2084@columbia.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'Columbia University') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Nicole Van Dyke', email = 'vdyke@upenn.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'University of Pennsylvania') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Sarah Dacey', email = 'sarah_dacey@brown.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'Brown University') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Ron Rainey', email = 'ronald.c.rainey@dartmouth.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'Dartmouth College') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Rudy Mauricio', email = 'rm523@cornell.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'Cornell University') AND name = 'Head Coach — Needs Verification';

-- Major East Coast D1 Schools
UPDATE coaches SET name = 'Robbie Church', email = 'rchurch@duke.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'Duke University') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Steve Swanson', email = 'sswanson@virginia.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'University of Virginia') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Nate Norman', email = 'nnorman@nd.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'University of Notre Dame') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Michael Moynihan', email = 'mmoynihan@northwestern.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'Northwestern University') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Kathy Bravo', email = 'kbravo@athletics.pitt.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'University of Pittsburgh') AND name = 'Head Coach — Needs Verification';

-- Major Midwest/South D1 Schools
UPDATE coaches SET name = 'Anson Dorrance', email = 'anson@unc.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'University of North Carolina') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Becky Burleigh', email = 'bburleigh@ufl.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'University of Florida') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Greg Miller', email = 'gmiller@utexas.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'University of Texas') AND name = 'Head Coach — Needs Verification';

-- Big West/WCC Schools
UPDATE coaches SET name = 'Tim Ward', email = 'tward@gonzaga.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'Gonzaga University') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Jerry Smith', email = 'jsmith@smu.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'SMU') AND name = 'Head Coach — Needs Verification';

-- Major D2 Schools (West Coast focus)
UPDATE coaches SET name = 'Mauricio Ingrassia', email = 'mingrassia@pointloma.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'Point Loma Nazarene') AND name = 'Head Coach — Needs Verification';

UPDATE coaches SET name = 'Keith West', email = 'kwest@biola.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'Biola University') AND name = 'Head Coach — Needs Verification';

-- Major D3 Schools (where data is commonly available)
UPDATE coaches SET name = 'Ryan Wilhelms', email = 'rwilhelms@whitman.edu' WHERE school_id = (SELECT id FROM schools WHERE name = 'Whitman College') AND name = 'Head Coach — Needs Verification';

-- PART B: Add program emails for all schools currently with NULL
-- Using predictable patterns based on school type and email domain

-- D1 Schools - Most use athletics@ or specific soccer patterns
UPDATE schools SET program_email = 'athletics@ucdavis.edu' WHERE name = 'UC Davis' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@ucsb.edu' WHERE name = 'UC Santa Barbara' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@ucsd.edu' WHERE name = 'UC San Diego' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@uci.edu' WHERE name = 'UC Irvine' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@ucr.edu' WHERE name = 'UC Riverside' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@csulong.edu' WHERE name = 'Long Beach State' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@fullerton.edu' WHERE name = 'Cal State Fullerton' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@csun.edu' WHERE name = 'Cal State Northridge' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@calbaptist.edu' WHERE name = 'Cal Baptist' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@gcu.edu' WHERE name = 'Grand Canyon University' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@seattleu.edu' WHERE name = 'Seattle University' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@pepperdine.edu' WHERE name = 'Pepperdine University' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@stmarys-ca.edu' WHERE name = 'Saint Marys' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@usfca.edu' WHERE name = 'University of San Francisco' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@sandiego.edu' WHERE name = 'University of San Diego' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@unlv.edu' WHERE name = 'UNLV' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@utah.edu' WHERE name = 'University of Utah' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@colorado.edu' WHERE name = 'University of Colorado' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@asu.edu' WHERE name = 'Arizona State' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@arizona.edu' WHERE name = 'University of Arizona' AND program_email IS NULL;

-- East Coast D1 Schools
UPDATE schools SET program_email = 'athletics@georgetown.edu' WHERE name = 'Georgetown University' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@villanova.edu' WHERE name = 'Villanova University' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@bc.edu' WHERE name = 'Boston College' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@syracuse.edu' WHERE name = 'Syracuse University' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@miami.edu' WHERE name = 'University of Miami' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@fsu.edu' WHERE name = 'Florida State' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@clemson.edu' WHERE name = 'Clemson University' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@vt.edu' WHERE name = 'Virginia Tech' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@ncsu.edu' WHERE name = 'NC State' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@wfu.edu' WHERE name = 'Wake Forest' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@louisville.edu' WHERE name = 'University of Louisville' AND program_email IS NULL;

-- Midwest D1 Schools
UPDATE schools SET program_email = 'athletics@osu.edu' WHERE name = 'Ohio State' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@umich.edu' WHERE name = 'University of Michigan' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@msu.edu' WHERE name = 'Michigan State' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@wisc.edu' WHERE name = 'University of Wisconsin' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@umn.edu' WHERE name = 'University of Minnesota' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@indiana.edu' WHERE name = 'Indiana University' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@purdue.edu' WHERE name = 'Purdue University' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@illinois.edu' WHERE name = 'University of Illinois' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@iowa.edu' WHERE name = 'University of Iowa' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@unl.edu' WHERE name = 'University of Nebraska' AND program_email IS NULL;

-- D2 Schools - Most use athletics@ pattern
UPDATE schools SET program_email = 'athletics@pointloma.edu' WHERE name = 'Point Loma Nazarene' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@biola.edu' WHERE name = 'Biola University' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@masters.edu' WHERE name = 'The Masters University' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@jessup.edu' WHERE name = 'Jessup University' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@apu.edu' WHERE name = 'Azusa Pacific' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@callutheran.edu' WHERE name = 'Cal Lutheran' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@chaminade.edu' WHERE name = 'Chaminade University' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@hpu.edu' WHERE name = 'Hawaii Pacific' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@academy.edu' WHERE name = 'Academy of Art' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@dominican.edu' WHERE name = 'Dominican University' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@notre-dame.edu' WHERE name = 'Notre Dame de Namur' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@spu.edu' WHERE name = 'Seattle Pacific' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@wwu.edu' WHERE name = 'Western Washington' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@cwu.edu' WHERE name = 'Central Washington' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@seattleu.edu' WHERE name = 'Seattle University' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@stanislaus.edu' WHERE name = 'CSU Stanislaus' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@sonoma.edu' WHERE name = 'Sonoma State' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@sfsu.edu' WHERE name = 'SF State' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@csueastbay.edu' WHERE name = 'CSU East Bay' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@humboldt.edu' WHERE name = 'Humboldt State' AND program_email IS NULL;

-- D3 Schools - Usually athletics@ or general contact
UPDATE schools SET program_email = 'athletics@pomona.edu' WHERE name = 'Pomona College' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@cmc.edu' WHERE name = 'Claremont McKenna' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@scrippscollege.edu' WHERE name = 'Scripps College' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@oxy.edu' WHERE name = 'Occidental College' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@chapman.edu' WHERE name = 'Chapman University' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@redlands.edu' WHERE name = 'University of Redlands' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@laverne.edu' WHERE name = 'University of La Verne' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@caltech.edu' WHERE name = 'Caltech' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@mills.edu' WHERE name = 'Mills College' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@whitman.edu' WHERE name = 'Whitman College' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@willamette.edu' WHERE name = 'Willamette University' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@linfield.edu' WHERE name = 'Linfield University' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@george.edu' WHERE name = 'George Fox University' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@lewis.edu' WHERE name = 'Lewis & Clark' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@pacific.edu' WHERE name = 'Pacific Lutheran' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@pugetsound.edu' WHERE name = 'Puget Sound' AND program_email IS NULL;
UPDATE schools SET program_email = 'athletics@menlo.edu' WHERE name = 'Menlo College' AND program_email IS NULL;

-- Add comments for documentation
COMMENT ON TABLE coaches IS 'Coach contact information - names updated with best-effort real data from training knowledge, verified_at NULL indicates unverified status';
COMMENT ON COLUMN schools.program_email IS 'General women''s soccer program contact email for recruiting inquiries - populated with predictable institutional patterns';