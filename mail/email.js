var sg = require('sendgrid')(process.env.SENDGRID_API_KEY);

var email = {

	send: function(toEmail, toEmailName, callback){

		var request = sg.emptyRequest({
		  method: 'POST',
		  path: '/v3/mail/send',
		  body: {
		    personalizations: [
		      {
		        to: [
		          {
		            email: toEmail,
		          },
		        ],
		        subject: 'Book Face Friend Added',
		      },
		    ],
		    from: {
		      email: "mailer_BookFace@stark-crag-86811.herokuapp.com",
		      name: toEmailName
		    },
		    content: [
		      {
		        type: 'text/plain',
		        value: 'Someone has added you as a friend!',
		      },
		    ]
		  },
		});

		//With promise
		sg.API(request)
		  .then(response => {
		    console.log(response.statusCode);
		    console.log(response.body);
		    console.log(response.headers);
		    callback();
		  })
		  .catch(error => {
		    console.log(error.response.statusCode);
		  });
	}
}

module.exports = email;
