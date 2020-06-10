const http = require('http');

const { methods } = require('../../constants');
const { pathnameMatchesRoute, getParamsFromPathname, getBody } = require('../../utils');


const shoppingItemsRouteHandler = async (req, res) => {
  const {method, pathname, knex} = req;

  if (method === methods.GET && pathnameMatchesRoute(pathname, '/api/shopping-items')) {
    console.log("list shopping-items");
    const shoppingItems  = await knex
      .select()
      .from('shopping_items');

    await res.write(JSON.stringify(shoppingItems));
    await res.end();
  }

  if (method === methods.GET && pathnameMatchesRoute(pathname, '/api/shopping-items/:id')) {
    console.log("get shopping-item");
    req.params = getParamsFromPathname(pathname, '/api/shopping-items/:id');
    const { id } = req.params;

    const shoppingItems = await knex
      .select()
      .from('shopping_items').where('id', id);
    console.log('shopping-items', shoppingItems);

    if (!shoppingItems.length) {
      res.statusCode = 404;
      return await res.end(http.STATUS_CODES[404]);
    }

    res.statusCode = 200;
    await res.end(JSON.stringify(shoppingItems[0]));
  }


  if (method === methods.PUT && pathnameMatchesRoute(pathname, '/api/shopping-items/:id')) {
    console.log("put shopping item");
    req.params = getParamsFromPathname(pathname, '/api/shopping-items/:id');
    const { id } = req.params;

    const items = await knex('shopping_items').select().where('id', id);
    if (!items[0]) {
      res.statusCode = 404;
      return await res.end();
    }
    const item = items[0];

    // current user can edit the item if he/she owns the list related to the item
    const lists = await knex('shopping_lists').select().where('id', item.shopping_list_id);
    if (lists[0].owner_id != req.user.id) {
      res.statusCode = 403;
      return await res.end();
    }

    const body = await getBody(req);

    await knex('shopping_items')
      .where('id', id)
      .update(body);

    res.statusCode = 200;
    res.end();
  }


  if (method === methods.POST && pathnameMatchesRoute(pathname, '/api/shopping-items')) {
    console.log("post shopping item");
    const body = await getBody(req);

    await knex('shopping_items').insert(body);

    res.statusCode = 200;
    await res.end();
  }


  if (method === methods.DELETE && pathnameMatchesRoute(pathname, '/api/shopping-items/:id')) {
    console.log("delete shopping item");
    req.params = getParamsFromPathname(pathname, '/api/shopping-items/:id');
    const { id } = req.params;

    const items = await knex('shopping_items').select().where('id', id);
    if (!items[0]) {
      res.statusCode = 404;
      return await res.end();
    }
    const item = items[0];

    // current user can delete the item if he/she owns the list related to the item
    const lists = await knex('shopping_lists').select().where('id', item.shopping_list_id);
    if (lists[0].owner_id != req.user.id) {
      res.statusCode = 403;
      return await res.end();
    }

    await knex('shopping_items')
      .where('id', id)
      .del();

    res.statusCode = 200;
    res.end();
  }
};

module.exports = shoppingItemsRouteHandler;