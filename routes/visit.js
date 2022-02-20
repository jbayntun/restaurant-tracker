var express = require('express');
var router = express.Router();

const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('restaurants.db');

router.get('/', function(req, res, next) {
  res.send('lets visit places!');
});

// sends the user to a form to add a visit
router.get('/add/:restaurant_id', function(req, res, next) {
    res.render('add_visit', {google_id: req.params.restaurant_id});
});

// processes completed form
router.post('/add/:restaurant_id', function(req, res, next) {
    db.run('INSERT into visits(restaurant_id, date, rating, dishes, comment) values(?,?,?,?,?)',
    req.params.restaurant_id,
    req.body.date,
    req.body.rating,
    req.body.dishes,
    req.body.comment
    );

    db.run('UPDATE restaurants SET has_visited = has_visited + 1 WHERE google_id = ?',
    req.params.restaurant_id);

    return res.redirect('/');
    //res.render('add_visit', {google_id: req.params.restaurant_id});
});

// shows visits at a given restaurant
router.get('/:restaurant_id', function(req, res, next) {
  db.all(`SELECT r.name, v.date, v.rating, v.dishes, v.comment
        FROM restaurants r JOIN visits v on r.google_id=v.restaurant_id
        WHERE v.restaurant_id = ?
        ORDER BY v.date DESC`,
    req.params.restaurant_id,
    (err, rows) => {
      console.log(rows);
      res.render('visits', {visits: rows});
    });  
});

module.exports = router;
