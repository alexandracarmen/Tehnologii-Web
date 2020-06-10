const http = require('http');

const { methods } = require('../../constants');
const { pathnameMatchesRoute, getParamsFromPathname, getBody, generateHashPassword, applyPagination } = require('../../utils');


const usersRouteHandler = async (req, res) => {
  const {method, pathname, knex} = req;

  if (method === methods.GET && pathnameMatchesRoute(pathname, '/api/users')) {
    console.log("list users");

    const sqlQuery = knex
      .select('id', 'first_name', 'last_name', 'email', 'active')
      .from('users');

    applyPagination(req, sqlQuery);

    const users  = await sqlQuery;

    await res.write(JSON.stringify(users));
    await res.end();
  }

  if (method === methods.GET && pathnameMatchesRoute(pathname, '/api/users/:id')) {
    console.log("get user");
    req.params = getParamsFromPathname(pathname, '/api/users/:id');
    const { id } = req.params;

    const users = await knex
      .select('id', 'first_name', 'last_name', 'email', 'favourite_recipe_id', 'active')
      .from('users').where('id', id);
    console.log('users', users);

    if (!users.length) {
      res.statusCode = 404;
      return await res.end(http.STATUS_CODES[404]);
    }

    res.statusCode = 200;
    await res.end(JSON.stringify(users[0]));
  }


  if (method === methods.PUT && pathnameMatchesRoute(pathname, '/api/users/:id')) {
    req.params = getParamsFromPathname(pathname, '/api/users/:id');
    const { id } = req.params;
    const body = await getBody(req);

    // activate  or deactivate a user only if the current user is an admin
    if (Object.keys(body).length === 1 && body.active !== undefined && req.user.type === "Admin" && req.user.id != id) {
      await knex('users').where('id', id).update({active: body.active});
      res.statusCode = 200;
      return await res.end();
    }

    delete body.active;

    // update can be made only if the current user is the same as targeted user
    if (req.user.id == id) {
      // changing the email
      if (body.email) {
        const usersWithThisEmail = await knex.from('users').select().where('email', body.email);
        if (usersWithThisEmail.length) {
          res.statusCode = 422;
          return await res.end("Email is already used");
        }
      }

      // changing the password
      body.password = await generateHashPassword(body.password);

      await knex('users')
        .where('id', id)
        .update(body);

      res.statusCode = 200;
      return await res.end();
    }

    res.statusCode = 403;
    return await res.end();
  }
};

module.exports = usersRouteHandler;