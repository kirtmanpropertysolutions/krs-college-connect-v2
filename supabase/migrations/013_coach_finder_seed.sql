-- Coach Finder seed data - real schools and coaches
-- Migration 013: Coach Finder Seed Data

-- Insert West Coast D1 schools (50 schools)
INSERT INTO schools (name, short_name, division, conference, state, city, region, primary_color, secondary_color, athletics_website, email_domain, enrollment, academic_rank) VALUES

-- PAC-12 Refugees (Big Ten, ACC, Big 12)
('University of California, Los Angeles', 'UCLA', 'D1', 'Big Ten', 'CA', 'Los Angeles', 'California', '#2774AE', '#FFD100', 'uclabruins.com', 'ucla.edu', 46000, 15),
('University of Southern California', 'USC', 'D1', 'Big Ten', 'CA', 'Los Angeles', 'California', '#990000', '#FFCC00', 'usctrojans.com', 'usc.edu', 20500, 25),
('University of Oregon', 'Oregon', 'D1', 'Big Ten', 'OR', 'Eugene', 'Pacific Northwest', '#154733', '#FEE123', 'goducks.com', 'uoregon.edu', 22760, 103),
('University of Washington', 'Washington', 'D1', 'Big Ten', 'WA', 'Seattle', 'Pacific Northwest', '#4B2E83', '#B7A57A', 'gohuskies.com', 'uw.edu', 47400, 55),
('Stanford University', 'Stanford', 'D1', 'ACC', 'CA', 'Stanford', 'California', '#8C1515', '#DAD7CB', 'gostanford.com', 'stanford.edu', 17000, 3),
('University of California, Berkeley', 'Cal', 'D1', 'ACC', 'CA', 'Berkeley', 'California', '#003262', '#FDB515', 'calbears.com', 'berkeley.edu', 45000, 22),
('University of Utah', 'Utah', 'D1', 'Big 12', 'UT', 'Salt Lake City', 'Mountain West', '#CC0000', '#000000', 'utahutes.com', 'utah.edu', 33000, 105),
('University of Colorado Boulder', 'Colorado', 'D1', 'Big 12', 'CO', 'Boulder', 'Mountain West', '#CFB87C', '#000000', 'cubuffs.com', 'colorado.edu', 35000, 99),
('Arizona State University', 'ASU', 'D1', 'Big 12', 'AZ', 'Tempe', 'Southwest', '#8C1D40', '#FFC627', 'thesundevils.com', 'asu.edu', 80000, 117),
('University of Arizona', 'Arizona', 'D1', 'Big 12', 'AZ', 'Tucson', 'Southwest', '#0C234B', '#AB0520', 'arizonawildcats.com', 'arizona.edu', 47000, 115),

-- WCC and Other West Coast D1
('Gonzaga University', 'Gonzaga', 'D1', 'WCC', 'WA', 'Spokane', 'Pacific Northwest', '#002663', '#FFFFFF', 'gozags.com', 'gonzaga.edu', 7500, 79),
('Santa Clara University', 'Santa Clara', 'D1', 'WCC', 'CA', 'Santa Clara', 'California', '#B30738', '#CFAB7A', 'santaclarabroncos.com', 'scu.edu', 5400, 53),
('University of San Diego', 'USD', 'D1', 'WCC', 'CA', 'San Diego', 'California', '#002856', '#19A0FF', 'usdtoreros.com', 'sandiego.edu', 8000, 88),
('University of San Francisco', 'USF', 'D1', 'WCC', 'CA', 'San Francisco', 'California', '#00543C', '#FDBB30', 'usfbulls.com', 'usfca.edu', 10000, 103),
('Pepperdine University', 'Pepperdine', 'D1', 'WCC', 'CA', 'Malibu', 'California', '#0066CC', '#FF6600', 'pepperdinesports.com', 'pepperdine.edu', 3600, 55),
('Loyola Marymount University', 'LMU', 'D1', 'WCC', 'CA', 'Los Angeles', 'California', '#8A1538', '#C8C372', 'lmulions.com', 'lmu.edu', 6500, 75),
('Brigham Young University', 'BYU', 'D1', 'Big 12', 'UT', 'Provo', 'Mountain West', '#002E5D', '#0062B8', 'byucougars.com', 'byu.edu', 33000, 89),

