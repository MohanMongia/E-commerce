const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const sg = require('@sendgrid/mail');
const dotenv = require('dotenv');
dotenv.config();
sg.setApiKey(process.env.SENDGRID_API_KEY);
const User = require('../models/user');
const { ObjectID } = require('mongodb');
const {validationResult} = require('express-validator')

exports.getLogin = (req, res, next) => {
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    isAuthenticated: false,
    prevInput: {},
    validationErrors:[]
  });
};

exports.getSignup = (req, res, next) => {
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    isAuthenticated: false,
    prevInput: {},
    validationErrors: []
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  User.findOne({email: email})
    .then(user => {
      if(!user) {
        return res.render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          isAuthenticated: false,
          prevInput: {email:email,password:password},
          validationErrors: [{param: 'email',msg: 'Wrong Email'}]
        });
      }
      return bcrypt.compare(password,user.password)
        .then(doMatch => {
          if(doMatch)
          {
            req.session.isLoggedIn = true;
            req.session.user = user;
            req.session.save(err => {
              console.log(err);
              res.redirect('/');
            });
          }
          else
          {
            res.render('auth/login', {
              path: '/login',
              pageTitle: 'Login',
              isAuthenticated: false,
              prevInput: {email:email,password:password},
              validationErrors: [{param: 'password',msg: 'Wrong Password'}]
            });
          }
        })
        .catch(err => res.redirect('/login'));
    })
    .catch(err => console.log(err));
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    console.log("ERROR: ",errors.array());
    return res.status(422).render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      isAuthenticated: false,
      prevInput: {email: email, password: password, confirmPassword: req.body.confirmPassword},
      validationErrors: errors.array()
    });
  }
    bcrypt.hash(password, 12)
      .then(hashedPassword => {
        const user = new User({
          email: email,
          password: hashedPassword,
          cart: { items: []}
        });
        return user.save();
      })
      .then(result => {
        console.log("Hi",result);
        res.redirect('/login');
      })
      .catch(err => console.log(err));
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};


exports.getReset = (req,res,next) => {
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    isAuthenticated: false
  });
}

exports.postReset = (req,res,next) => {
  crypto.randomBytes(32, (err,Buffer) => {
    if(err){
      console.log(err);
      return res.redirect('/reset');
    }
    const token = Buffer.toString('hex');
    User.findOne({email: req.body.email})
      .then(user => {
        if(!user)
        {
          console.log('No User');
          return res.redirect('/reset');
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save()
        .then(result => {
          const message = {
            to: req.body.email,
            from: 'mohanmongia27@gmail.com',
            subject: 'Reset Password',
            html: `
              <h1>Click on the link below for resseting your password</h1>
              <a href="http://localhost:3000/reset/${token}">Click Here</a>
            `
          }
          return sg.send(message);
        })
        .then(result => {
          console.log('email sent');
          res.redirect('/');
        })
        .catch(err => console.log(err));
      })
      .catch(err => console.log(err));
  })
}

exports.getNewPassword = (req,res,next) => {
  const token = req.params.token;
  User.findOne({resetToken: token})
    .then(user => {
      if(user.resetTokenExpiration>=Date.now())
      {
        res.render('auth/new-password', {
          path: '/new-password',
          pageTitle: 'New Password',
          passwordToken: token,
          userId: user._id.toString()
        });
      }
      else
      {
        console.log('Link Expired .Please request a new one');
        res.redirect('/reset');
      }
    })
    .catch(err => console.log(err));
}

exports.postNewPassword = (req,res,next) => {
  const userId = req.body.userId;
  const updatedPassword = req.body.password;
  const passwordToken = req.body.passwordToken;
  User.findOne({_id: new ObjectID(userId),
    resetToken: passwordToken,
    resetTokenExpiration: {$gt: Date.now()}
  })
    .then(user => {
      bcrypt.hash(updatedPassword,12)
        .then(hashedPassword => {
          user.password = hashedPassword;
          user.resetTokenExpiration = undefined;
          user.resetToken = undefined;
          return user.save();
        })
        .catch(err => consolelog(err));
    })
    .then(result => {
      console.log('Password updated Successfully. Please login with your new password');
      res.redirect('/login');
    })
    .catch(err => console.log(err));
}