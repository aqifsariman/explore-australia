/* eslint-disable max-len */
/* eslint-disable new-cap */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-loop-func */
/* eslint-disable no-console */
/* eslint-disable prefer-destructuring */
/* eslint-disable import/extensions */
/* eslint-disable no-plusplus */
// eslint-disable-next-line no-unused-vars
import express from 'express';
import methodOverride from 'method-override';
import cookieParser from 'cookie-parser';
import jsSHA from 'jssha';
import path from 'path';
import favicon from 'serve-favicon';
import axios from 'axios';
import moment from 'moment';
import dotenv from 'dotenv';
import pool from './pool.js';

const app = express();
const __dirname = path.resolve();
const envFilePath = '.env';
dotenv.config({ path: path.normalize(envFilePath) });

app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

// Override POST requests with query param ?_method=PUT to be PUT requests
app.use(methodOverride('_method'));
app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.ico')));

// initialize salt as a global constant
const {
  // eslint-disable-next-line no-unused-vars
  SALT, PORT, ACCESS_KEY,
} = process.env;

// eslint-disable-next-line no-unused-vars
const unsplashURL = 'https://api.unsplash.com';

const getHash = (input) => {
  // create new SHA object
  const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });

  // create an unhashed cookie string based on user ID and salt
  const unhashedString = `${input}-${SALT}`;

  // generate a hashed cookie string using SHA object
  shaObj.update(unhashedString);
  return shaObj.getHash('HEX');
};

app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', (req, res) => {
  const input = req.body;
  const insertQuery = 'INSERT INTO users (username, email, firstName, lastName, password) VALUES ($1, $2, $3, $4, $5)';
  if (input === null || input === undefined) {
    res.render('signup');
  }

  const hashedPassword = getHash(input.password);
  const values = [input.username, input.email, input.firstName, input.lastName, hashedPassword];
  res.cookie('signUp', true);
  res.cookie('loggedIn', 'pending');
  pool.query(insertQuery, values, (err) => {
    if (err) {
      console.log('Error: ', err);
    }
  });
  res.redirect(301, '/login');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const values = [req.body.username];
  const { username } = req.body;
  const loginQuery = 'SELECT * FROM users WHERE username=$1';
  pool.query(loginQuery, values, (error, result) => {
    if (error) {
      console.log('Error executing query', error.stack);
      res.status(503).send(result.rows[0]);
      return;
    }

    if (result.rows.length === 0) {
      res.status(403);
      res.cookie('loggedIn', false);
      res.render('login');
      return;
    }

    const user = result.rows[0];

    const hashedPassword = getHash(req.body.password);

    if (user.password === hashedPassword) {
      const hashedCookieString = getHash(user.username);
      res.cookie('loggedInHash', hashedCookieString);
      res.cookie('username', username);
      res.redirect(301, '/');
      console.log('Login success!');
    } else {
      res.status(403);
      res.redirect(301, '/login');
    }
  });
});

app.delete('/logout', (req, res) => {
  res.clearCookie('loggedIn');
  res.clearCookie('username');
  res.redirect(301, '/login');
});

app.use((request, response, next) => {
  // set the default value
  request.isUserLoggedIn = false;

  // check to see if the cookies you need exists
  if (request.cookies.loggedInHash && request.cookies.username) {
    // get the hased value that should be inside the cookie
    const hash = getHash(request.cookies.username);

    // test the value of the cookie
    if (request.cookies.loggedInHash === hash) {
      request.isUserLoggedIn = true;
    }
  }
  console.log('Checking for authorization!');
  next();
});

const restrictToLogIn = (request, response, next) => {
  // is the user logged in? Use the other middleware.
  if (request.isUserLoggedIn === false) {
    response.redirect('/login');
  } else {
    // The user is logged in. Get the user from the DB.
    const userQuery = 'SELECT * FROM users WHERE username=$1';
    pool.query(userQuery, [request.cookies.username])
      .then((userQueryResult) => {
        // can't find the user based on their cookie.
        if (userQueryResult.rows.length === 0) {
          response.redirect('/login');
          return;
        }

        // attach the DB query result to the request object.
        request.user = userQueryResult.rows[0];

        // go to the route callback.
        next();
      }).catch(() => {
        response.redirect('/login');
      });
  }
};