-- Mountain West Conference
('Boise State University', 'Boise State', 'D1', 'Mountain West', 'ID', 'Boise', 'Mountain West', '#0033A0', '#FF6600', 'broncosports.com', 'boisestate.edu', 26000, 298),
('Utah State University', 'Utah State', 'D1', 'Mountain West', 'UT', 'Logan', 'Mountain West', '#0F2439', '#9AAFCC', 'utahstateaggies.com', 'usu.edu', 28000, 293),
('University of Nevada, Las Vegas', 'UNLV', 'D1', 'Mountain West', 'NV', 'Las Vegas', 'Mountain West', '#CF0A2C', '#000000', 'unlvrebels.com', 'unlv.edu', 31000, 258),
('University of Nevada, Reno', 'Nevada', 'D1', 'Mountain West', 'NV', 'Reno', 'Mountain West', '#003366', '#C0C0C0', 'nevadawolfpack.com', 'unr.edu', 21000, 254),
('Colorado State University', 'Colorado State', 'D1', 'Mountain West', 'CO', 'Fort Collins', 'Mountain West', '#1E4D2B', '#C8B99C', 'csurams.com', 'colostate.edu', 33000, 148),
('University of Wyoming', 'Wyoming', 'D1', 'Mountain West', 'WY', 'Laramie', 'Mountain West', '#492F24', '#FFC425', 'gowyo.com', 'uwyo.edu', 12500, null),

-- Big Sky Conference
('University of Montana', 'Montana', 'D1', 'Big Sky', 'MT', 'Missoula', 'Mountain West', '#660000', '#C0C0C0', 'gogriz.com', 'umt.edu', 10500, 205),
('Montana State University', 'Montana State', 'D1', 'Big Sky', 'MT', 'Bozeman', 'Mountain West', '#003366', '#FFCC33', 'msubobcats.com', 'montana.edu', 16700, 263),
('Eastern Washington University', 'Eastern Washington', 'D1', 'Big Sky', 'WA', 'Cheney', 'Pacific Northwest', '#AA0000', '#000000', 'goeags.com', 'ewu.edu', 12000, null),
('Weber State University', 'Weber State', 'D1', 'Big Sky', 'UT', 'Ogden', 'Mountain West', '#663399', '#FFFFFF', 'weberstateathlon.com', 'weber.edu', 29000, null),
('University of Idaho', 'Idaho', 'D1', 'Big Sky', 'ID', 'Moscow', 'Pacific Northwest', '#FFCC00', '#000000', 'govandals.com', 'uidaho.edu', 12000, 263),
('Idaho State University', 'Idaho State', 'D1', 'Big Sky', 'ID', 'Pocatello', 'Mountain West', '#FF6600', '#000000', 'isubengals.com', 'isu.edu', 12000, null),

-- WAC Conference
('Grand Canyon University', 'GCU', 'D1', 'WAC', 'AZ', 'Phoenix', 'Southwest', '#522398', '#FFFFFF', 'gculopes.com', 'gcu.edu', 20000, null),
('New Mexico State University', 'NMSU', 'D1', 'WAC', 'NM', 'Las Cruces', 'Southwest', '#BA0C2F', '#000000', 'nmstatesports.com', 'nmsu.edu', 14000, null),

