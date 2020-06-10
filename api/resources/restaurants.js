const http = require('http');

const { methods } = require('../../constants');
const { pathnameMatchesRoute, getParamsFromPathname, getBody } = require('../../utils');


const restaurantsRouteHandler = async (req, res) => {
  const {method, pathname, knex} = req;

  if (method === methods.GET && pathnameMatchesRoute(pathname, '/api/restaurants')) {
    console.log("list restaurants");
    const restaurants  = await knex
      .select()
      .from('restaurants');

    await res.write(JSON.stringify(restaurants));
    await res.end();
  }

  if (method === methods.GET && pathnameMatchesRoute(pathname, '/api/restaurants/:id')) {
    console.log("get recipe");
    req.params = getParamsFromPathname(pathname, '/api/restaurants/:id');
    const { id } = req.params;

    const restaurants = await knex
      .select()
      .from('restaurants').where('id', id);
    console.log('restaurants', restaurants);

    if (!restaurants.length) {
      res.statusCode = 404;
      return await res.end(http.STATUS_CODES[404]);
    }

    res.statusCode = 200;
    await res.end(JSON.stringify(restaurants[0]));
  }


  if (method === methods.PUT && pathnameMatchesRoute(pathname, '/api/restaurants/:id')) {
    console.log("put recipe");
    req.params = getParamsFromPathname(pathname, '/api/restaurants/:id');
    const { id } = req.params;
    const body = await getBody(req);

    console.log('body', body);

    await knex('restaurants')
      .where('id', id)
      .update(body);

    res.statusCode = 200;
    res.end();
  }


  if (method === methods.POST && pathnameMatchesRoute(pathname, '/api/restaurants')) {
    console.log("post user");
    const body = await getBody(req);

    await knex('restaurants').insert(body);

    res.statusCode = 200;
    await res.end();
  }
};

module.exports = restaurantsRouteHandler;