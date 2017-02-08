var express = require('express');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var router = express.Router();
var db = require('../models');
var email = require('../mail/email');
var aws = require("aws-sdk");

var S3_BUCKET = process.env.S3_BUCKET;

router.get('/', function(req, res){
	res.redirect('/friend-book');
});

router.get('/friend-book', function(req, res){
	res.render('home', {noOne: req.flash('noUser')});
	// res.render('register', {existsMsg: req.flash('Exists')});
});

router.get('/friend-book/profile', function(req, res){
	db.users.findAll({
		where: {
			id: req.session.user.id
		},
		include: [{
			model: db.users, as: 'Friend' //find all users associated as friends
		}, {
			model: db.users, as: 'Sender'
		}]
	}).then(function(dbData) {
		var hbsObject = {
			userInfo: req.session.user,
			userFriend: dbData[0].Friend,
			userMsg: dbData[0].Sender
		}
			console.log(dbData);

		//res.json(hbsObject);
		res.render('profile', hbsObject);
	});
});

router.post('/friend-book/profile', function(req, res){
	db.users.findAll({
		where: {
			id: req.body.profileID
		},
		include: [{
			model: db.users, as: 'Friend' //find all users associated as friends
		}, {
			model: db.users, as: 'Sender'
		}]

	}).then(function(data){
		console.log("profile data", data);

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
	// req.flash('friendPerm', 'Please login to add friends.');
	res.render('login', messages /*{messages: req.flash('success_msg')} //Alternate */);
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
		// res.json()
	});
});

router.post('/friend-book/register', function(req, res){

	console.log(req.body);

	var name = req.body.name;
	var username = req.body.username;
	var email = req.body.email;
	var password = req.body.password;
	var password2 = req.body.password2;
	var description = req.body.description;
	var image = req.body.avatarUrl;

	//Using express validator*************************************************************************

	req.checkBody('name', 'Must type in name.').notEmpty();
	req.checkBody('username', 'Must type in Username.').notEmpty();
	req.checkBody('email', 'Must type in email.').notEmpty();
	req.checkBody('email', 'Invalid Email').isEmail();
	req.checkBody('password', 'Must type in password.').notEmpty();
	req.checkBody('password2', 'Passwords do not match.').equals(req.body.password);
	req.checkBody('description', 'Must type in something about yourself.').notEmpty();

	//Alternate method

   	  // req.checkBody({

  //       'username': {
  //           notEmpty: true,
  //           errorMessage: 'Username is required'
  //       },

  //       'email': {
  //           notEmpty: true,
  //           isEmail: {
  //               errorMessage: 'Invalid Email Address'
  //           },
  //           errorMessage: 'Email is required'
  //       },

  //       'password': {
  //           notEmpty: true,
  //           errorMessage: 'Password is required'
  //       },

  //       'password_confirmation': {
  //           notEmpty: true,
  //           errorMessage: 'Password Confirmation is required'
  //       }

	var errors = req.validationErrors();

	//If there are errors, render the errors
	if(errors){
		res.render('register', {
			errors: errors
		});
	}else{
	//if no errors, create user in database then render user data onto profile page.

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
					console.log("register data", data);
					
					// console.log("poop", data.id);
					// req.session.user = {
					// 	id: data.id,
					// 	name: data.name,
					// 	username: data.username,
					// 	email: data.email,
					// 	description: data.description
					// };

					req.flash('success_msg', 'Success! Welcome to Book Face! Please login.');

					// res.render("profile", req.session.user);
					res.redirect('/friend-book/login')

				});
			}
		})
	}
//***************************************************************************************************
});


router.get('/sign-s3', (req, res) => {
  const s3 = new aws.S3();
  const fileName = req.query['file-name'];
  const fileType = req.query['file-type'];
  const s3Params = {
    Bucket: S3_BUCKET,
    Key: fileName,
    Expires: 60,
    ContentType: fileType,
    ACL: 'public-read'
  };

  s3.getSignedUrl('putObject', s3Params, (err, data) => {
    if(err){
      console.log(err);
      return res.end();
    }
    const returnData = {
      signedRequest: data,
      url: `https://${S3_BUCKET}.s3.amazonaws.com/${fileName}`
    };
    res.write(JSON.stringify(returnData));
    res.end();
  });
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
			console.log(data);
			//res.json(data)
			var toEmail = req.body.friendReqEmail;
			var toEmailName = req.session.user.name;

			email.send(toEmail, toEmailName, function(){
				// res.redirect('/contact');	
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
	//    body: req.body.post,
	where: {
		userId: req.session.user.id
	}
  })
    // pass the result of our call
  .then(function(post) {
      // log the result to our terminal/bash window
    console.log('THIS IS MY POST', post);
      // redirect
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