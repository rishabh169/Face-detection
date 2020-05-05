const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const knex = require('knex');
const bcrypt = require('bcrypt-nodejs');

var db = knex({
  client: 'pg',
  connection: {
    connectionString : process.env.DATABASE_URL,
    ssl :  true,
  }
});



app.use(bodyParser.json());
app.use(cors());

app.get('/' , (req, res) =>{
	res.json('this is working!');
});

app.post('/signin', (req, res)=> {
	db.select('email','hash').from('login')
	.where('email', '=', req.body.email)
	.then(data => {
		const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
		if(isValid) {
			return db.select('*').from('users')
			.where('email', '=', req.body.email)
			.then(user => res.json(user[0]))
		}
		else{
			res.status(400).json('wrong credentials');
		}
	})
	.catch(e =>res.status(400).json('user not registered'));
})

//registeration 

app.post('/register' , (req, res)=> {
	const {name ,email, password} =req.body;
	const hash = bcrypt.hashSync(password);

	db.transaction(trx => {
		trx.insert({
			hash : hash,
			email : email
		})
		.into('login')
		.returning('email')
		.then(loginEmail => {
			return trx('users')
			.returning('*')
			.insert({
			email : loginEmail[0],
			name : name,
			joined : new Date()
			})
			.then(user => res.json(user[0]))
		})
		.then(trx.commit)
		.catch(trx.rollback);
	})
	.catch(error => res.status(400).json("not able to register try different name"));
	
});


//profile

app.get('/profile/:id', (req, res)=>{
	const {id} = req.params;
	db.select('*').from('users').where({id : id})
	.then(user =>{
		if(user.length){
			res.json(user[0])
		}
		else{
			res.status(400).json('Not Found')
		}
	})

	.catch(err=> res.status(404).json('Not Found'));
});	

//images 

app.put('/images', (req, res) =>{
	const {id} = req.body;
	db('users').where('id', '=', id)
	.increment('entries',1)
	.returning('entries')
	.then(entries =>{
		res.json(entries[0]);
	})
	.catch(err => res.status(400).json('unable to get entries'));
})

app.listen(process.env.PORT || 3000, (req, res)=>{
	console.log('this is working fine');
});