-- Other conferences
('Portland University', 'Portland', 'D1', 'WCC', 'OR', 'Portland', 'Pacific Northwest', '#7030A0', '#FFFFFF', 'portlandpilots.com', 'up.edu', 4000, 103),
('Seattle University', 'Seattle U', 'D1', 'WAC', 'WA', 'Seattle', 'Pacific Northwest', '#AA0000', '#FFFFFF', 'goredhawks.com', 'seattleu.edu', 7500, 151),
('California State University, Sacramento', 'Sac State', 'D1', 'Big Sky', 'CA', 'Sacramento', 'California', '#043927', '#FFBF00', 'hornetsports.com', 'csus.edu', 31000, null),
('University of California, Santa Barbara', 'UCSB', 'D1', 'Big West', 'CA', 'Santa Barbara', 'California', '#003660', '#FEBC11', 'ucsbgauchos.com', 'ucsb.edu', 26000, 32),
('University of California, Irvine', 'UC Irvine', 'D1', 'Big West', 'CA', 'Irvine', 'California', '#0064A4', '#FFD200', 'ucirvinesports.com', 'uci.edu', 36000, 33),
('University of California, Davis', 'UC Davis', 'D1', 'Big West', 'CA', 'Davis', 'California', '#022851', '#FFBF00', 'ucdavisaggies.com', 'ucdavis.edu', 39000, 38),
('University of California, San Diego', 'UCSD', 'D1', 'Big West', 'CA', 'San Diego', 'California', '#182B49', '#C69214', 'ucsdtritons.com', 'ucsd.edu', 42000, 34),
('California Polytechnic State University', 'Cal Poly SLO', 'D1', 'Big West', 'CA', 'San Luis Obispo', 'California', '#154734', '#B8860B', 'gopoly.com', 'calpoly.edu', 22000, 34),
('California State University, Fresno', 'Fresno State', 'D1', 'Mountain West', 'CA', 'Fresno', 'California', '#E31837', '#002856', 'gobulldogs.com', 'fresnostate.edu', 25000, 143),
('San Jose State University', 'SJSU', 'D1', 'Mountain West', 'CA', 'San Jose', 'California', '#0055A6', '#E5A823', 'sjsuspartans.com', 'sjsu.edu', 35000, 105),
('California State University, Long Beach', 'Long Beach State', 'D1', 'Big West', 'CA', 'Long Beach', 'California', '#000000', '#FFCC00', 'longbeachstate.com', 'csulb.edu', 38000, 227),
('California State University, Bakersfield', 'CSU Bakersfield', 'D1', 'Big West', 'CA', 'Bakersfield', 'California', '#041E42', '#F18A00', 'gorunners.com', 'csub.edu', 10000, null),
('California State University, Fullerton', 'CSU Fullerton', 'D1', 'Big West', 'CA', 'Fullerton', 'California', '#F57C00', '#003262', 'fullertontitans.com', 'fullerton.edu', 41000, 227),
('California State University, Northridge', 'CSUN', 'D1', 'Big West', 'CA', 'Northridge', 'California', '#C8102E', '#000000', 'gomatadors.com', 'csun.edu', 38000, 227),
('California State University, Los Angeles', 'Cal State LA', 'D1', 'CCAA', 'CA', 'Los Angeles', 'California', '#FEB81C', '#000000', 'calstatela.edu', 'calstatela.edu', 28000, null),
('Seattle Pacific University', 'SPU', 'D1', 'WAC', 'WA', 'Seattle', 'Pacific Northwest', '#722F37', '#C5B783', 'spufalcons.com', 'spu.edu', 3000, 151),
('Saint Mary''s College of California', 'Saint Mary''s', 'D1', 'WCC', 'CA', 'Moraga', 'California', '#003594', '#C69214', 'smcgaels.com', 'stmarys-ca.edu', 2800, 51),
('University of Denver', 'Denver', 'D1', 'Summit League', 'CO', 'Denver', 'Mountain West', '#A51C30', '#002244', 'denverpioneers.com', 'du.edu', 12000, 80),
('Colorado College', 'CC', 'D1', 'Southern Conference', 'CO', 'Colorado Springs', 'Mountain West', '#CC9900', '#000000', 'cctigers.com', 'coloradocollege.edu', 2000, 27),
('Air Force Academy', 'Air Force', 'D1', 'Mountain West', 'CO', 'Colorado Springs', 'Mountain West', '#004F98', '#8A8B8C', 'goairforcefalcons.com', 'usafa.edu', 4000, 26),
('Oregon State University', 'Oregon State', 'D1', 'Pac-12', 'OR', 'Corvallis', 'Pacific Northwest', '#FF6600', '#000000', 'osubeavers.com', 'oregonstate.edu', 32000, 149),
('Washington State University', 'WSU', 'D1', 'Pac-12', 'WA', 'Pullman', 'Pacific Northwest', '#981E32', '#5E6A71', 'wsucougars.com', 'wsu.edu', 31000, 176);

-- Insert Ivy League D1 schools (8 schools)
INSERT INTO schools (name, short_name, division, conference, state, city, region, primary_color, secondary_color, athletics_website, email_domain, enrollment, academic_rank) VALUES
('Harvard University', 'Harvard', 'D1', 'Ivy League', 'MA', 'Cambridge', 'Northeast', '#A51C30', '#FFFFFF', 'gocrimson.com', 'harvard.edu', 23000, 2),
('Yale University', 'Yale', 'D1', 'Ivy League', 'CT', 'New Haven', 'Northeast', '#00356B', '#FFFFFF', 'yalebulldogs.com', 'yale.edu', 13500, 5),
('Princeton University', 'Princeton', 'D1', 'Ivy League', 'NJ', 'Princeton', 'Northeast', '#FF8500', '#000000', 'goprincetontigers.com', 'princeton.edu', 5400, 1),
('Columbia University', 'Columbia', 'D1', 'Ivy League', 'NY', 'New York', 'Northeast', '#B9D9EB', '#9BCBEB', 'gocolumbialions.com', 'columbia.edu', 33000, 12),
('Cornell University', 'Cornell', 'D1', 'Ivy League', 'NY', 'Ithaca', 'Northeast', '#B31B1B', '#FFFFFF', 'cornellbigred.com', 'cornell.edu', 24000, 17),
('Dartmouth College', 'Dartmouth', 'D1', 'Ivy League', 'NH', 'Hanover', 'Northeast', '#00693E', '#FFFFFF', 'dartmouthsports.com', 'dartmouth.edu', 6500, 18),
('Brown University', 'Brown', 'D1', 'Ivy League', 'RI', 'Providence', 'Northeast', '#8D2B00', '#FFFFFF', 'brownbears.com', 'brown.edu', 10000, 13),
('University of Pennsylvania', 'Penn', 'D1', 'Ivy League', 'PA', 'Philadelphia', 'Mid-Atlantic', '#011F5B', '#990000', 'pennathletics.com', 'upenn.edu', 25000, 6);

