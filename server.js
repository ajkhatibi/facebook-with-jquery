
var express = require("express");
var bodyParser = require("body-parser");
var session = require("express-session");
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var expressValidator = require("express-validator");
var flash = require("connect-flash");

var app = express();
var PORT = process.env.PORT || 8080;


var db = require("./models");


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.text());
app.use(bodyParser.json({ type: "application/vnd.api+json" }));

app.use(session({
	secret: "duuuuuuuuuDE",
	resave: false,
	saveUninitialized: true
}));



app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));


app.use(express.static("./public"));

passport.use(new LocalStrategy(
  function(username, password, done) {
    db.users.findOne({ 
    	where: {
    		username: username
    	}

    }).then(function(user){

    	if (!user) {
        	return done(null, false, { message: 'Incorrect username.' });
      	}

    	user.passwordVerify(password, user.password, function(err, match){
    		console.log('\n\n')
    		console.log("err was", err);
    		console.log('\n\n')
    		console.log("match was", match);

    		if (err) {
    			done(err);
    		}

    		if (match) {
    			return done(null, user);
    		} else {
    			return done(null, false, {message: 'Invalid Password'});
    		}
    	});
    }).catch(function(err){
    	console.log('failed on passport authentication', err);
    	done(err);
    });
  }
));

passport.serializeUser(function(user, done) {
  console.log("user in serializeUser", user);
  console.log("HEEEYYYYYYYY");
  done(null, user);
});

passport.deserializeUser(function(user, done) {

    done(null, user);

});

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());


app.use(function(req, res, next){

	res.locals.error_msg = req.flash('error_msg');
	res.locals.error = req.flash('error');

	res.locals.guy = req.user || null;
	
  if (req.user) {
    req.session.user = {
      id: req.user.id,
      name: req.user.name,
      username: req.user.username,
      email: req.user.email,
      description: req.user.description,
      img: req.user.img
    };
  }

  	console.log('SUCCES MESSAGE', res.locals.succes_msg);
	console.log('locals user', res.locals.user);
	console.log('session one', req.session);
	console.log('session user', req.session.user);
	console.log('req.user', req.user);
	next(); 
});

var routes = require('./controllers/controller.js');
app.use('/', routes);


var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");


db.sequelize.sync({ force: false }).then(function() {
  app.listen(PORT, function() {
    console.log("App listening on PORT " + PORT);
  });
});