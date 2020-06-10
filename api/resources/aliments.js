const http = require('http');

const { methods } = require('../../constants');
const { pathnameMatchesRoute, getParamsFromPathname, getBody, applyPagination } = require('../../utils');

const alimentsRouteHandler = async (req, res) => {
  const {method, pathname, knex} = req;

  if (method === methods.GET && pathnameMatchesRoute(pathname, '/api/aliments')) {
    console.log("list aliments");
    const sqlQuery = knex.select().from('aliments');
    applyPagination(req, sqlQuery);

    const aliments  = await sqlQuery;
    await res.write(JSON.stringify(aliments));
    await res.end();
  }

  if (method === methods.GET && pathnameMatchesRoute(pathname, '/api/aliments/:id')) {
    console.log("get aliment");
    req.params = getParamsFromPathname(pathname, '/api/aliments/:id');
    const { id } = req.params;

    const aliments = await knex
      .select()
      .from('aliments').where('id', id);
    console.log('aliments', aliments);

    if (!aliments.length) {
      res.statusCode = 404;
      return await res.end(http.STATUS_CODES[404]);
    }

    res.statusCode = 200;
    await res.end(JSON.stringify(aliments[0]));
  }


  if (method === methods.PUT && pathnameMatchesRoute(pathname, '/api/aliments/:id')) {
    console.log("put aliment");
    req.params = getParamsFromPathname(pathname, '/api/aliments/:id');
    const { id } = req.params;

    // only admins can edit aliment
    if (req.user.type !== 'Admin') {
      res.statusCode = 403;
      return await res.end();
    }

    const body = await getBody(req);

    console.log('body', body);

    await knex('aliments')
      .where('id', id)
      .update(body);

    res.statusCode = 200;
    res.end();
  }


  if (method === methods.POST && pathnameMatchesRoute(pathname, '/api/aliments')) {
    console.log("post aliment");
    const body = await getBody(req);

    await knex('aliments').insert(body);

    res.statusCode = 200;
    await res.end();
  }


  if (method === methods.DELETE && pathnameMatchesRoute(pathname, '/api/aliments/:id')) {
    console.log("delete aliment");
    req.params = getParamsFromPathname(pathname, '/api/aliments/:id');
    const { id } = req.params;

    // only admins can edit aliment
    if (req.user.type !== 'Admin') {
      res.statusCode = 403;
      return await res.end();
    }

    const body = await getBody(req);

    console.log('body', body);

    await knex('aliments')
      .where('id', id)
      .del();

    res.statusCode = 200;
    res.end();
  }

};

module.exports = alimentsRouteHandler;