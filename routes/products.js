const {Product} = require('../models/product');
const { Category } = require('../models/category');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get(`/`, async (req, res) =>{
    //http://localhost:3000/api/v1/products?categories=67dc44aa1c5d49e3e6033647 (find by category)
    let filter = {};
    if(req.query.categories)
    {
         filter = {category: req.query.categories.split(',')}
    }

    const productList = await Product.find(filter).populate('category');

    if(!productList) {
        res.status(500).json({success: false})
    } 
    res.send(productList);
})

router.get(`/:id`, async (req, res) =>{
    //http://localhost:3000/api/v1/products/67dcea5740cea065c85174aa (find by id)
    const product = await Product.findById(req.params.id).populate('category');

    if(!product) {
        res.status(500).json({success: false})
    } 
    res.send(product);
})

router.get(`/get/count`, async (req, res) => {
    //http://localhost:3000/api/v1/products/get/count (cout number of product)
    try {
        const productCount = await Product.countDocuments();

        res.status(200).send({
            productCount: productCount
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get(`/get/featured/:count`, async (req, res) =>{
    //http://localhost:3000/api/v1/products/get/featured/5 (display the product is displayed)
    const count = req.params.count ? req.params.count : 0
    const products = await Product.find({isFeatured: true}).limit(+count);

    if(!products) {
        res.status(500).json({success: false})
    } 
    res.send(products);
})



router.post(`/`, async (req, res) =>{
    //add a product
    const category = await Category.findById(req.body.category);
    if(!category) return res.status(400).send('Invalid Category')

    let product = new Product({
        name: req.body.name,
        description: req.body.description,
        richDescription: req.body.richDescription,
        image: req.body.image,
        brand: req.body.brand,
        price: req.body.price,
        category: req.body.category,
        countInStock: req.body.countInStock,
        rating: req.body.rating,
        numReviews: req.body.numReviews,
        isFeatured: req.body.isFeatured,
    })

    product = await product.save();

    if(!product) 
    return res.status(500).send('The product cannot be created')

    res.send(product);
})

router.put('/:id',async (req, res)=> {
    //edit the product
    if(!mongoose.isValidObjectId(req.params.id)) {
       return res.status(400).send('Invalid Product Id')
    }
    const category = await Category.findById(req.body.category);
    if(!category) return res.status(400).send('Invalid Category')

    const product = await Product.findByIdAndUpdate(
        req.params.id,
        {
            name: req.body.name,
            description: req.body.description,
            richDescription: req.body.richDescription,
            image: req.body.image,
            brand: req.body.brand,
            price: req.body.price,
            category: req.body.category,
            countInStock: req.body.countInStock,
            rating: req.body.rating,
            numReviews: req.body.numReviews,
            isFeatured: req.body.isFeatured,
        },
        { new: true}
    )

    if(!product)
    return res.status(500).send('the product cannot be updated!')

    res.send(product);
})

router.delete('/:id', (req, res)=>{
    //http://localhost:3000/api/v1/products/67dc2df1e9f9a61e71402b42
    Product.findByIdAndDelete(req.params.id).then(product =>{
        if(product) {
            return res.status(200).json({success: true, message: 'the product is deleted!'})
        } else {
            return res.status(404).json({success: false , message: "product not found!"})
        }
    }).catch(err=>{
       return res.status(500).json({success: false, error: err}) 
    })
})

module.exports =router;