app.get('/', async (req, res) => {
  const { username } = req.cookies;
  // const image = await axios.get(`${unsplashURL}/photos/random?query=australia&count=9&orientation=landscape`, {
  //   headers: {
  //     Authorization: `Client-ID ${ACCESS_KEY}`,
  //   },
  // });
  // const imageData = image.data;
  // res.render('homepage', { username, imageData });
  res.render('homepage', { username });
});

app.get('/add-trip', restrictToLogIn, (req, res) => {
  // let cityInfo;
  const { username } = req.cookies;
  const citiesQuery = 'SELECT * FROM cities ORDER BY name ASC';
  pool.query(citiesQuery, (err, results) => {
    if (err) {
      console.log('Error', err);
    }

    const listOfCities = results.rows;
    res.render('travel-form', { username, listOfCities });
  });
});

app.post('/add-trip', (req, res) => {
  const {
    tripName, dateFrom, dateTo, cityId, budget, totalPax,
  } = req.body;
  const { username } = req.cookies;
  const insertQuery = 'INSERT INTO userTrip (username, tripName, dateFrom, dateTo, cityId, budget, totalPax) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id';
  const values = [username, tripName, dateFrom, dateTo, cityId, budget, totalPax];
  pool.query(insertQuery, values, (error, result) => {
    if (error) {
      console.log('Error', error);
    }
    console.log('Details added!');
    const finalResults = result.rows[0];
    const { id } = finalResults;
    res.cookie('budget', budget);
    res.redirect(301, `/add-attractions/${id}/${cityId}?totalPax=${totalPax}`);
  });
});

app.get('/add-attractions/:tripId/:cityId', restrictToLogIn, (req, res) => {
  const { username, budget } = req.cookies;
  const { cityId, tripId } = req.params;
  const { totalPax } = req.query;
  const values = [cityId];
  const attractionsQuery = 'SELECT * FROM attractions WHERE cityId = $1';
  pool.query(attractionsQuery, values, (error, result) => {
    if (error) {
      console.log('Error', error);
    }
    const attractions = result.rows;
    console.log(totalPax);
    res.render('attractions', {
      username, attractions, tripId, cityId, budget, totalPax,
    });
  });
});

app.put('/add-attractions/:tripId/:cityId', restrictToLogIn, (req, res) => {
  const { username, totalCost } = req.cookies;
  const { tripId } = req.params;
  const { attractionName } = req.body;
  const allSummarySelected = [];
  let allSummaryString = '';

  if (typeof (attractionName) === 'string') {
    allSummaryString = attractionName;
  } else if (typeof (attractionName) === 'object') {
    allSummarySelected.push(attractionName);
    allSummaryString = allSummarySelected[0].join(', ');
  }

  const summaryValue = [allSummaryString, totalCost, tripId];
  const inputAttractions = 'UPDATE userTrip SET attractions = $1, totalCost =$2 WHERE id = $3';
  pool.query(inputAttractions, summaryValue, (inputAttractionsError) => {
    if (inputAttractionsError) {
      console.log('Error', inputAttractionsError);
    }
    res.redirect(301, `/planned-trips/${username}`);
  });
});

app.get('/planned-trips/:username', restrictToLogIn, (req, res) => {
  const { username } = req.cookies;
  const values = [username];
  const tripsQuery = ' SELECT attractions, tripName, dateFrom, dateTo, cities.name, budget, totalCost, usertrip.Id, totalPax, imageLink FROM userTrip INNER JOIN cities ON userTrip.cityId = cities.Id WHERE username = $1 ORDER BY dateFrom ASC';
  pool.query(tripsQuery, values, (error, result) => {
    if (error) {
      console.log('Error', error);
    }
    console.log('Fetching trips planned!');
    const finalResults = result.rows;
    res.render('planned-trips', { username, finalResults, moment });
  });
});

app.get('/planned-trips/:username/:tripId', restrictToLogIn, (req, res) => {
  const { username } = req.cookies;
  const { tripId } = req.params;
  const value = [tripId];
  const tripQuery = 'SELECT userTrip.cityId, tripName, dateFrom, dateTo, cities.name, budget, totalcost, totalPax, attractions, cities.imageLink FROM userTrip INNER JOIN cities ON userTrip.cityId = cities.Id WHERE userTrip.id = $1';
  pool.query(tripQuery, value, (error, result) => {
    if (error) {
      console.log('Error', error);
    }
    const finalResults = result.rows[0];
    const { cityid } = result.rows[0];
    res.render('trips-by-id', {
      username, finalResults, cityid, tripId, moment,
    });
  });
});

