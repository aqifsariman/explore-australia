CREATE TABLE IF NOT EXISTS userTrip (
  id SERIAL PRIMARY KEY,
  username TEXT,
  tripName TEXT,
  dateFrom TEXT,
  dateTo TEXT,
  cityId INTEGER,
  attractions TEXT,
  budget INTEGER,
  totalCost INTEGER
);

