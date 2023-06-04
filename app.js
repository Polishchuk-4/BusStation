require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const userRoute = require('./routes/Index.js');

app.listen(process.env.PORT, process.env.HOST, (error) => {
    error ? console.log(error) : console.log(`Listen port ${process.env.PORT}`);
});

app.set('views', path.join(__dirname, 'ejs-views'));
app.set('view engine', 'ejs');

app.use(express.urlencoded({extended: false}));
app.use('/', userRoute);

app.use(express.static('styles'));
app.use(express.static('images'));