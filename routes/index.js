const userRouter = require('./user');
const productRouter = require('./product');
const productCategoryRouter = require('./productCategory');
const order = require('./order');
const insert = require('./insert');
const { notFound, errHandler } = require('../middlewares/errHandler');

const initRoutes = (app) => {
	app.use('/api/user', userRouter);
	app.use('/api/product', productRouter);
	app.use('/api/productCategory', productCategoryRouter);
	app.use('/api/order', order);
	app.use('/api/insert', insert);

	app.use(notFound);
	app.use(errHandler);
};

module.exports = initRoutes;
