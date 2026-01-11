const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.signup = async (req, res) => {
    const { name, phoneNumber, otp } = req.body;


    if (!name || !phoneNumber || !otp) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }


    if (otp !== '000111') {
        return res.status(400).json({ msg: 'Invalid OTP' });
    }

    try {

        const existingUser = await User.findOne({ phoneNumber });
        if (existingUser) {
            return res.status(400).json({ msg: 'User already exists' });
        }


        const newUser = new User({
            name,
            phoneNumber
        });

        const savedUser = await newUser.save();


        const payload = {
            id: savedUser.id
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: 3600 },
            (err, token) => {
                if (err) throw err;
                res.status(201).json({
                    msg: 'User registered successfully',
                    token,
                    user: {
                        id: savedUser.id,
                        name: savedUser.name,
                        phoneNumber: savedUser.phoneNumber
                    }
                });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.login = async (req, res) => {
    const { phoneNumber, otp } = req.body;


    if (!phoneNumber || !otp) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }


    if (otp !== '000111') {
        return res.status(400).json({ msg: 'Invalid OTP' });
    }

    try {

        const user = await User.findOne({ phoneNumber });
        if (!user) {
            return res.status(400).json({ msg: 'User does not exist' });
        }


        const payload = {
            id: user.id
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: 3600 },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        phoneNumber: user.phoneNumber
                    }
                });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
