const { response } = require('express');
const Order = require('../models/order');
const User = require('../models/user');
const asyncHandler = require('express-async-handler');
const order = require('../models/order');

const createOrder = asyncHandler(async (req, res) => {
	const { _id } = req.user;
	const { products, total, address, status } = req.body;
	if (address) {
		await User.findByIdAndUpdate(_id, { address, cart: [] });
	}
	const data = { products, total, orderBy: _id };
	if (status) data.status = status;
	const rs = await Order.create(data);
	return res.json({
		success: rs ? true : false,
		rs: rs ? rs : 'Something went wrong',
	});
});

const updateStatus = asyncHandler(async (req, res) => {
	const { oid } = req.params;
	const { status } = req.body;
	if (!status) throw new Error('Missing status');
	const response = await Order.findByIdAndUpdate(
		oid,
		{ status },
		{ new: true }
	);

	return res.json({
		success: response ? true : false,
		response: response ? response : 'Something went wrong',
	});
});

const getUserOrders = asyncHandler(async (req, res) => {
	const queries = { ...req.query };
	const { _id } = req.user;

	// Tách các trường đặt biệt ra khỏi query
	const excludeFields = ['limit', 'sort', 'page', 'fields'];
	excludeFields.forEach((el) => delete queries[el]);

	// Format lại các operators cho đúng cú pháp của mongoose
	let queryString = JSON.stringify(queries);
	queryString = queryString.replace(
		/\b(gte|gt|lt|lte)\b/g,
		(macthedEl) => `$${macthedEl}`
	);
	const formatedQueries = JSON.parse(queryString);
	// let sizeQueryObject = {}

	//

	const qr = { ...formatedQueries, orderBy: _id };

	let queryCommand = Order.find(qr);

	// Sorting
	// acb,efg => [abc,efg] => abc efg
	if (req.query.sort) {
		const sortBy = req.query.sort.split(',').join(' ');
		queryCommand = queryCommand.sort(sortBy);
	}

	// Fields limiting
	if (req.query.fields) {
		const fields = req.query.fields.split(',').join(' ');
		queryCommand = queryCommand.select(fields);
	}

	// Pagination
	// limit: số object lấy về 1 lần gọi API
	// outset(skip):
	// +2 => 2 , +chu => NaN
	const page = +req.query.page || 1;
	const limit = +req.query.limit || process.env.LIMIT_PRODUCTS;
	const skip = (page - 1) * limit;
	queryCommand.skip(skip).limit(limit);

	// Exceute query
	// Số lượng sp thoả mãn điều kiện !== số lươnjg sp trả về 1 lần gọi API
	queryCommand.exec(async (err, response) => {
		if (err) throw new Error(err.message);
		const counts = await Order.find(qr).countDocuments();
		return res.status(200).json({
			success: response ? true : false,
			counts,
			orders: response ? response : 'Cannot get products',
		});
	});
});

const getOrders = asyncHandler(async (req, res) => {
	const queries = { ...req.query };
	// Tách các trường đặt biệt ra khỏi query
	const excludeFields = ['limit', 'sort', 'page', 'fields'];
	excludeFields.forEach((el) => delete queries[el]);

	// Format lại các operators cho đúng cú pháp của mongoose
	let queryString = JSON.stringify(queries);
	queryString = queryString.replace(
		/\b(gte|gt|lt|lte)\b/g,
		(macthedEl) => `$${macthedEl}`
	);
	const formatedQueries = JSON.parse(queryString);
	// let sizeQueryObject = {}

	// // Filtering
	// if (queries?.title) formatedQueries.title = { $regex: queries.title, $options: 'i' } // "i" không phân biệt hoa thường
	// if (queries?.category) formatedQueries.category = { $regex: queries.category, $options: 'i' }
	// if (queries?.size){
	//     delete formatedQueries.size
	//     const sizeArr = queries.size?.split(',')
	//     const sizeQuery = sizeArr.map(el =>({size: {$regex: el, $options: 'i'}}))
	//     sizeQueryObject = {$or: sizeQuery}
	// }

	//

	const qr = { ...formatedQueries };

	let queryCommand = Order.find(qr);

	// Sorting
	// acb,efg => [abc,efg] => abc efg
	if (req.query.sort) {
		const sortBy = req.query.sort.split(',').join(' ');
		queryCommand = queryCommand.sort(sortBy);
	}

	// Fields limiting
	if (req.query.fields) {
		const fields = req.query.fields.split(',').join(' ');
		queryCommand = queryCommand.select(fields);
	}

	// Pagination
	// limit: số object lấy về 1 lần gọi API
	// outset(skip):
	// +2 => 2 , +chu => NaN

	const page = +req.query.page || 1;
	const limit = +req.query.limit || process.env.LIMIT_PRODUCTS;
	const skip = (page - 1) * limit;
	queryCommand.skip(skip).limit(limit);
	// Exceute query
	// Số lượng sp thoả mãn điều kiện !== số lươnjg sp trả về 1 lần gọi API
	queryCommand.exec(async (err, response) => {
		if (err) throw new Error(err.message);
		const counts = await Order.find(qr).countDocuments();
		return res.status(200).json({
			success: response ? true : false,
			counts,
			orders: response ? response : 'Cannot get products',
		});
	});
});

module.exports = {
	createOrder,
	updateStatus,
	getUserOrders,
	getOrders,
};
