const express = require('express');
const {check,body} = require('express-validator');

const authController = require('../controllers/auth');
const User = require('../models/user');

const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.post('/login', authController.postLogin);

router.post('/signup',
[
    check('email','Please enter a valid email')
        .isEmail()
        .custom((value , {req}) => {
            return User.findOne({email : value})
                .then(userDoc => {
                    if(userDoc)
                    {
                        return Promise.reject('User already there');
                    }
                });
        }),
    body('password','Please enter the password wiht only numbers and text and atleast 3 chars')
        .isLength({min:5})
        .isAlphanumeric(),
    body('confirmPassword').custom((value, {req}) => {
        if(value !== req.body.password)
        {
            throw new Error('Passwords have to match');
        }
        return true;
    })
] ,
    authController.postSignup);

router.post('/logout', authController.postLogout);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token',authController.getNewPassword);

router.post('/new-password',authController.postNewPassword);

module.exports = router;