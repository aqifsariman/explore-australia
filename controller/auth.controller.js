/* eslint-disable import/extensions */

import pool from '../pool.js'
import jsSHA from 'jssha';
import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import methodOverride from 'method-override';

const app = express();
const envFilePath = '.env';
dotenv.config({ path: path.normalize(envFilePath) });
app.use(methodOverride('_method'));


// initialize salt as a global constant
const {
  SALT
// eslint-disable-next-line no-undef
} = process.env;

const getHash = (input) => {
  // create new SHA object
  const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });

  // create an unhashed cookie string based on user ID and salt
  const unhashedString = `${input}-${SALT}`;

  // generate a hashed cookie string using SHA object
  shaObj.update(unhashedString);
  return shaObj.getHash('HEX');
};

export const getSignUp = (req,res) => {
  res.render('signup')
}

export const postSignUp = (req, res) => {
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
}

export const getLogin = (req, res) => {
  res.render('login');
}

export const postLogin = (req, res) => {
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
}

export const deleteLogout = (req, res) => {
  res.clearCookie('loggedIn');
  res.clearCookie('username');
  res.redirect(301, '/login');
}