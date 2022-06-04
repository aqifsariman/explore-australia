/* eslint-disable import/extensions */
import express from 'express';
import methodOverride from 'method-override';
import path from 'path';
import axios from 'axios';
import moment from 'moment';
import dotenv from 'dotenv';
import pool from './pool.js';

const app = express();
const envFilePath = '.env';
dotenv.config({ path: path.normalize(envFilePath) });
app.use(methodOverride('_method'));


export const getHomepage = async (req, res) => {
  const { username } = req.cookies;
  // const image = await axios.get(`${unsplashURL}/photos/random?query=australia&count=9&orientation=landscape`, {
  //   headers: {
  //     Authorization: `Client-ID ${ACCESS_KEY}`,
  //   },
  // });
  // const imageData = image.data;
  // console.log(imageData);
  // res.render('homepage', { username, imageData });
  res.render('homepage', { username });
}

export const getAddTrip = (req, res) => {
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
}

export const postAddTrip = (req, res) => {
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
}

export const getAddAttraction = (req, res) => {
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
}

export const putAddAttractions = (req, res) => {
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
}

export const getPlannedTrips = (req, res) => {
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
}

export const getPlannedTripsByTripId = (req, res) => {
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
}

export const getAttractions = (req, res) => {
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
}

export const getDestinations = (req, res) => {
  const { username } = req.cookies;
  const cityQuery = 'SELECT * FROM cities ORDER BY id ASC';
  pool.query(cityQuery, (error, result) => {
    if (error) {
      console.log('Error', error);
    }
    const finalResults = result.rows;
    res.render('cities', { username, finalResults });
  });
}

export const getEditTrip = (req, res) => {
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
}

export const putEditTrip = (req, res) => {
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
}

export const getEditAddAttractions = (req, res) => {
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
}

export const putEditAddAttractions = (req, res) => {
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
}

export const deleteEditTrip = (req, res) => {
  const { username } = req.cookies;
  const { tripId } = req.params;
  const deleteQuery = `DELETE FROM userTrip WHERE id = ${tripId}`;
  pool.query(deleteQuery, (err) => {
    if (err) {
      console.log('Error', err);
    }
    res.redirect(301, `/planned-trips/${username}`);
  });
}

export const getWeather = (req, res) => {
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
}

export const postFavorite = (req) => {
  const { username } = req.cookies;
  const { cityId, attractionsId } = req.params;
  const insertQuery = 'INSERT INTO favorites (username, cityId, attractionsId) VALUES ($1,$2,$3) ON CONFLICT (username, attractionsId) DO NOTHING';
  const values = [username, cityId, attractionsId];
  pool.query(insertQuery, values, (err) => {
    if (err) {
      console.log('Error', err);
    }
  });
}

export const postUnfavorite = (req) => {
  const { username } = req.cookies;
  const { attractionsId } = req.params;
  const deleteQuery = 'DELETE FROM favorites WHERE attractionsId = $1 AND username = $2';
  const values = [attractionsId, username];
  pool.query(deleteQuery, values, (err) => {
    if (err) {
      console.log('Error', err);
    }
  });
}

export const getFavorites = (req, res) => {
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
}