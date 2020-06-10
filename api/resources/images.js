const { methods } = require('../../constants');
const { pathnameMatchesRoute, getParamsFromPathname, unlinkPromisified} = require('../../utils');


const imagesRouteHandler = async (req, res) => {
  const {method, pathname, knex} = req;

  if (method === methods.DELETE && pathnameMatchesRoute(pathname, '/api/images/:id')) {
    req.params = getParamsFromPathname(pathname, '/api/aliments/:id');
    const { id } = req.params;

    const images = await knex
      .select()
      .from('images').where('id', id);

    await unlinkPromisified(`static-files/${images[0].name}`);
    await knex('images').where('id', images[0].id).del();

    res.statusCode = 200;
    await res.end();
  }
};

module.exports = imagesRouteHandler;