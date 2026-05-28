const http=require('http');
const app=require('./app');

const server = http.createServer(app);

server.listen(3301, () => {
    console.log('Server is running on port 3301');
});