const http = require('http');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');

const { methods } = require('../../constants');
const { pathnameMatchesRoute, getParamsFromPathname, getBody, unlinkPromisified, applyPagination } = require('../../utils');

const uploader = multer({
  storage:  multer.diskStorage({
    destination: 'static-files',
    filename(req, file, cb) {
      cb(null,
        `${crypto.randomBytes(7).toString('hex')}_${file.originalname.substring(file.originalname.length - 6)}`);
    }
  }),
  limits: {
    files: 10,
    fileSize : 1024 * 1024 * 5
  }
});


const recipesRouteHandler = async (req, res) => {
  const {method, pathname, knex} = req;

  if (method === methods.GET && pathnameMatchesRoute(pathname, '/api/recipes')) {
    console.log("list recipes");

    const sqlQuery = knex
      .select()
      .from('recipes');

    applyPagination(req, sqlQuery);

    const recipes  = await sqlQuery;

    for (const recipe of recipes) {
      const images = await knex.from('images').select().where('recipe_id', recipe.id).limit(1);
      recipe.firstImage = images[0];
    }

    await res.write(JSON.stringify(recipes));
    await res.end();
  }

  if (method === methods.GET && pathnameMatchesRoute(pathname, '/api/recipes/:id')) {
    console.log("get recipe");
    req.params = getParamsFromPathname(pathname, '/api/recipes/:id');
    const { id } = req.params;

    const recipes = await knex
      .select()
      .from('recipes').where('id', id);

    if (!recipes.length) {
      res.statusCode = 404;
      return await res.end(http.STATUS_CODES[404]);
    }

    const recipe = recipes[0];
    const images = await knex.from('images').select().where('recipe_id', recipe.id);
    recipe.images = images;

    res.statusCode = 200;
    await res.end(JSON.stringify(recipe));
  }


  if (method === methods.PUT && pathnameMatchesRoute(pathname, '/api/recipes/:id')) {
    console.log("put recipe");
    req.params = getParamsFromPathname(pathname, '/api/recipes/:id');
    const { id } = req.params;
    const { knex } = req;

    const recipes = await knex.from('recipes').select().where('id', id);
    if (!recipes[0]) {
      res.statusCode = 404;
      return await res.end();
    }
    const recipe = recipes[0];

    // cannot edit recipe if the user is not the owner
    if (recipe.owner_id != req.user.id) {
      res.statusCode = 403;
      return await res.end();
    }

    await uploader.array('picture', 10)(req, res, async (err) => {
      const { files, body } = req;

      try {
        await knex.transaction(async t => {

          for (const file of req.files) {
            await t('images').insert({
              name: file.filename,
              recipe_id: recipe.id
            });
          }
        });

        res.statusCode = 200;
        await res.end();

      } catch (err) {
        console.error(err);

        // remove uploaded files
        for (const file of req.files) {
          try {
            await unlinkPromisified(`static-files/${file.filename}`);
          } catch (e) {}
        }

        res.statusCode = 500;
        await res.end();
      }
    });
  }


  if (method === methods.POST && pathnameMatchesRoute(pathname, '/api/recipes')) {
    console.log("post recipe");
    const { knex } = req;

    await uploader.array('picture', 10)(req, res, async (err) => {
      const { files, body } = req;
      console.log('body', body);
      if (!req.files.length) {
        res.statusCode = 422;
        return await res.end("Missing pictures for the recipe");
      }

      if (body.private === undefined) {
        body.private = false;
      }

      console.log(req.user);
      body.owner_id = req.user.id;
      try {
        await knex.transaction(async t => {
          await t('recipes').insert(body);
          const recipes = await t.from('recipes').select().orderBy('id', 'desc').limit(1);
          const createdRecipe = recipes[0];
          console.log('files', req.files);
          for (const file of req.files) {
            await t('images').insert({
              name: file.filename,
              recipe_id: createdRecipe.id
            });
          }
        });

        res.statusCode = 200;
        await res.end();

      } catch (err) {
        console.error(err);

        // remove uploaded files
        for (const file of req.files) {
          try {
            await unlinkPromisified(`static-files/${file.filename}`);
          } catch (e) {}
        }

        res.statusCode = 500;
        await res.end();
      }
    });
  }


  if (method === methods.DELETE && pathnameMatchesRoute(pathname, '/api/recipes/:id')) {
    req.params = getParamsFromPathname(pathname, '/api/recipes/:id');
    const { id } = req.params;
    const { knex } = req;

    const recipes = await knex('recipes').select().where('id', id);
    if (!recipes[0]) {
      res.statusCode = 404;
      return await res.end();
    }

    const recipe = recipes[0];
    // cannot delete recipe if the current user is not the owner
    if (recipe.owner_id != req.user.id) {
      res.statusCode = 403;
      return await res.end();
    }

    await knex.transaction( async t => {
      const recipeImages = await t.from('images').select().where('recipe_id', id);
      for (const image of recipeImages) {
        try {
          await unlinkPromisified(`static-files/${image.name}`);
        } catch (e) {}

        await t('images').where('id', image.id).del();
      }

      await t('recipes').where('id', id).del();
    });

    res.statusCode = 200;
    await res.end();
  }
};

module.exports = recipesRouteHandler;