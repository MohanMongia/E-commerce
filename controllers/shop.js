const Product = require('../models/product');
const Order = require('../models/order');
const fs = require('fs');
const path = require('path');
const pdfCreater = require('pdfkit');
const { exists } = require('../models/product');

const ITEMS_PER_PAGE = 1;

exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalProducts;
  Product.find().countDocuments()
    .then(total => {
      totalProducts = total;
      return Product.find()
              .skip((page-1)*ITEMS_PER_PAGE)
              .limit(ITEMS_PER_PAGE)
    })
    .then(products => {
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'All Products',
        path: '/products',
        currentPage: page,
        lastPage: Math.ceil(totalProducts/ITEMS_PER_PAGE),
        isAuthenticated: req.session.isLoggedIn,
      });
    })
    .catch(err => {
      console.log(err);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products',
        isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => console.log(err));
};

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalProducts;
  Product.find().countDocuments()
    .then(total => {
      totalProducts = total;
      return Product.find()
              .skip((page-1)*ITEMS_PER_PAGE)
              .limit(ITEMS_PER_PAGE)
    })
    .then(products => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/',
        currentPage: page,
        lastPage: Math.ceil(totalProducts/ITEMS_PER_PAGE),
        isAuthenticated: req.session.isLoggedIn,
      });
    })
    .catch(err => {
      console.log(err);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products,
        isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => console.log(err));
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      console.log(result);
      res.redirect('/cart');
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(result => {
      res.redirect('/cart');
    })
    .catch(err => console.log(err));
};

exports.postOrder = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items.map(i => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => console.log(err));
};

exports.getOrders = (req, res, next) => {
  Order.find({ 'user.userId': req.user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders,
        isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => console.log(err));
};


exports.getInvoice = (req,res,next) => {
  const orderId = req.params.orderId;
  const invoiceName = 'invoice-' + orderId + '.pdf';
  const invoicePath = path.join('data','invoices',invoiceName);
  Order.findById(orderId)
    .then(order => {
      if(!order){
        console.log('No Order Found');
      }
      else
      {
        if(order.user.userId.toString() !== req.user._id.toString())
        {
          console.log('User not authenticated');
        }
        else
        {
          // fs.readFile(invoicePath, (err,data) => {
          //   if(err)
          //   {
          //     console.log(err);
          //     next(err);
          //   }
          //   else
          //   {
          //     res.setHeader('Content-Type','application/pdf');
          //     res.setHeader('Content-Disposition', 'inline; filename="'+invoiceName+'"')
          //     res.send(data);
          //   }
          // })
          // res.send()
          // const file = fs.createReadStream(invoicePath);
          // res.setHeader('Content-Type','application/pdf');
          // res.setHeader('Content-Disposition', 'inline; filename="'+invoiceName+'"')
          // file.pipe(res);
          fs.exists(invoicePath, (exists) =>{
            if(!exists)
            {
              const pdfDocument = new pdfCreater();
              res.setHeader('Content-Type','application/pdf');
              res.setHeader('Content-Disposition', 'inline; filename="'+invoiceName+'"')
              pdfDocument.pipe(fs.createWriteStream(invoicePath));
              pdfDocument.pipe(res);

              pdfDocument.text('Hi ther');
              pdfDocument.end();
            }
            else
            {
              const file = fs.createReadStream(invoicePath);
              res.setHeader('Content-Type','application/pdf');
              res.setHeader('Content-Disposition', 'inline; filename="'+invoiceName+'"')
              file.pipe(res);   
            }
          })
        }
      }
    })
    .catch(err => console.log(err));
}