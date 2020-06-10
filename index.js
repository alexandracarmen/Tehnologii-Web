const http = require('http');
const url = require('url');


const apiRouteHandler = require('./api');
const { freeFiles } = require('./static-routes');
const { getStaticFile } = require('./utils');
const { authenticate } = require('./api/concerns/authentication');

require('./api/concerns/authentication');

const server = http.createServer().listen('8081');

console.log("Server listening on port 8081");

const knex = require('knex')({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : 'postgres',
    password : 'postgres',
    database : 'app_tw'
  }
});


server.on('request', async (req, res) => {
  try {
    const urlParts = url.parse(req.url, true);
    const { pathname } = urlParts;

    req.query = urlParts.query;
    req.pathname = urlParts.pathname;
    req.knex = knex;

    if (pathname.indexOf('/api') === 0) {
      await apiRouteHandler(req, res);

    } else if (pathname.indexOf('/') === 0) {
      console.log('pathname', pathname);
      if (freeFiles.includes(pathname)) {
        console.log('free');
        await getStaticFile(res, pathname);
      } else {
        console.log("forbidden");
        // await authenticate(req, res);
        await getStaticFile(res, pathname);
      }
    }

  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    console.log("yes");
    await res.end(http.STATUS_CODES[500]);
  }
});