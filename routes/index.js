const sqlite3 = require('sqlite3');

var express = require('express');
var router = express.Router();

const db = new sqlite3.Database('restaurants.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);

db.run(`
CREATE TABLE IF NOT EXISTS restaurants(
  google_id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  google_types TEXT NOT NULL,
  google_rating DOUBLE,
  google_ratings_count INT,
  google_price_level INT,
  google_status TEXT,
  latitude TEXT,
  longitude TEXT,
  has_visited INT,
  want_to_visit INT
);`);

db.run(`
CREATE TABLE IF NOT EXISTS visits(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id TEXT NOT NULL,
  date TEXT NOT NULL,
  rating TEXT NOT NULL,
  dishes TEXT,
  COMMENT TEXT
);`);

/* GET home page. */
router.get('/', function(req, res) {

  visit_options = ["high", "yes", "maybe", "no"];

  db.all(`SELECT r.google_id, name, google_rating, google_ratings_count, has_visited, want_to_visit  
        FROM restaurants r
        WHERE r.want_to_visit <> 'no'
          AND r.google_status = 'OPERATIONAL'
        ORDER BY google_rating DESC
        LIMIT 200`, 
  (err, rows) => {

    if(err) {
      console.error(err.message);
    }
    console.log(rows);
    for (r of rows) {
      var temp = {};
      r.name.website = r.website;
      temp.google_id = r.google_id;
      temp.want_to_visit = r.want_to_visit;
      r.want_to_visit = temp;

      temp = {};
      temp.name = r.name;
      temp.website = r.website;
      r.name = temp;

    }

    res.render('index', { title: 'Restaurants', items: rows, visit_options:visit_options });
  });
  
});

router.post('/', function(req, res) {
  console.log(req.body);

  if(req.body.want_to_visit && req.body.id) {
    db.run('UPDATE restaurants SET want_to_visit = ? where google_id = ?', req.body.want_to_visit, req.body.id);
    return res.redirect("/");
  }

  return res.send('Item not found');
});

module.exports = router;
