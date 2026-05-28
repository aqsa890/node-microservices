const express = require('express');
const expressProxy = require('express-http-proxy');
const app = express();

app.use(
    '/users',
    expressProxy('localhost:3301', ),
);
app.use('/captains', expressProxy('localhost:3302'));

app.listen(3000, () => {
    console.log(" Gateway Server running on port 3000");
});