const http = require('http');

const { methods } = require('../../constants');
const { pathnameMatchesRoute, getParamsFromPathname, getBody, applyPagination } = require('../../utils');


const shoppingListsRouteHandler = async (req, res) => {
  const {method, pathname, knex} = req;

  if (method === methods.GET && pathnameMatchesRoute(pathname, '/api/shopping-lists')) {
    console.log("list shopping-lists");

    const sqlQuery = knex
      .select()
      .from('shopping_lists').orderBy('id', 'asc');

    applyPagination(req, sqlQuery);

    const shoppingLists  = await sqlQuery;

    await res.write(JSON.stringify(shoppingLists));
    await res.end();
  }

  if (method === methods.GET && pathnameMatchesRoute(pathname, '/api/shopping-lists/:id')) {
    console.log("get shopping-list");
    req.params = getParamsFromPathname(pathname, '/api/shopping-lists/:id');
    const { id } = req.params;

    const shoppingLists = await knex
      .select()
      .from('shopping_lists').where('id', id);

    console.log('shopping-lists', shoppingLists);

    if (!shoppingLists.length) {
      res.statusCode = 404;
      return await res.end();
    }

    const shoppingItems = await knex.from('shopping_items')
      .join('aliments', 'aliments.id', '=', 'shopping_items.aliment_id')
      .select().where('shopping_list_id', id);

    const shoppingList = shoppingLists[0];
    shoppingList.shoppingItems = shoppingItems;

    res.statusCode = 200;
    await res.end(JSON.stringify(shoppingLists[0]));
  }


  if (method === methods.PUT && pathnameMatchesRoute(pathname, '/api/shopping-lists/:id')) {
    console.log("put shopping list");
    req.params = getParamsFromPathname(pathname, '/api/shopping-lists/:id');
    const { id } = req.params;

    const lists = await knex('shopping_lists').select().where('id', id);
    if (!lists[0]) {
      res.statusCode = 404;
      return await res.end();
    }
    const list = lists[0];
    if (list.owner_id != req.user.id) {
      res.statusCode = 403;
      return await res.end();
    }

    const body = await getBody(req);

    console.log('body', body);

    await knex('shopping_lists')
      .where('id', id)
      .update(body);

    res.statusCode = 200;
    res.end();
  }


  if (method === methods.POST && pathnameMatchesRoute(pathname, '/api/shopping-lists')) {
    console.log("post shopping list");
    const body = await getBody(req);

    // the owner is the current user
    body.owner_id = req.user.id;

    await knex('shopping_lists').insert(body);

    res.statusCode = 200;
    await res.end();
  }


  if (method === methods.DELETE && pathnameMatchesRoute(pathname, '/api/shopping-lists/:id')) {
    console.log("delete shopping list");
    req.params = getParamsFromPathname(pathname, '/api/shopping-lists/:id');
    const {id} = req.params;

    const lists = await knex('shopping_lists').select().where('id', id);
    if (!lists[0]) {
      res.statusCode = 404;
      return await res.end();
    }
    const list = lists[0];
    if (list.owner_id != req.user.id) {
      res.statusCode = 403;
      return await res.end();
    }

    await knex('recipes').where('id', id).del();

    res.statusCode = 200;
    return await res.end();
  }
};

module.exports = shoppingListsRouteHandler;