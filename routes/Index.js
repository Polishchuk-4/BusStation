require('dotenv').config();
const express = require('express');
const route = express.Router();
const mysql2 = require('mysql2');
const moment = require('moment-timezone');

const connection = mysql2.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

connection.connect((err) => {
    if (err) {
      console.error('Помилка підключення до бази даних: ' + err.stack);
      return;
    }

    console.log('Успішне підключення до бази даних');
});

route.get('/', async (req, res) => {

    const queryImagesURL = 'select image_url from busImages';
    const queryFlights = `
    select flights.id, routes.start_location, routes.end_location, flights.departure_time, flights.arrival_time, 
	buses.capacity - (SELECT COUNT(*) FROM tickets WHERE tickets.flight_id = flights.id) as seat_number, flights.price
    from flights
    inner join routes on flights.route_id = routes.id
    inner join buses on flights.bus_id = buses.id
    order by flights.id asc;
    `;
    
    try {
        const [results1, results2] = await Promise.all([
            connection.promise().query(queryImagesURL),
            connection.promise().query(queryFlights)
        ]);

        let imagesURL = results1[0];
        const flights = results2[0].map(event => ({
          ...event,
          departure_time: moment.utc(event.departure_time).tz('Europe/Kiev').format('YYYY-MM-DD (HH:mm)'),
          arrival_time: moment.utc(event.arrival_time).tz('Europe/Kiev').format('YYYY-MM-DD (HH:mm)')
        }));
        res.render('index', {imagesURL, flights});
    } catch {
        console.error(error);
        res.status(500).send('Internal server error');
    };
});

let flight;
let id_flight = {flight_id: 0};

route.get('/BuyTicket/:id', (req, res) => {
    id_flight.flight_id = req.params.id;
    const queryFlight = `
    select flights.id as flight_id, flights.route_id, flights.bus_id, flights.departure_time, routes.start_location, flights.arrival_time, routes.end_location, 
    buses.capacity - 
                    (
					SELECT COUNT(*) 
                    FROM tickets
                    WHERE tickets.flight_id = flights.id
                    ) as seat_number, 
                    flights.price
    from flights
    inner join routes on flights.route_id = routes.id
    inner join buses on flights.bus_id = buses.id
    where flights.id='${id_flight.flight_id}';
    `;

    connection.query(queryFlight, (error, result, fields) => {
        if (error) {
            throw error
        };
        flight = result[0];
        flight.departure_time = moment.utc(flight.departure_time).tz('Europe/Kiev').format('YYYY-MM-DD (HH:mm)');
        flight.arrival_time = moment.utc(flight.arrival_time).tz('Europe/Kiev').format('YYYY-MM-DD (HH:mm)');
        res.render('buyTicket', {flight});
    });
});

route.post('/BuyTicket/:id', (req, res) => {
    let {flight_id, route_id, bus_id, seat_number, price} = flight;
    const infoTicket = { ...req.body, flight_id, route_id, bus_id, seat_number, price};

    let queryInsertTicket = `
    insert into tickets (passenger_name, passenger_surname, passenger_email, passenger_phone, seat_number, route_id, bus_id, flight_id, price)
    value ('${infoTicket.username}', '${infoTicket.surname}', '${infoTicket.email}', '${infoTicket.phone}', '${infoTicket.seat_number}', '${infoTicket.route_id}', '${infoTicket.bus_id}', '${infoTicket.flight_id}', '${infoTicket.price}');
    `;

    connection.query(queryInsertTicket, (error, result, fields) => {
        if (error) {
            throw error
        };
        res.redirect(req.get('referer'));
    });
});

module.exports = route;