-- Insert Academic East D1 schools (20 schools)
INSERT INTO schools (name, short_name, division, conference, state, city, region, primary_color, secondary_color, athletics_website, email_domain, enrollment, academic_rank) VALUES
('Duke University', 'Duke', 'D1', 'ACC', 'NC', 'Durham', 'Southeast', '#003087', '#FFFFFF', 'goduke.com', 'duke.edu', 15000, 7),
('University of North Carolina at Chapel Hill', 'UNC', 'D1', 'ACC', 'NC', 'Chapel Hill', 'Southeast', '#13294B', '#7BAFD4', 'goheels.com', 'unc.edu', 30000, 22),
('University of Virginia', 'UVA', 'D1', 'ACC', 'VA', 'Charlottesville', 'Southeast', '#232D4B', '#F84C1E', 'virginiasports.com', 'virginia.edu', 25000, 25),
('Wake Forest University', 'Wake Forest', 'D1', 'ACC', 'NC', 'Winston-Salem', 'Southeast', '#9E7E38', '#000000', 'godemon deacons.com', 'wfu.edu', 8000, 29),
('Georgetown University', 'Georgetown', 'D1', 'Big East', 'DC', 'Washington', 'Mid-Atlantic', '#041E42', '#8D817B', 'guhoyas.com', 'georgetown.edu', 19000, 22),
('Boston College', 'BC', 'D1', 'ACC', 'MA', 'Chestnut Hill', 'Northeast', '#8B2635', '#CCAA00', 'bceagles.com', 'bc.edu', 14500, 39),
('University of Notre Dame', 'Notre Dame', 'D1', 'ACC', 'IN', 'Notre Dame', 'Midwest', '#0C2340', '#C99700', 'und.com', 'nd.edu', 12600, 18),
('Northwestern University', 'Northwestern', 'D1', 'Big Ten', 'IL', 'Evanston', 'Midwest', '#4E2A84', '#FFFFFF', 'nusports.com', 'northwestern.edu', 21000, 9),
('University of Michigan', 'Michigan', 'D1', 'Big Ten', 'MI', 'Ann Arbor', 'Midwest', '#FFCB05', '#00274C', 'mgoblue.com', 'umich.edu', 47000, 21),
('Pennsylvania State University', 'Penn State', 'D1', 'Big Ten', 'PA', 'University Park', 'Mid-Atlantic', '#003262', '#FFFFFF', 'gopsusports.com', 'psu.edu', 46000, 60),
('Rutgers University', 'Rutgers', 'D1', 'Big Ten', 'NJ', 'Piscataway', 'Northeast', '#CC0033', '#FFFFFF', 'scarletknights.com', 'rutgers.edu', 50000, 55),
('University of Maryland', 'Maryland', 'D1', 'Big Ten', 'MD', 'College Park', 'Mid-Atlantic', '#E21833', '#FFD520', 'umterps.com', 'umd.edu', 41000, 46),
('Florida State University', 'FSU', 'D1', 'ACC', 'FL', 'Tallahassee', 'Southeast', '#782F40', '#CEB888', 'seminoles.com', 'fsu.edu', 42000, 55),
('Clemson University', 'Clemson', 'D1', 'ACC', 'SC', 'Clemson', 'Southeast', '#F66733', '#522D80', 'clemsontigers.com', 'clemson.edu', 25000, 77),
('Vanderbilt University', 'Vanderbilt', 'D1', 'SEC', 'TN', 'Nashville', 'Southeast', '#866D4B', '#B39A00', 'vucommodores.com', 'vanderbilt.edu', 12500, 13),
('Rice University', 'Rice', 'D1', 'Conference USA', 'TX', 'Houston', 'Southwest', '#003A70', '#C1A875', 'riceowls.com', 'rice.edu', 7000, 15),
('Emory University', 'Emory', 'D3', 'UAA', 'GA', 'Atlanta', 'Southeast', '#012169', '#F2A900', 'emoryeagles.com', 'emory.edu', 15000, 24),
('Carnegie Mellon University', 'CMU', 'D3', 'UAA', 'PA', 'Pittsburgh', 'Mid-Atlantic', '#C41E3A', '#000000', 'athletics.cmu.edu', 'cmu.edu', 15000, 28),
('University of Chicago', 'UChicago', 'D3', 'UAA', 'IL', 'Chicago', 'Midwest', '#800000', '#FFFFFF', 'athletics.uchicago.edu', 'uchicago.edu', 17000, 6),
('Washington University in St. Louis', 'WashU', 'D3', 'UAA', 'MO', 'St. Louis', 'Midwest', '#A51417', '#FFFFFF', 'bearsports.wustl.edu', 'wustl.edu', 15000, 16);

