const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const http = require('http');
const multer = require('multer');

const usersRouteHandler = require('./resources/users');
const groupsRouteHandler = require('./resources/groups');
const alimentsRouteHandler = require('./resources/aliments');
const recipesRouteHandler = require('./resources/recipes');
const restaurantsRouteHandler = require('./resources/restaurants');
const shoppingItemsRouteHandler = require('./resources/shopping-items');
const shoppingListsRouteHandler = require('./resources/shopping-lists');
const imagesRouteHandler = require('./resources/images');
const joinGroupRequestRouteHandler = require('./resources/join-group-requests');


const { methods } = require('../constants');
const { tokenSecret } = require('../config');
const { getBody, generateHashPassword, pathnameMatchesRoute, getParamsFromPathname, applyPagination } = require('../utils');
const { authenticate } = require('./concerns/authentication');
const sendInvite = require('./concerns/mail');


const apiRouteHandler = async (req, res) => {
  const { pathname, method } = req;

  if (pathname.indexOf('/api/users') === 0) {
    await authenticate(req, res);
    await usersRouteHandler(req, res);
  }

  if (pathname.indexOf('/api/recipes') === 0) {
    await authenticate(req, res);
    console.log("recipes");
    await recipesRouteHandler(req, res);
  }

  if (pathname.indexOf('/api/images') === 0) {
    await authenticate(req, res);
    console.log("recipes");
    await imagesRouteHandler(req, res);
  }

  if (pathname.indexOf('/api/aliments') === 0) {
    await authenticate(req, res);
    console.log("aliments");
    await alimentsRouteHandler(req, res);
  }


  if (method === methods.GET && pathnameMatchesRoute(pathname, '/api/search/group-recipes/:id')) {
    await authenticate(req, res);
    req.params = getParamsFromPathname(pathname, '/api/search/group-recipes/:id');
    const { knex } = req;
    const { id } = req.params;

    const sqlQuery = knex.from("recipes")
      .join("recipes_groups_pivot", "recipes_groups_pivot.recipe_id", "=", "recipes.id")
      .select()
      .where("recipes_groups_pivot.group_id", id);

    applyPagination(req, sqlQuery);
    const recipes = await sqlQuery;

    for (const recipe of recipes) {
      const images = await knex.from('images').select().where('recipe_id', recipe.id).limit(1);
      recipe.firstImage = images[0];
    }

    res.statusCode = 200;
    return await res.end(JSON.stringify(recipes));
  }


  if (method === methods.GET && pathnameMatchesRoute(pathname, '/api/search/:itemType')) {
    await authenticate(req, res);
    req.params = getParamsFromPathname(pathname, '/api/search/:itemType');
    const { itemType } = req.params;
    const { knex, query } = req;
    const { page, perPage, ...filters } = query;

    // construct filters with AND between them
    const sqlQuery =  knex.from(itemType)
      .select();
    for (const columnName of Object.keys(filters)) {
      const filter = JSON.parse(filters[columnName]);
      const operator = filter.filterType === "text" ? "ilike" : "=";
      const value = filter.filterType === "text" ? `%${filter.value}%` : filter.value;

      sqlQuery.andWhere(columnName, operator, value);
    }
    applyPagination(req, sqlQuery);

    const items = await sqlQuery;

    res.statusCode = 200;
    return await res.end(JSON.stringify(items));
  }

  if (method === methods.POST && pathnameMatchesRoute(pathname, '/api/add-recipe-group')) {
    console.log("post add-recipe-group");
    await authenticate(req, res);
    const body = await getBody(req);
    const { knex } = req;

    await knex("recipes_groups_pivot").insert(body);

    res.statusCode = 200;
    return await res.end();
  }


  if (pathname.indexOf('/api/groups') === 0) {
    await authenticate(req, res);
    console.log("groups");
    await groupsRouteHandler(req, res);
  }

  if (pathname.indexOf('/api/shopping-lists') === 0) {
    await authenticate(req, res);
    console.log("shopping-lists");
    await shoppingListsRouteHandler(req, res);
  }

  if (pathname.indexOf('/api/shopping-items') === 0) {
    await authenticate(req, res);
    console.log("shopping-items");
    await shoppingItemsRouteHandler(req, res);
  }

  if (pathname.indexOf('/api/restaurants') === 0) {
    await authenticate(req, res);
    console.log("restaurants");
    await restaurantsRouteHandler(req, res);
  }

  if (pathname.indexOf('/api/join-group-requests') === 0) {
    await authenticate(req, res);
    console.log("join-group-requests");
    await joinGroupRequestRouteHandler(req, res);
  }

  if (method === methods.POST && pathname === '/api/auth/login') {
    console.log('login');
    const { knex } = req;
    const body = await getBody(req);
    req.body = body;
    console.log('req.body', req.body);
    console.log(1);

    passport.authenticate('local', {session: false}, (err, user, info) => {

      if(err || !user) {
        res.statusCode = 401;
        return res.end('Email or password not correct');
      }

      console.log("1");

      req.login(user, {session: false}, async (err) => {
        if (err) {
          res.statusCode = 500;
          return res.end(http.STATUS_CODES[500]);
        }

        const token = jwt.sign({id: user.id, email: user.email}, tokenSecret, {expiresIn: '1d'});
        res.statusCode = 200;
        res.end(JSON.stringify({user, token}));
      });
    })(req, res);
  }


  if (method === methods.POST && pathname === '/api/auth/signup') {
    const { knex } = req;
    const body = await getBody(req);

    const usersWithThisEmail = await knex.from('users').select().where('email', body.email);
    if (usersWithThisEmail.length) {
      res.statusCode = 500;
      return await res.end("Email is already used");
    }

    body.type = "User";
    body.password = await generateHashPassword(body.password);
    let dbObj =

    await knex('users').insert(body);
    res.statusCode = 200;
    await res.end();
  }


  if (method === methods.POST && pathname === '/api/invite-user') {
    console.log("invite-user");
    await authenticate(req, res);
    console.log("invite-user");
    const body = await getBody(req);
    const { knex } = req;
    const { groupId, email } = body;

    const usersWithEmail = await knex('users').select().where('email', email);
    if (!usersWithEmail[0]) {
      res.statusCode = 500;
      return await res.end();
    }
    const invitedUser = usersWithEmail[0];
    const groups = await knex.from('groups').select().where('id', groupId);

    await knex('join_group_requests').insert({requester_id: invitedUser.id, group_id: groups[0], approved: true});

    sendInvite(email, `http://localhost:8081/accept-group/${groupId}`, groups[0].name);

    res.statusCode = 200;
    await res.end();
  }

  if (method === methods.POST && pathname === '/api/add-user-group') {
    await authenticate(req, res);
    const { knex } = req;
    const body = await getBody(req);

    const groups = await knex('groups').select().where('id', body.group_id);

    if (groups[0].owner_id == req.user.id) {
      await knex.transaction(async t => {
        // owner of group accepts join group request
        await t('users_groups_pivot').insert({
          user_id: body.requester_id,
          group_id: body.group_id
        });

        // remove the join group request
        await t('join_group_requests').where('group_id', body.group_id).andWhere('requester_id', body.requester_id).del();

        res.statusCode = 200;
        return await res.end();
      });
    } else {
      await knex.transaction(async t => {
        // if current user receives an email with an invitation (exists a join group request approved)
        const joinGroupRequests = await knex('join_group_requests').select()
          .where('group_id', body.group_id)
          .andWhere('requester_id', req.user.id)
          .andWhere('approved', true);
        if (!joinGroupRequests[0]) {
          res.statusCode = 403;
          return await res.end();
        }

        await t('users_groups_pivot').insert({
          user_id: req.user.id,
          group_id: body.group_id
        });

        // remove the join group request
        await t('join_group_requests').where('group_id', body.group_id).andWhere('requester_id', req.user.id).del();

        res.statusCode = 200;
        return await res.end();
      });
    }
  }
};


module.exports = apiRouteHandler;