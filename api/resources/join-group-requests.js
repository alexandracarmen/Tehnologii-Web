const http = require('http');

const { methods } = require('../../constants');
const { pathnameMatchesRoute, getParamsFromPathname, getBody } = require('../../utils');


const joinGroupRequestRouteHandler = async (req, res) => {
  const {method, pathname, knex} = req;

  if (method === methods.GET && pathnameMatchesRoute(pathname, '/api/join-group-requests')) {
    console.log("list join-group-requests");
    const { query } = req;
    const { group_id } = query;

    const joinGroupRequests  = await knex
      .select()
      .from('join_group_requests')
      .where('id', group_id);

    await res.write(JSON.stringify(joinGroupRequests));
    await res.end();
  }


  if (method === methods.POST && pathnameMatchesRoute(pathname, '/api/join-group-requests')) {
    console.log("post join group request");
    const body = await getBody(req);
    body.requester_id = req.user.id;
    body.approved = false;

    await knex('join_group_requests').insert(body);

    res.statusCode = 200;
    await res.end();
  }


  if (method === methods.DELETE && pathnameMatchesRoute(pathname, '/api/join-group-requests/:id')) {
    console.log("delete join-group-requests");
    req.params = getParamsFromPathname(pathname, '/api/join-group-requests/:id');
    const { id } = req.params;

    const requests = await knex('join_group_requests').select().where('id', id);
    if (!requests[0]) {
      res.statusCode = 404;
      return await res.end();
    }
    const request = requests[0];

    // only the owner of the group can delete the request
    const groups = await knex('groups').select().where('id', request.group_id);
    if (groups[0].owner_id != req.user.id) {
      res.statusCode = 403;
      return await res.end();
    }

    await knex('join_group_requests')
      .where('id', id)
      .del();

    res.statusCode = 200;
    res.end();
  }
};

module.exports = joinGroupRequestRouteHandler;