// show favorites by inner joining 3 tables
app.get('/attractions', (req, res) => {
  let finalResults;
  const { filterBy } = req.query;
  const { username } = req.cookies;
  let filterQuery = 'Default';
  const tripQuery = 'SELECT attractions.id, cities.name, attractions.name AS attractionsName, attractions.details, attractions.id AS attractionsId, cities.id AS citiesId, attractions.imageLink, cost FROM attractions INNER JOIN cities ON cities.id = attractions.cityId';
  pool.query(tripQuery, (error, result) => {
    if (error) {
      console.log('Error', error);
    } else if (filterBy === 'Adelaide') {
      const value = [filterBy];
      filterQuery = 'SELECT cities.name, attractions.name AS attractionsName, attractions.details, attractions.id AS attractionsId, cities.id AS citiesId, attractions.imageLink, cost FROM attractions INNER JOIN cities ON cities.id = attractions.cityId WHERE cities.name = $1';
      pool.query(filterQuery, value, (filterQueryError, filterQueryResult) => {
        if (filterQueryError) {
          console.log('Error', error);
        }
        finalResults = filterQueryResult.rows;
        res.render('all-attractions', {
          username, finalResults,
        });
      });
    } else if (filterBy === 'Brisbane') {
      const value = [filterBy];
      filterQuery = 'SELECT cities.name, attractions.name AS attractionsName, attractions.details, attractions.id AS attractionsId, cities.id AS citiesId, attractions.imageLink, cost FROM attractions INNER JOIN cities ON cities.id = attractions.cityId WHERE cities.name = $1';
      pool.query(filterQuery, value, (filterQueryError, filterQueryResult) => {
        if (filterQueryError) {
          console.log('Error', error);
        }
        finalResults = filterQueryResult.rows;
        res.render('all-attractions', {
          username, finalResults,
        });
      });
    } else if (filterBy === 'Canberra') {
      const value = [filterBy];
      filterQuery = 'SELECT cities.name, attractions.name AS attractionsName, attractions.details, attractions.id AS attractionsId, cities.id AS citiesId, attractions.imageLink, cost FROM attractions INNER JOIN cities ON cities.id = attractions.cityId WHERE cities.name = $1';
      pool.query(filterQuery, value, (filterQueryError, filterQueryResult) => {
        if (filterQueryError) {
          console.log('Error', filterQueryError);
        }
        finalResults = filterQueryResult.rows;
        res.render('all-attractions', {
          username, finalResults,
        });
      });
    } else if (filterBy === 'Darwin') {
      const value = [filterBy];
      filterQuery = 'SELECT cities.name, attractions.name AS attractionsName, attractions.details, attractions.id AS attractionsId, cities.id AS citiesId, attractions.imageLink, cost FROM attractions INNER JOIN cities ON cities.id = attractions.cityId WHERE cities.name = $1';
      pool.query(filterQuery, value, (filterQueryError, filterQueryResult) => {
        if (filterQueryError) {
          console.log('Error', filterQueryError);
        }
        finalResults = filterQueryResult.rows;
        res.render('all-attractions', {
          username, finalResults,
        });
      });
    } else if (filterBy === 'Hobart') {
      const value = [filterBy];
      filterQuery = 'SELECT cities.name, attractions.name AS attractionsName, attractions.details, attractions.id AS attractionsId, cities.id AS citiesId, attractions.imageLink, cost FROM attractions INNER JOIN cities ON cities.id = attractions.cityId WHERE cities.name = $1';
      pool.query(filterQuery, value, (filterQueryError, filterQueryResult) => {
        if (filterQueryError) {
          console.log('Error', filterQueryError);
        }
        finalResults = filterQueryResult.rows;
        res.render('all-attractions', {
          username, finalResults,
        });
      });
    } else if (filterBy === 'Perth') {
      const value = [filterBy];
      filterQuery = 'SELECT cities.name, attractions.name AS attractionsName, attractions.details, attractions.id AS attractionsId, cities.id AS citiesId, attractions.imageLink, cost FROM attractions INNER JOIN cities ON cities.id = attractions.cityId WHERE cities.name = $1';
      pool.query(filterQuery, value, (filterQueryError, filterQueryResult) => {
        if (filterQueryError) {
          console.log('Error', filterQueryError);
        }
        finalResults = filterQueryResult.rows;
        res.render('all-attractions', {
          username, finalResults,
        });
      });
    } else if (filterBy === 'Melbourne') {
      const value = [filterBy];
      filterQuery = 'SELECT cities.name, attractions.name AS attractionsName, attractions.details, attractions.id AS attractionsId, cities.id AS citiesId, attractions.imageLink, cost FROM attractions INNER JOIN cities ON cities.id = attractions.cityId WHERE cities.name = $1';
      pool.query(filterQuery, value, (filterQueryError, filterQueryResult) => {
        if (filterQueryError) {
          console.log('Error', filterQueryError);
        }
        finalResults = filterQueryResult.rows;
        res.render('all-attractions', {
          username, finalResults,
        });
      });
    } else if (filterBy === 'Sydney') {
      const value = [filterBy];
      filterQuery = 'SELECT cities.name, attractions.name AS attractionsName, attractions.details, attractions.id AS attractionsId, cities.id AS citiesId, attractions.imageLink, cost FROM attractions INNER JOIN cities ON cities.id = attractions.cityId WHERE cities.name = $1';
      pool.query(filterQuery, value, (filterQueryError, filterQueryResult) => {
        if (filterQueryError) {
          console.log('Error', filterQueryError);
        }
        finalResults = filterQueryResult.rows;
        res.render('all-attractions', {
          username, finalResults,
        });
      });
    } else {
      finalResults = result.rows;
      res.render('all-attractions', {
        username, finalResults,
      });
    }
  });
});