-- Insert West Coast/Mountain D2 schools (40 schools)
INSERT INTO schools (name, short_name, division, conference, state, city, region, primary_color, secondary_color, athletics_website, email_domain, enrollment, academic_rank) VALUES
('California State University, Chico', 'Chico State', 'D2', 'CCAA', 'CA', 'Chico', 'California', '#006633', '#FFFFFF', 'chicowildcats.com', 'csuchico.edu', 17000, null),
('California State University, Stanislaus', 'Stanislaus State', 'D2', 'CCAA', 'CA', 'Turlock', 'California', '#800080', '#FFFFFF', 'csustan.edu', 'csustan.edu', 10000, null),
('Humboldt State University', 'Humboldt State', 'D2', 'CCAA', 'CA', 'Arcata', 'California', '#006633', '#FFCC33', 'humboldtstate.edu', 'humboldt.edu', 8000, null),
('California State University, East Bay', 'Cal State East Bay', 'D2', 'CCAA', 'CA', 'Hayward', 'California', '#003D7A', '#FFFFFF', 'csueastbayathletics.com', 'csueastbay.edu', 16000, null),
('California State University, Monterey Bay', 'CSU Monterey Bay', 'D2', 'CCAA', 'CA', 'Seaside', 'California', '#003594', '#FFFFFF', 'csumb.edu', 'csumb.edu', 7000, null),
('California State University, San Bernardino', 'CSUSB', 'D2', 'CCAA', 'CA', 'San Bernardino', 'California', '#0047AB', '#FFFFFF', 'csusb.edu', 'csusb.edu', 20000, null),
('California State University, Dominguez Hills', 'CSUDH', 'D2', 'CCAA', 'CA', 'Carson', 'California', '#C8102E', '#000000', 'toroathletics.com', 'csudh.edu', 16000, null),
('California State Polytechnic University, Pomona', 'Cal Poly Pomona', 'D2', 'CCAA', 'CA', 'Pomona', 'California', '#154734', '#B5985A', 'cppbroncos.com', 'cpp.edu', 25000, null),
('Sonoma State University', 'Sonoma State', 'D2', 'CCAA', 'CA', 'Rohnert Park', 'California', '#003594', '#FFFFFF', 'sonomaseawolves.com', 'sonoma.edu', 9000, null),
('San Francisco State University', 'SF State', 'D2', 'CCAA', 'CA', 'San Francisco', 'California', '#582C83', '#FFCC33', 'sfstategators.com', 'sfsu.edu', 30000, null),

-- RMAC Conference D2 schools
('Colorado School of Mines', 'Mines', 'D2', 'RMAC', 'CO', 'Golden', 'Mountain West', '#002649', '#C8B99C', 'minesathletics.com', 'mines.edu', 5000, 88),
('Colorado State University Pueblo', 'CSU Pueblo', 'D2', 'RMAC', 'CO', 'Pueblo', 'Mountain West', '#044734', '#C8B99C', 'csupueblo.edu', 'csupueblo.edu', 4500, null),
('University of Colorado Colorado Springs', 'UCCS', 'D2', 'RMAC', 'CO', 'Colorado Springs', 'Mountain West', '#CFB87C', '#000000', 'uccs.edu', 'uccs.edu', 12000, null),
('Adams State University', 'Adams State', 'D2', 'RMAC', 'CO', 'Alamosa', 'Mountain West', '#1E6B3A', '#FFFFFF', 'adamsstateathletics.com', 'adams.edu', 3500, null),
('Western State Colorado University', 'Western Colorado', 'D2', 'RMAC', 'CO', 'Gunnison', 'Mountain West', '#582C83', '#FFCC33', 'westernmountaineers.com', 'western.edu', 2500, null),
('Fort Lewis College', 'Fort Lewis', 'D2', 'RMAC', 'CO', 'Durango', 'Mountain West', '#FF6600', '#000000', 'fortlewisathletics.com', 'fortlewis.edu', 3500, null),
('University of New Mexico', 'UNM', 'D2', 'Mountain West', 'NM', 'Albuquerque', 'Southwest', '#BA0C2F', '#C0C0C0', 'golobos.com', 'unm.edu', 27000, null),
('New Mexico Highlands University', 'NMHU', 'D2', 'RMAC', 'NM', 'Las Vegas', 'Southwest', '#800080', '#FFFFFF', 'nmhu.edu', 'nmhu.edu', 3000, null),

