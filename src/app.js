//Um server simples feito com express js para testar o health check

//create a express app
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const axios = require('axios');
const HealthCheckModule = require('./lib/health-check');
const app = express();
const port = 3000;

///////////////DB /////////////////////
mongoose.connect(
    'mongodb://localhost:27017/poc-healthcheck',
    { useNewUrlParser: true, useUnifiedTopology: true },
).then(() => {
    console.log('MongoDB connected…');
}).catch((err) => {
    console.log(err);
});

//Model
const Book = mongoose.model('Book', { name: String });

///////////////Server /////////////////////

//instantiate the health check module
const HealthCheck = new HealthCheckModule();
//register the integration
HealthCheck.registerIntegration('mongodb', 'database');
HealthCheck.registerIntegration('pokemon', 'api');

app.use(bodyParser.json());

//create a route for the app
app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.post('/book', async (req, res) => {
    const { name } = req.body;

    try {
        //this is to simulate an error
        if (name === 'error') throw new Error('Error');

        const book = new Book({ name });
        await book.save();
        res.send('Book saved');
    } catch (error) {
        //increment the error count
        HealthCheck.incrementIntegrationError('mongodb');
        res.status(500).send('Error');
    }
});

app.get('/pokemon/:name', async (req, res) => {
    const { name } = req.params;

    try {
        const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${name}`);
        res.json(response.data);
    } catch (error) {
        //increment the error count
        HealthCheck.incrementIntegrationError('pokemon');
        res.status(500).send('Error');
    }
});

app.get('/health', async (req, res) => {
    //get the response
    const result = await HealthCheck.getResponse();
    res.json(result);
})

//listen to the port
app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});