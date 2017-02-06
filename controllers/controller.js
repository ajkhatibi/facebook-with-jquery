var express = require('express');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var router = express.Router();
var db = require('../models');
var email = require('../mail/email');

router.get('/', function(req, res){
	res.redirect('/friend-book');
});

router.get('/friend-book', function(req, res){
	res.render('home', {noOne: req.flash('noUser')});
	
});

router.get('/friend-book/profile', function(req, res){
	db.users.findAll({
		where: {
			id: req.session.user.id
		},
		include: [{
			model: db.users, as: 'Friend' 
		}, {
			model: db.users, as: 'Sender'
		}]
	}).then(function(dbData) {
		var hbsObject = {
			userInfo: req.session.user,
			userFriend: dbData[0].Friend,
			userMsg: dbData[0].Sender
		}

		res.render('profile', hbsObject);
	});
});

router.post('/friend-book/profile', function(req, res){
	db.users.findAll({
		where: {
			id: req.body.profileID
		},
		include: [{
			model: db.users, as: 'Friend' 
		}, {
			model: db.users, as: 'Sender'
		}]

	}).then(function(data){

		var userData = {
			id: data[0].id,
			name: data[0].name,
			username: data[0].username,
			email: data[0].email,
			description: data[0].description,
			img: data[0].img
		};

		var userObj = {
			userInfo: userData,
			userFriend: data[0].Friend,
			userMsg: data[0].Sender
		}
		
		res.render('profile', userObj);
		
	});
});

router.get('/friend-book/login', function(req, res){
	var messages = {
		success: req.flash('success_msg'),
		request: req.flash('friendPerm')
	}
	
	res.render('login', messages);
});

router.get('/friend-book/register', function(req, res){
	res.render('register', {existsMsg: req.flash('Exists')});
});


router.get('/friend-book/search/all', function(req, res){

	db.users.findAll({}).then(function(data){
		var allUsers = {
				people: data
			}

		res.render('searchedUser', allUsers)
	});
});

router.post('/friend-book/search/user', function(req, res){
	console.log('req.body', req.body);
	db.users.findAll({
		where: {
			name: req.body.name
		}
	}).then(function(data){
		if(data){
			var userResults = {
				people: data
			}
			res.render('searchedUser', userResults);			
		}else{
			req.flash('noUser', 'No one by that name.');
			res.redirect('/friend-book');	
		}
		
	});
});

router.post('/friend-book/register', function(req, res){

	console.log(req.body);

	var name = req.body.name;
	var username = req.body.username;
	var email = req.body.email;
	var password = req.body.password;
	var password2 = req.body.password2;
	var description = req.body.description


	req.checkBody('name', 'Must type in name.').notEmpty();
	req.checkBody('username', 'Must type in Username.').notEmpty();
	req.checkBody('email', 'Must type in email.').notEmpty();
	req.checkBody('email', 'Invalid Email').isEmail();
	req.checkBody('password', 'Must type in password.').notEmpty();
	req.checkBody('password2', 'Passwords do not match.').equals(req.body.password);
	req.checkBody('description', 'Must type in something about yourself.').notEmpty();


	var errors = req.validationErrors();


	if(errors){
		res.render('register', {
			errors: errors
		});
	}else{

		db.users.findOne({
			where: {
				username: username
			}
		}).then(function(data){
			if(data){
				req.flash('Exists', 'Username already exists. Choose another.');
				res.redirect('/friend-book/register');
			}else{

				db.users.create(req.body).then(function(data){

				req.flash('success_msg', 'Success! Welcome to Book Face! Please login.');

					res.redirect('/friend-book/login')

				});
			}
		})
	}
});




router.post('/friend-book/login',
  passport.authenticate('local', 
  	{ 
  		successRedirect: '/friend-book',
        failureRedirect: '/friend-book/login',
        failureFlash: 'Invalid username and password. Self destructing in 5 seconds!',
        successFlash: 'You have successfully logged in. Welcome to Book Face!' 
    })
  );

router.get('/friend-book/logout', function(req, res){
	req.logOut();
	console.log('req.session in get method', req.session);
	console.log('req.session.user in get method', req.session.user);
	req.session.destroy(function(err){
		res.redirect('/friend-book/login');
		
	});
});

router.post('/friend-book/requests', function(req, res) {
	console.log('post request');

	console.log('friendID', req.body.FriendID);

	console.log('friendID', req.body.FriendID);

	if(req.session.user) {
		db.Friends.create({
			status: "friends",
			userId: req.session.user.id,
			FriendId: req.body.FriendID
		}).then(function(data){

			var toEmail = req.body.friendReqEmail;
			var toEmailName = req.session.user.name;

			email.send(toEmail, toEmailName, function(){
					
				res.redirect('/friend-book/profile');
			});
		});

	}else{

		req.flash('friendPerm', 'Please login to add friends.');
		res.redirect('/friend-book/login');
	}
});

router.get('/friend-book/all', function(req, res){

  db.events.findAll({

	where: {
		userId: req.session.user.id
	}
  })
  .then(function(post) {
    res.send(post)
  });
});

router.post('/friend-book/home', function(req, res){
	console.log(req.body.post)

	db.events.create({
		userId: req.session.user.id,
    	body: req.body.post
  	})
    // pass the result of our call
  	.then(function(post) {
      // log the result to our terminal/bash window
    console.log('I AM POSTING', post);
      // redirect
    res.end();
  });
		
	
});

module.exports = router;