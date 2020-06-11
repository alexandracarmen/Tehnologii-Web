const bcrypt = require('bcrypt-nodejs');
const fs = require('fs');

const { mimeTypes } = require('./static-routes');

const pathnameMatchesRoute = (pathname, route) => {
  const pathnameItems = pathname.split('/');
  const routeItems = route.split('/');

  if (pathnameItems.length !== routeItems.length) {
    return false;
  }

  for (let i = 0; i < routeItems.length; i++) {
    if (routeItems[i].indexOf(':') === -1) {
      if (pathnameItems[i] !== routeItems[i]) {
        return false;
      }
    } else {
      // in case of having /:id in route
      if (routeItems[i] === undefined || routeItems[i] === null) {
        return false;
      }
    }
  }

  return true;
};


const getParamsFromPathname = (pathname, route) => {
  const pathnameItems = pathname.split('/');
  const routeItems = route.split('/');
  const params = {};

  for (let i = 0; i < routeItems.length; i++) {
    if (routeItems[i].indexOf(':') !== -1) {
      params[routeItems[i].split(':')[1]] = pathnameItems[i];
    }
  }

  return params;
};


const getBody = async (req) => {
  let dataFromClientRaw = "";

  req.on('data', chunk => {
    dataFromClientRaw += chunk;
  });

  return new Promise((resolve, reject) => {
    req.on('end', () => {
      const dataFromClientJSON = JSON.parse(dataFromClientRaw);
      resolve(dataFromClientJSON);
    });
  });
};


const hashPassword = (password, done) => {
  bcrypt.genSalt(10, function(err, salt) {
    if(err) {
      return done(err);
    }

    bcrypt.hash(password, salt, null, function(err, hash) {
      if(err) {
        return done(err);
      }

      done(null, hash);
    });
  });
};


const generateHashPassword = (password) => {
  return new Promise((resolve, reject) => {
    hashPassword(password, (err, hash) => {
      if(err) {
        reject(err);
      } else {
        resolve(hash);
      }
    })
  })
};


const getStaticFile = async (res, pathname) => {
  pathname = decodeURI(pathname);
  const extension = getExtensionFromRequestPathname(pathname);
  if (extension) {
    const mimeType = mimeTypes.filter(item => item.extension === extension.toLowerCase())[0];
    const readStream = fs.createReadStream(`./src/static-files/${mimeType.folder}${pathname}`);

    readStream.on('error', (err) => {
      console.error(err);
    });
    res.setHeader('Content-Type', mimeType.mimeType);
    await readStream.pipe(res);
  } else {
    // pathname ex : /accept-group/3
    const fileName = pathname.split('/')[1];
    const readStream = fs.createReadStream(`./src/static-files/html/${fileName}.html`);

    readStream.on('error', (err) => {
      console.error('here',err);
    });
    res.setHeader('Content-Type', 'text/html');
    await readStream.pipe(res);
  }
};


const getExtensionFromRequestPathname = (pathname) => {
  return pathname.split('.')[1];
};

const unlinkPromisified = (path) => {
  return new Promise((success, reject) => {
    fs.unlink(path, async (err) => {
      if (err) {
        reject(err);
      }
      success();
    });
  });
};


const applyPagination = (req, sqlQuery) => {
  const { page, perPage } = req.query;

  if (page) {
    let numberOfAliments = perPage || 10;
    sqlQuery.limit(numberOfAliments).offset((page - 1) * numberOfAliments);
  }

  return sqlQuery;
};


module.exports = {
  pathnameMatchesRoute,
  getParamsFromPathname,
  getBody,
  generateHashPassword,
  getStaticFile,
  getExtensionFromRequestPathname,
  unlinkPromisified,
  applyPagination
};