app.get('/destinations', (req, res) => {
  const { username } = req.cookies;
  const cityQuery = 'SELECT * FROM cities ORDER BY id ASC';
  pool.query(cityQuery, (error, result) => {
    if (error) {
      console.log('Error', error);
    }
    const finalResults = result.rows;
    res.render('cities', { username, finalResults });
  });
});

app.get('/edit-trip/:tripId', (req, res) => {
  const { username } = req.cookies;
  const { tripId } = req.params;
  const tripQuery = `SELECT * FROM userTrip WHERE id=${tripId}`;
  const cityQuery = 'SELECT * FROM cities ORDER BY name ASC';
  const citySelected = `SELECT cities.name, cities.id FROM cities INNER JOIN userTrip ON userTrip.cityId=cities.Id WHERE userTrip.Id = ${tripId}`;
  pool.query(tripQuery, (tripQueryError, tripQueryResults) => {
    if (tripQueryError) {
      console.log('Error', tripQueryError);
    }
    pool.query(cityQuery, (cityQueryError, cityQueryResults) => {
      if (cityQueryError) {
        console.log('Error', cityQueryError);
      }
      pool.query(citySelected, (citySelectedError, citySelectedResults) => {
        if (citySelectedError) {
          console.log('Error', citySelectedError);
        }
        const city = citySelectedResults.rows[0];
        const listOfCities = cityQueryResults.rows;
        const finalResults = tripQueryResults.rows[0];
        console.log(finalResults);
        res.render('edit-trip', {
          finalResults, username, listOfCities, city,
        });
      });
    });
  });
});

app.put('/edit-trip/:tripId', (req, res) => {
  const {
    tripName, dateFrom, dateTo, cityId, budget, totalPax,
  } = req.body;
  const { username } = req.cookies;
  const { tripId } = req.params;
  const insertQuery = `UPDATE userTrip SET username = '${username}', tripName = '${tripName}', dateFrom = '${dateFrom}', dateTo = '${dateTo}', cityId = ${cityId}, budget = ${budget} WHERE id=${tripId}, totalPax=${totalPax}  RETURNING userTrip.*`;
  const selectQuery = `SELECT * FROM userTrip WHERE id= ${tripId}`;
  pool.query(insertQuery, (error) => {
    if (error) {
      console.log('Error', error);
    }
    console.log('Details added!');
    pool.query(selectQuery, (selectQueryError, selectQueryResult) => {
      if (selectQueryError) {
        console.log('Error', selectQueryError);
      }
      const finalResults = selectQueryResult.rows[0];
      const { id, cityid } = finalResults;
      console.log(budget);
      res.cookie('budget', budget);
      res.redirect(301, `/edit-add-attractions/${id}/${cityid}/${totalPax}/${budget}`);
    });
  });
});
app.get('/edit-add-attractions/:tripId/:cityId/:totalPax/:budget', restrictToLogIn, (req, res) => {
  const { username } = req.cookies;
  const {
    cityId, tripId, totalPax, budget,
  } = req.params;
  const values = [cityId];
  const attractionsQuery = 'SELECT * FROM attractions WHERE cityId = $1';
  pool.query(attractionsQuery, values, (error, result) => {
    if (error) {
      console.log('Error', error);
    }
    const attractions = result.rows;
    console.log(totalPax);
    console.log(budget);
    res.render('edit-attractions', {
      username, attractions, tripId, cityId, budget, totalPax,
    });
  });
});

