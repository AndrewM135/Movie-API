require("dotenv").config();

const express = require('express'),
        bodyParser = require('body-parser'),
        uuid = require('uuid'),
        morgan = require('morgan'),
        fs = require('fs'),
        path = require('path');

const mongoose = require('mongoose');
const Models = require('./models.js');

const Movies = Models.Movie;
const Users = Models.User;

// //allows Mongoose connect to database to perform CRUD
// mongoose.connect('mongodb://127.0.0.1:27017/cfDB', {
//     useNewUrlParser: true, 
//     useUnifiedTopology: true
// });

mongoose.connect(process.env.CONNECTION_URI, {
    useNewUrlParser: true, 
    useUnifiedTopology: true
});

const app = express();
app.use(express.static('public'));

//app uses CORS, set to allow requests from all origins
const cors = require('cors');
app.use(cors());

//for certain origins
// let allowedOrigins = ['http://localhost:8080', 'http://testsite.com'];

// app.use(cors({
//   origin: (origin, callback) => {
//     if(!origin) return callback(null, true);
//     if(allowedOrigins.indexOf(origin) === -1){ // If a specific origin isn’t found on the list of allowed origins
//       let message = 'The CORS policy for this application doesn’t allow access from origin ' + origin;
//       return callback(new Error(message ), false);
//     }
//     return callback(null, true);
//   }
// }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded( {extended: true}));
let auth = require('./auth')(app); //import auth.js and ensure Express available in auth file.
const passport = require('passport');
require('./passport');

const { check, validationResult } = require('express-validator');

//create write stream
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), {flags:'a'});

//set up logger
app.use(morgan('combined', {stream: accessLogStream}));

// in-memory data
// let users = [
//     {
//         id: 1,
//         name: "Kim",
//         favouritesMovies: []
//     },
//     {
//         id: 2,
//         name: "Joe",
//         favouritesMovies: ["movie3"]
//     },
// ];

// let movies = [
//     {
//         "Title": "Movie1",
//         "Description": "enter description of movie1",
//         "Genre": {
//             "Name":"Drama",
//             "Description": "enter description of genre"
//         },
//         "Director": {
//             "Name": "director1",
//             "Bio": "director 1 bio",
//             "Birth": "1969"
//         },
//         "ImageURL": "#",
//         "Featured":false
//     },

//     {
//         "Title": "Movie2",
//         "Description": "enter description of movie 2",
//         "Genre": {
//             "Name":"Thriller",
//             "Description": "enter description of genre"
//         },
//         "Director": {
//             "Name": "director2",
//             "Bio": "director 2 bio",
//             "Birth": "1922"
//         },
//         "ImageURL": "#",
//         "Featured":false
//     },

//     {
//         "Title": "Movie3",
//         "Description": "enter description of movie 3",
//         "Genre": {
//             "Name":"Horror",
//             "Description": "enter description of genre"
//         },
//         "Director": {
//             "Name": "director3",
//             "Bio": "director 3 bio",
//             "Birth": "1933"
//         },
//         "ImageURL": "#",
//         "Featured":false
//     },

//     {
//         "Title": "Movie 4",
//         "Description": "enter description of movie 4",
//         "Genre": {
//             "Name":"Romantic",
//             "Description": "enter description of genre"
//         },
//         "Director": {
//             "Name": "director 4",
//             "Bio": "director 4 bio",
//             "Birth": "1944"
//         },
//         "ImageURL": "#",
//         "Featured":false
//     },

//     {
//         "Title": "Movie 5",
//         "Description": "enter description of movie 5",
//         "Genre": {
//             "Name":"Drama",
//             "Description": "enter description of genre"
//         },
//         "Director": {
//             "Name": "director 5",
//             "Bio": "director 4 bio",
//             "Birth": "1944"
//         },
//         "ImageURL": "#",
//         "Featured":false
//     },


// ];

app.get('/', (req,res) => {
    res.send('Welcome to myFlix!');
});

app.get('/documentation', passport.authenticate('jwt', {session:false}), (req, res) => {
    res.sendFile('public/documentation.html', {root: __dirname});
});


//READ list of movies
app.get('/movies', (req, res) => {
    Movies.find()
        .then((movies) => {
            res.status(200).json(movies);
        })
        .catch( (err) => {
            console.error(err);
            res.status(500).send('Error: ' + err)
    });
});

//READ - list of users
app.get('/users', passport.authenticate('jwt', {session:false}), (req, res) => {
    Users.find()
        .then((users) => {
            res.status(200).json(users);
        })
        .catch( (err) => {
            console.error(err);
            res.status(500).send('Error: ' + err)
    });
});