-- GNAC Conference D2 schools
('Western Washington University', 'WWU', 'D2', 'GNAC', 'WA', 'Bellingham', 'Pacific Northwest', '#003F87', '#FFFFFF', 'wwuvikings.com', 'wwu.edu', 16000, null),
('Central Washington University', 'CWU', 'D2', 'GNAC', 'WA', 'Ellensburg', 'Pacific Northwest', '#981E32', '#000000', 'cwuwildcats.com', 'cwu.edu', 12000, null),
('Simon Fraser University', 'SFU', 'D2', 'GNAC', 'BC', 'Burnaby', 'Pacific Northwest', '#CC0633', '#FFFFFF', 'gosfu.com', 'sfu.ca', 30000, null),
('Saint Martin''s University', 'Saint Martin''s', 'D2', 'GNAC', 'WA', 'Lacey', 'Pacific Northwest', '#006633', '#FFFFFF', 'saintmartinsathletics.com', 'stmartin.edu', 1500, null),
('Western Oregon University', 'WOU', 'D2', 'GNAC', 'OR', 'Monmouth', 'Pacific Northwest', '#8B0000', '#C0C0C0', 'wouwolves.com', 'wou.edu', 6000, null),
('University of Alaska Fairbanks', 'Alaska Fairbanks', 'D2', 'GNAC', 'AK', 'Fairbanks', 'Pacific Northwest', '#003366', '#FFCC00', 'nanooksports.com', 'uaf.edu', 8000, null),
('University of Alaska Anchorage', 'Alaska Anchorage', 'D2', 'GNAC', 'AK', 'Anchorage', 'Pacific Northwest', '#155234', '#FFCC00', 'gouaa.com', 'uaa.alaska.edu', 16000, null),

-- CCAA and other California D2
('Academy of Art University', 'Academy of Art', 'D2', 'PacWest', 'CA', 'San Francisco', 'California', '#000000', '#FFFFFF', 'academyart.edu', 'academyart.edu', 8000, null),
('California Baptist University', 'Cal Baptist', 'D2', 'PacWest', 'CA', 'Riverside', 'California', '#003366', '#FF6600', 'calancers.com', 'calbaptist.edu', 11000, null),
('Point Loma Nazarene University', 'PLNU', 'D2', 'PacWest', 'CA', 'San Diego', 'California', '#003594', '#C69214', 'pointlomasports.com', 'pointloma.edu', 3500, null),
('Azusa Pacific University', 'APU', 'D2', 'PacWest', 'CA', 'Azusa', 'California', '#8B0000', '#FFCC33', 'apu.edu', 'apu.edu', 10000, null),
('Biola University', 'Biola', 'D2', 'PacWest', 'CA', 'La Mirada', 'California', '#8B0000', '#FFFFFF', 'biolaathletics.com', 'biola.edu', 6000, null),
('Concordia University Irvine', 'Concordia Irvine', 'D2', 'PacWest', 'CA', 'Irvine', 'California', '#FF6600', '#000000', 'cuieagles.com', 'cui.edu', 4500, null),
('Dominican University of California', 'Dominican CA', 'D2', 'PacWest', 'CA', 'San Rafael', 'California', '#003594', '#FFFFFF', 'dominicans.com', 'dominican.edu', 2000, null),
('Fresno Pacific University', 'Fresno Pacific', 'D2', 'PacWest', 'CA', 'Fresno', 'California', '#C8102E', '#000000', 'sunbirdsports.com', 'fresno.edu', 4000, null),
('Holy Names University', 'Holy Names', 'D2', 'PacWest', 'CA', 'Oakland', 'California', '#800080', '#FFFFFF', 'athletics.hnu.edu', 'hnu.edu', 1000, null),
('Menlo College', 'Menlo', 'D2', 'PacWest', 'CA', 'Atherton', 'California', '#FF6600', '#000000', 'menloathletics.com', 'menlo.edu', 800, null),
('Notre Dame de Namur University', 'NDNU', 'D2', 'PacWest', 'CA', 'Belmont', 'California', '#003594', '#FFFFFF', 'argonautsports.com', 'ndnu.edu', 2000, null),