app.put('/edit-final-attractions/:tripId/:cityId/:totalPax/:budget', restrictToLogIn, (req, res) => {
  const { username } = req.cookies;
  const { tripId, totalPax, budget } = req.params;
  const { attractionName, totalCost } = req.body;
  const allSummarySelected = [];
  let allSummaryString = '';

  console.log(totalCost);
  if (typeof (attractionName) === 'string') {
    allSummaryString = attractionName;
  } else if (typeof (attractionName) === 'object') {
    allSummarySelected.push(attractionName);
    allSummaryString = allSummarySelected[0].join(', ');
  }

  const summaryValue = [allSummaryString, totalCost, totalPax, budget, tripId];
  const inputAttractions = 'UPDATE userTrip SET attractions = $1, totalCost =$2, totalPax=$3, budget=$4  WHERE id = $5';
  pool.query(inputAttractions, summaryValue, (inputAttractionsError) => {
    if (inputAttractionsError) {
      console.log('Error', inputAttractionsError);
    }
    res.redirect(301, `/planned-trips/${username}`);
  });
});

app.delete('/edit-trip/:tripId', (req, res) => {
  const { username } = req.cookies;
  const { tripId } = req.params;
  const deleteQuery = `DELETE FROM userTrip WHERE id = ${tripId}`;
  pool.query(deleteQuery, (err) => {
    if (err) {
      console.log('Error', err);
    }
    res.redirect(301, `/planned-trips/${username}`);
  });
});

app.get('/weather/:cityName', (req, res) => {
  const { cityName } = req.params;
  const { username } = req.cookies;
  const options = {
    method: 'GET',
    url: `https://aerisweather1.p.rapidapi.com/forecasts/${cityName},aus`,
    headers: {
      'X-RapidAPI-Host': 'aerisweather1.p.rapidapi.com',
      'X-RapidAPI-Key': '2716bea426msh67653f7a3356697p15862djsn020d7cc207f8',
    },
  };

  const citiesQuery = 'SELECT * FROM cities;';

  axios.request(options).then((response) => {
    const periods = response.data.response[0].periods;
    pool.query(citiesQuery, (err, result) => {
      const finalResults = result.rows;
      res.render('weather-forecast', {
        username, periods, cityName, moment, finalResults,
      });
    });
  }).catch((error) => {
    console.error(error);
  });
});

app.post('/favorite/:attractionsId/:cityId', (req, res) => {
  const { username } = req.cookies;
  const { cityId, attractionsId } = req.params;
  const insertQuery = 'INSERT INTO favorites (username, cityId, attractionsId) VALUES ($1,$2,$3) ON CONFLICT (username, attractionsId) DO NOTHING';
  const values = [username, cityId, attractionsId];
  pool.query(insertQuery, values, (err) => {
    if (err) {
      console.log('Error', err);
    }
  });
});

app.post('/unfavorite/:attractionsId', (req) => {
  const { username } = req.cookies;
  const { attractionsId } = req.params;
  const deleteQuery = 'DELETE FROM favorites WHERE attractionsId = $1 AND username = $2';
  const values = [attractionsId, username];
  pool.query(deleteQuery, values, (err) => {
    if (err) {
      console.log('Error', err);
    }
  });
});

app.get('/favorites/:username', (req, res) => {
  let finalResults;
  const { username } = req.params;
  const tripQuery = 'SELECT attractions.id, cities.name, attractions.name AS attractionsName, attractions.details, attractions.id AS attractionsId, cities.id AS citiesId, attractions.imageLink, cost, username FROM attractions INNER JOIN cities ON cities.id = attractions.cityId INNER JOIN favorites ON favorites.attractionsId = attractions.id';
  pool.query(tripQuery, (error, result) => {
    if (error) {
      console.log('Error', error);
    }
    finalResults = result.rows;
    res.render('favorites', {
      username, finalResults,
    });
  });
});

app.get('/blog', (req, res) => {
  const { username } = req.cookies;
  res.render('blog', { username });
});

app.listen(PORT, console.log(` 🚀 Running on port ${PORT}! 🚀`));
