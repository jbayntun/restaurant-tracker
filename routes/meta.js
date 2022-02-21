// Much of this file is from https://github.com/samuelfullerthomas/argo
// Those components are excluded from the repository LICENSE.txt file.

var express = require('express');
var router = express.Router();

const { getGrid, sleep } = require("../helpers");

const sqlite3 = require('sqlite3');
const { Client } = require("@googlemaps/google-maps-services-js");
const client = new Client({});

const placeType = 'restaurant';

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('meta', {});
});

router.post('/', async (req, res, next) => {
  console.log(req.body);

  let lat1 = parseFloat(req.body.lat1);
  let lat2 = parseFloat(req.body.lat2);
  let long1 = parseFloat(req.body.long1);
  let long2 = parseFloat(req.body.long2);

  let latRange = [];
  latRange.push(Math.min(lat1, lat2));
  latRange.push(Math.max(lat1, lat2));

  let longRange = [];
  longRange.push(Math.min(long1, long2));
  longRange.push(Math.max(long1, long2));

  let searchRadius = req.body.radius;

  const grid = getGrid(
    latRange,
    longRange,
    searchRadius
  );

  const places = await traverse(grid, searchRadius);

  const { placesWithDetails } = places.reduce((res, place) => {
    if (!res.placeIds.includes(place.place_id)) {
      return {
        placeIds: res.placeIds.concat(place.place_id),
        placesWithDetails: res.placesWithDetails.concat(place),
      };
    }

    return res;
  }, { placeIds: [], placesWithDetails: [] });

  console.log(`Grid transversal complete...`);

  console.log(
    `discovered ${places.length} ${placeType}s, of which ${placesWithDetails.length} are unique`
  );

  writeToDB(placesWithDetails);
  res.redirect("/");
});

function writeToDB(placesWithDetails) {
  const db = new sqlite3.Database('restaurants.db');

  let check_query = "SELECT * FROM restaurants WHERE google_id = ?";
  let insert_query = `
  INSERT INTO restaurants (
    google_id, 
    name, 
    address, 
    google_types, 
    google_rating, 
    google_ratings_count,
    google_price_level,
    google_status,
    latitude, 
    longitude, 
    has_visited, 
    want_to_visit)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ;`;

  const chains = [
    "Triple O's",
    "White Spot",
    "Cactus Club Cafe",
    "JOEY",
    "Dairy Queen",
    "Sushi Garden",
    "Uncle Fatih's Pizza",
    "Fatburger",
    "Browns Socialhouse",
    "Pizza Hut",
    "Megabite Pizza",
    "Wendy's",
    "Tim Hortons",
    "Boston Pizza",
    "Subway",
    "Swiss Chalet",
    "Earls Kitchen + Bar",
    "McDonald's",
    "Booster Juice",
    "Domino's Pizza",
    "Quiznos",
    "Papa John's Pizza",
    "Church's Chicken",
    "Panago Pizza",
    "Pizza Pizza",
    "Freshii",
    "Pizza Garden",
    "A&W Canada",
    "KFC"
];

for (const p of placesWithDetails) {
  db.get(check_query, [p.place_id], (err, row) => {
    if (err) {
      return console.error(err.message);
    }
    if (!row) { // not in db, insert

      var want_visit = "maybe";
      for (const bad of chains) {
        if (bad.includes(p.name)) {
          want_visit = "no";
        }
      }

      db.run(
        insert_query,
        p.place_id,
        p.name,
        p.vicinity,
        p.types.toString(),
        p.rating,
        p.user_ratings_total,
        p.price_level,
        p.business_status,
        p.geometry.location.lat,
        p.geometry.location.lng,
        0,
        want_visit,
        (err,rows)=>{
          if (err) {
             throw err;
          }
        }
      );
    }
  });
  
}

}

async function getNearby(
  searchRadiusInMeters,
  places,
  latLongPoint,
  pagetoken
) {
  if (pagetoken) {
    await sleep(2000);
  }
  const response = await client
    .placesNearby({
      params: {
        key: process.env.GOOGLE_API_KEY,
        type: placeType,
        radius: searchRadiusInMeters,
        location: latLongPoint,
        pagetoken,
      },
    })
    .catch((e) => {
      console.log(e);
    });
  if (response.data.next_page_token) {
    return getNearby(
      searchRadiusInMeters,
      places.concat(response.data.results),
      latLongPoint,
      response.data.next_page_token
    );
  } else {
    return places.concat(response.data.results);
  }
}

async function getAllPlaces(latLongPoint, searchRadiusInMeters, grid) {
  console.log("getting places from: ", latLongPoint, " ", searchRadiusInMeters);
  const placesFromGoogle = await getNearby(
    searchRadiusInMeters,
    [],
    latLongPoint
  );
  if (placesFromGoogle.length === 60) {
    const subGrib = getGrid(
      [latLongPoint[0] - grid.latStep, latLongPoint[0] + grid.latStep],
      [latLongPoint[1] - grid.longStep, latLongPoint[1] + grid.longStep],
      searchRadiusInMeters / 4
    );
    const morePlaces = await traverse(subGrib, searchRadiusInMeters / 4);
    return morePlaces;
  }
  return placesFromGoogle;
}

async function traverse(grid, searchRadiusInMeters) {
  let places = [];
  console.log("grid steps: ", grid.steps.length);
  for (let i = 0; i < grid.steps.length; i++) {
    const gridSectionPlaces = await getAllPlaces(
      grid.steps[i],
      searchRadiusInMeters,
      grid
    );
    places = places.concat(gridSectionPlaces);
  }
  return places;
}

module.exports = router;
