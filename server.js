const express = require("express");
const CryptoJS = require("crypto-js");
const http = require("http");
const socketIO = require("socket.io");
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const session = require('express-session');

mongoose.connect('YOUR_MONGODB_URI', { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
    username: String,
    password: String
});

const User = mongoose.model('User', userSchema);

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static("public"));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));




app.post("/signup", async (req, res) => {
    try {
        const existingUser = await User.findOne({ username: req.body.username });
        if (existingUser) {
            return res.redirect('/?signupError=true');
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({
            username: req.body.username,
            password: hashedPassword
        });
        await user.save();
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.redirect('/?signupError=true');
    }
});

app.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (user && await bcrypt.compare(req.body.password, user.password)) {
            req.session.userId = user._id;
            res.redirect('/chat.html');
        } else {
            res.redirect('/?loginError=true');
        }
    } catch (error) {
        console.error('Login error:', error);
        res.redirect('/?loginError=true');
    }
});



const connectedUsers = {};

io.on("connection", (socket) => {
    connectedUsers[socket.id] = "Anonymous";

    io.emit("update user list", Object.values(connectedUsers));

    socket.on("set pseudonym", (pseudonym) => {
        connectedUsers[socket.id] = pseudonym;
        io.emit("update user list", Object.values(connectedUsers));
    });

    socket.on("disconnect", () => {
        delete connectedUsers[socket.id];
        io.emit("update user list", Object.values(connectedUsers));
    });

    socket.on("chat message", (data) => {
        const { username, message, image } = data;

        if (username && connectedUsers[socket.id] !== username) {
            connectedUsers[socket.id] = username;
            io.emit("update user list", Object.values(connectedUsers));
        }

        io.emit("chat message", { username, message, image });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
}); 