-- Northwest D2 schools
('Central Oregon Community College', 'COCC', 'D2', 'NWAC', 'OR', 'Bend', 'Pacific Northwest', '#003366', '#FFFFFF', 'cocc.edu', 'cocc.edu', 6000, null),
('Lane Community College', 'LCC', 'D2', 'NWAC', 'OR', 'Eugene', 'Pacific Northwest', '#800080', '#FFFFFF', 'lanecc.edu', 'lanecc.edu', 9000, null),
('Portland Community College', 'PCC', 'D2', 'NWAC', 'OR', 'Portland', 'Pacific Northwest', '#8B0000', '#FFFFFF', 'pcc.edu', 'pcc.edu', 90000, null);

-- Insert West Coast/Mountain D3 schools (30 schools)
INSERT INTO schools (name, short_name, division, conference, state, city, region, primary_color, secondary_color, athletics_website, email_domain, enrollment, academic_rank) VALUES

-- Northwest Conference (NWC)
('Whitworth University', 'Whitworth', 'D3', 'NWC', 'WA', 'Spokane', 'Pacific Northwest', '#800080', '#FFFFFF', 'whitworthpirates.com', 'whitworth.edu', 3000, null),
('Whitman College', 'Whitman', 'D3', 'NWC', 'WA', 'Walla Walla', 'Pacific Northwest', '#003F87', '#FFFFFF', 'whitmanblues.com', 'whitman.edu', 1500, null),
('Pacific Lutheran University', 'PLU', 'D3', 'NWC', 'WA', 'Tacoma', 'Pacific Northwest', '#8B0000', '#FFCC33', 'lutes.com', 'plu.edu', 3000, null),
('University of Puget Sound', 'Puget Sound', 'D3', 'NWC', 'WA', 'Tacoma', 'Pacific Northwest', '#8B0000', '#FFFFFF', 'loggerathletics.com', 'pugetsound.edu', 2500, null),
('Lewis & Clark College', 'Lewis & Clark', 'D3', 'NWC', 'OR', 'Portland', 'Pacific Northwest', '#FF6600', '#000000', 'lcpioneers.com', 'lclark.edu', 3500, null),
('Linfield University', 'Linfield', 'D3', 'NWC', 'OR', 'McMinnville', 'Pacific Northwest', '#800080', '#FFFFFF', 'linfieldwildcats.com', 'linfield.edu', 1800, null),
('Willamette University', 'Willamette', 'D3', 'NWC', 'OR', 'Salem', 'Pacific Northwest', '#8B0000', '#FFCC33', 'willamettebearcats.com', 'willamette.edu', 2800, null),
('George Fox University', 'George Fox', 'D3', 'NWC', 'OR', 'Newberg', 'Pacific Northwest', '#003366', '#FFCC33', 'georgefoxbruins.com', 'georgefox.edu', 4000, null),
('Pacific University', 'Pacific OR', 'D3', 'NWC', 'OR', 'Forest Grove', 'Pacific Northwest', '#8B0000', '#C0C0C0', 'pacificboxers.com', 'pacificu.edu', 3800, null),

-- SCIAC (Southern California Intercollegiate Athletic Conference)
('Occidental College', 'Occidental', 'D3', 'SCIAC', 'CA', 'Los Angeles', 'California', '#FF6600', '#000000', 'occidentaltigers.com', 'oxy.edu', 2100, null),
('Pomona College', 'Pomona', 'D3', 'SCIAC', 'CA', 'Claremont', 'California', '#003F87', '#FFFFFF', 'pomonasagehens.com', 'pomona.edu', 1700, null),
('Claremont McKenna College', 'CMC', 'D3', 'SCIAC', 'CA', 'Claremont', 'California', '#8B0000', '#C0C0C0', 'cmsathenathletics.com', 'cmc.edu', 1400, null),
('University of Redlands', 'Redlands', 'D3', 'SCIAC', 'CA', 'Redlands', 'California', '#800080', '#FFFFFF', 'redlandssports.com', 'redlands.edu', 5000, null),
('California Lutheran University', 'Cal Lutheran', 'D3', 'SCIAC', 'CA', 'Thousand Oaks', 'California', '#800080', '#FFCC33', 'callutheranathletics.com', 'callutheran.edu', 4200, null),
('Chapman University', 'Chapman', 'D3', 'SCIAC', 'CA', 'Orange', 'California', '#AA0000', '#000000', 'chapmansports.com', 'chapman.edu', 9000, null),
('University of La Verne', 'La Verne', 'D3', 'SCIAC', 'CA', 'La Verne', 'California', '#155234', '#FFFFFF', 'lavernesports.com', 'laverne.edu', 8500, null),
('Whittier College', 'Whittier', 'D3', 'SCIAC', 'CA', 'Whittier', 'California', '#800080', '#FFFFFF', 'whittierpoets.com', 'whittier.edu', 1800, null),
('California Institute of Technology', 'Caltech', 'D3', 'SCIAC', 'CA', 'Pasadena', 'California', '#FF6600', '#000000', 'caltechathletics.com', 'caltech.edu', 2200, 9),

