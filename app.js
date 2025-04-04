const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const cors = require('cors');
const authJwt = require('./helpers/jwt');
const errorHandler = require('./helpers/error-handler');
const path = require('path'); // Thêm dòng này ở đầu file
require('dotenv/config');

app.get('/favicon.ico', (req, res) => res.status(204).end());


app.use(cors());
app.options('*',cors());

//middleware
app.use(bodyParser.json());
app.use(morgan('tiny'));
app.use(authJwt());
app.use('/public/uploads', express.static(__dirname + '/public/uploads'));
// app.use(errorHandler);

// Phục vụ các file tĩnh từ thư mục public
app.use(express.static(path.join(__dirname, 'public'))); // Thêm dòng này

// Xử lý trang đặt lại mật khẩu
app.get('/reset-password', (req, res) => {          // Thêm route này
  const token = req.query.token;
  res.sendFile(path.join(__dirname, 'public', 'reset-password.html'));
});

//Routers
const productsRouter = require('./routes/products');
const categoriesRoutes = require('./routes/categories');
const usersRoutes = require('./routes/users');
const ordersRoutes = require('./routes/orders');

const api = process.env.API_URL;

app.use(`${api}/products`, productsRouter);
app.use(`${api}/categories`, categoriesRoutes);
app.use(`${api}/users`, usersRoutes);
app.use(`${api}/orders`, ordersRoutes);


//database
mongoose
    .connect(process.env.CONNECTION_STRING, {})
    .then(() => {
        console.log('Database Connection is ready...');
    })
    .catch((err) => {
        console.log(err);
    });

app.listen(3000, () => {
    console.log(api);
    console.log('server is running http://localhost:3000');
});
