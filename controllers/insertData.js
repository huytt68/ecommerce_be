const Product = require('../models/product');
const asyncHandler = require('express-async-handler');
const data = require('../data/product.json');
const slugify = require('slugify');

const fn = async (product) => {
	await Product.create({
		title: product?.name,
		slug: slugify(product?.name),
		description: product?.description,
		thumb: product?.thumb,
		price: Math.round(Number(product?.price)),
		category: product?.category,
		quantity: Math.round(Number(product?.quantity)),
		size: product?.size,
		images: product?.images,
	});
};

const insertProduct = asyncHandler(async (req, res) => {
	const promises = [];
	for (let product of data) promises.push(fn(product));
	await Promise.all(promises);
	return res.json('Done');
});

module.exports = {
	insertProduct,
};
