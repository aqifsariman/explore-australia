CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT,
  username TEXT,
  firstName TEXT,
  lastName TEXT,
  password TEXT
);

CREATE TABLE IF NOT EXISTS userTrip (
  id SERIAL PRIMARY KEY,
  username TEXT,
  tripName TEXT,
  dateFrom TEXT,
  dateTo TEXT,
  cityId INTEGER,
  attractions TEXT,
  totalPax INTEGER,
  budget INTEGER,
  totalCost INTEGER
);

CREATE TABLE IF NOT EXISTS cities (
  id SERIAL PRIMARY KEY,
  name TEXT
);

CREATE TABLE IF NOT EXISTS attractions (
  id SERIAL PRIMARY KEY,
  name TEXT,
  cost INTEGER,
  details TEXT,
  imageLink TEXT,
  cityID INTEGER
);

CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY NOT NULL,
  username TEXT NOT NULL,
  cityId INTEGER NOT NULL,
  attractionsId INTEGER NOT NULL,
  unique(username, attractionsId)
);