//READ - find movie by title
app.get('/movies/:Title', passport.authenticate('jwt', {session:false}), (req, res) => {
    Movies.findOne( {Title: req.params.Title})
    .then((movie) => {
        res.json(movie);
    })
    .catch( (err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
    });
});

//READ - return genre data by name
app.get('/movies/genre/:genreName', passport.authenticate('jwt', {session:false}), (req, res) => {
    Movies.findOne( {'Genre.Name': req.params.genreName})
    .then( (movie) => {
        res.json(movie.Genre);
    })
    .catch((err)=> {
        console.error(err);
        res.status(500).send('Error: ' + err);
    });
});

//READ - return director data by name
app.get('/movies/director/:directorName', passport.authenticate('jwt', {session:false}), (req, res) => {
    Movies.findOne( {'Director.Name': req.params.directorName})
    .then( (movie) => {
        res.json(movie.Director);
    })
    .catch((err)=> {
        console.error(err);
        res.status(500).send('Error: ' + err);
    });
});


// CREATE - new user register
app.post('/users', 
    [
    check('Username', 'Username is required').isLength({min: 5}),
    check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail()
  ]
    ,(req, res) => {
        let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
    Users.findOne( {Username: req.body.Username})
        .then( (user) => { 
            if (user) {
                return res.status(400).send(req.body.Username + ' already exists');
            }else{
                Users.create( {
                    Username: req.body.Username,
                    Password: hashedPassword,
                    Email: req.body.Email,
                    Birthday: req.body.Birthday
        })
        .then((user) => {
            res.status(200).json(user)
        })
        .catch( (error) => {
            console.error(error);
            res.status(500).send('Error: ' + error);
        });
    }
}).catch( (error) => {
    console.error(error);
    res.status(500).send('Error: ' + error);
});
});

// UPDATE - user update username
app.put('/users/:Username', 
    [
    check('Username', 'Username is required').isLength({min: 5}),
    check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric()
  ],
    passport.authenticate('jwt', {session:false}), async function(req, res) {
        let errors = validationResult(req);

        if (!errors.isEmpty()) {
          return res.status(422).json({ errors: errors.array() });
        }

        let updatedUser;
    try {
        updatedUser = await Users.findOneAndUpdate(
            { 
                Username: req.params.Username
            }, {
                $set: {
                    Username: req.body.Username,
                    Password: req.body.Password,
                    Email: req.body.Email,
                    Birthday: req.body.Birthday
                }
            },
            {
                new: true
            });
    } 
    catch(err) {
        console.error(err);
        return res.status(500).send('Error: ' + err);
    }
    return res.json(updatedUser);
})

// CREATE - user add movie to favourites
app.put('/users/:Username/movies/:MovieID', passport.authenticate('jwt', {session:false}), async function(req, res) {
    let updatedUser;
    try {
        updatedUser = await Users.findOneAndUpdate(
            { 
                Username: req.params.Username
            }, {
                $push: {
                    Favorite: req.params.MovieID
                }
            },
            {
                new: true
            });
    } 
    catch(err) {
        console.error(err);
        return res.status(500).send('Error: ' + err);
    }
    return res.json(req.params.MovieID + 'has been added to ' + req.params.Username + ' list of favorite movies');
})

// DELETE - users remove movie from favourites
app.delete('/users/:Username/movies/:MovieID', passport.authenticate('jwt', {session:false}), async function(req, res) {
    let updatedUser;
    try {
        updatedUser = await Users.findOneAndUpdate(
            { 
                Username: req.params.Username
            }, {
                $pull: {
                    Favorite: req.params.MovieID
                }
            },
            {
                new: true
            });
    } 
    catch(err) {
        console.error(err);
        return res.status(500).send('Error: ' + err);
    }
    return res.json(req.params.MovieID + 'has been removed from ' + req.params.Username + ' list of favorite movies');
})

// DELETE - user deregister
app.delete('/users/:Username', passport.authenticate('jwt', {session:false}), (req, res) => {
    Users.findOneAndRemove ({ Username: req.params.Username})
    .then( (user) => {
        if (!user) {
            res.status(400).send(req.params.Username + ' was not found');
        } else {
            res.status(200).send(req.params.Username + ' was deleted');
        }
    }).catch( (err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
    });
});

// //error handling 
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
})

//listen req
const port = process.env.PORT || 8080;

app.listen(port, '0.0.0.0',() => {
 console.log('Listening on Port ' + port);
});