const sqlite3 = require('sqlite3');

var express = require('express');
var router = express.Router();

const db = new sqlite3.Database('restaurants.db');

/* GET home page. */
router.get('/', function(req, res) {

  visit_options = ["high", "yes", "maybe", "no"];

  db.all(`SELECT r.google_id, name, google_rating, google_ratings_count, google_url, website, distance_from_jeff, walk_time, phone, has_visited, want_to_visit  
        FROM restaurants r LEFT JOIN restaurants_detail d on r.google_id=d.google_id
        WHERE r.want_to_visit <> 'no'
          AND r.google_status = 'OPERATIONAL'
        ORDER BY google_rating DESC, distance_from_jeff
        LIMIT 200`, 
  (err, rows) => {

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
    return res.sendStatus(200);
  }

  return res.send('Item not found');
});

module.exports = router;