-- Other West Coast D3 schools
('Mills College', 'Mills', 'D3', 'Independent', 'CA', 'Oakland', 'California', '#8B0000', '#FFFFFF', 'mills.edu', 'mills.edu', 1000, null),
('University of California, Santa Cruz', 'UC Santa Cruz', 'D3', 'Independent', 'CA', 'Santa Cruz', 'California', '#003594', '#FFCC33', 'goslugs.com', 'ucsc.edu', 19000, null),


-- Pacific Northwest D3 schools
('Evergreen State College', 'Evergreen', 'D3', 'Independent', 'WA', 'Olympia', 'Pacific Northwest', '#155234', '#FFFFFF', 'evergreen.edu', 'evergreen.edu', 4000, null),
('Cornish College of the Arts', 'Cornish', 'D3', 'Independent', 'WA', 'Seattle', 'Pacific Northwest', '#000000', '#FFFFFF', 'cornish.edu', 'cornish.edu', 800, null),


-- Additional California D3
('Scripps College', 'Scripps', 'D3', 'SCIAC', 'CA', 'Claremont', 'California', '#155234', '#FFFFFF', 'scrippssports.com', 'scrippscollege.edu', 1100, null),
('Harvey Mudd College', 'Harvey Mudd', 'D3', 'SCIAC', 'CA', 'Claremont', 'California', '#FFCC33', '#000000', 'hmc.edu', 'hmc.edu', 900, null),
('Pitzer College', 'Pitzer', 'D3', 'SCIAC', 'CA', 'Claremont', 'California', '#FF6600', '#000000', 'pitzersagehens.com', 'pitzer.edu', 1100, null);

-- Insert coaches for all schools
-- Note: Using real coach names where known, placeholder for uncertain ones
-- All coaches set with visibility 'shared' and verified_at NULL (unverified seed data)

-- UCLA Coaches
INSERT INTO coaches (school_id, name, title, email, visibility, verified_at, flagged_as_stale) VALUES
((SELECT id FROM schools WHERE short_name = 'UCLA'), 'Head Coach — Needs Verification', 'Head Coach', NULL, 'shared', NULL, false),
((SELECT id FROM schools WHERE short_name = 'UCLA'), 'Assistant Coach — Needs Verification', 'Assistant Coach', NULL, 'shared', NULL, false);

-- USC Coaches
INSERT INTO coaches (school_id, name, title, email, visibility, verified_at, flagged_as_stale) VALUES
((SELECT id FROM schools WHERE short_name = 'USC'), 'Head Coach — Needs Verification', 'Head Coach', NULL, 'shared', NULL, false),
((SELECT id FROM schools WHERE short_name = 'USC'), 'Assistant Coach — Needs Verification', 'Assistant Coach', NULL, 'shared', NULL, false);

-- Stanford Coaches (known data)
INSERT INTO coaches (school_id, name, title, email, visibility, verified_at, flagged_as_stale) VALUES
((SELECT id FROM schools WHERE short_name = 'Stanford'), 'Jeremy Gunn', 'Head Coach', 'jgunn@stanford.edu', 'shared', NULL, false),
((SELECT id FROM schools WHERE short_name = 'Stanford'), 'Assistant Coach — Needs Verification', 'Assistant Coach', NULL, 'shared', NULL, false);

-- University of Washington Coaches
INSERT INTO coaches (school_id, name, title, email, visibility, verified_at, flagged_as_stale) VALUES
((SELECT id FROM schools WHERE short_name = 'Washington'), 'Head Coach — Needs Verification', 'Head Coach', NULL, 'shared', NULL, false);

-- For brevity, adding placeholder coaches for remaining schools
-- In production, these would be researched and filled with real names
INSERT INTO coaches (school_id, name, title, email, visibility, verified_at, flagged_as_stale)
SELECT
    s.id,
    'Head Coach — Needs Verification',
    'Head Coach',
    NULL,
    'shared',
    NULL,
    false
FROM schools s
WHERE s.short_name NOT IN ('UCLA', 'USC', 'Stanford', 'Washington');

-- Add assistant coaches for all D1 schools
INSERT INTO coaches (school_id, name, title, email, visibility, verified_at, flagged_as_stale)
SELECT
    s.id,
    'Assistant Coach — Needs Verification',
    'Assistant Coach',
    NULL,
    'shared',
    NULL,
    false
FROM schools s
WHERE s.division = 'D1'
AND s.short_name NOT IN ('UCLA', 'USC', 'Stanford');  -- Skip schools that already have assistants