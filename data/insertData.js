const knex = require('knex')({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : 'postgres',
    password: 'postgres',
    //password : '=bm#E3UV9@Tj-tKn',
    database : 'app_tw'
  }
});

const aliments = require('./aliments');

const insertAliments = () => {
  for (const aliment of aliments) {
    knex('aliments').insert(aliment)
      .then()
      .catch((err) => {console.error(err)});
  }
};

 insertAliments();