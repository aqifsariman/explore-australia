// eslint-disable-next-line import/extensions
import pool from './pool.js'

const authMiddleware = (request, response, next) => {
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

export default authMiddleware;