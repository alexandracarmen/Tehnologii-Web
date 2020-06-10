const http = require('http');

const { methods } = require('../../constants');
const { pathnameMatchesRoute, getParamsFromPathname, getBody, applyPagination } = require('../../utils');


const groupsRouteHandler = async (req, res) => {
  const {method, pathname, knex} = req;

  if (method === methods.GET && pathnameMatchesRoute(pathname, '/api/groups')) {
    console.log("list groups");

    const sqlQuery =  knex
      .select()
      .from('groups');

    applyPagination(req, sqlQuery);

    const groups  = await sqlQuery;
    await res.write(JSON.stringify(groups));
    return await res.end();
  }

  if (method === methods.GET && pathnameMatchesRoute(pathname, '/api/groups/:id')) {
    console.log("get recipe");
    req.params = getParamsFromPathname(pathname, '/api/groups/:id');
    const { id } = req.params;

    const groups = await knex
      .select()
      .from('groups').where('id', id);

    if (!groups.length) {
      res.statusCode = 404;
      return await res.end(http.STATUS_CODES[404]);
    }

    res.statusCode = 200;
    return await res.end(JSON.stringify(groups[0]));
  }


  if (method === methods.PUT && pathnameMatchesRoute(pathname, '/api/groups/:id')) {
    console.log("put group");
    req.params = getParamsFromPathname(pathname, '/api/groups/:id');
    const { id } = req.params;
    const body = await getBody(req);

    console.log('body', body);

    const groups = await knex('groups').select().where("id", id);

    if (!groups[0]) {
      res.statusCode = 404;
      return await res.end();
    }
    const group = groups[0];

    // only the owner of the group can edit the group
    if (group.owner_id != req.user.id) {
      res.statusCode = 403;
      return await res.end();
    }

    await knex('groups')
      .where('id', id)
      .update(body);

    res.statusCode = 200;
    return await res.end();
  }


  if (method === methods.POST && pathnameMatchesRoute(pathname, '/api/groups')) {
    console.log("post group");
    const body = await getBody(req);

    body.owner_id = req.user.id;

    await knex('groups').insert(body);

    res.statusCode = 200;
    return await res.end();
  }

  if (method === methods.DELETE && pathnameMatchesRoute(pathname, '/api/groups/:id')) {
    console.log("delete group");
    req.params = getParamsFromPathname(pathname, '/api/groups/:id');
    const { id } = req.params;
    console.log(req.user);
    const groups = await knex('groups').select().where("id", id);
    if (!groups[0]) {
      res.statusCode = 404;
      return await res.end();
    }
    const group = groups[0];
    // only the owner of the group can delete the group
    console.log(group);
    if (group.owner_id != req.user.id) {
      res.statusCode = 403;
      return await res.end();
    }

    await knex('groups').where("id", id).del();

    res.statusCode = 200;
    return await res.end();
  }
};

module.exports = groupsRouteHandler;