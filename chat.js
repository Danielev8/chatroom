var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var users = [];
var chatlog = [];
var servPass = 1234;

app.use(express.static(__dirname));
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});


io.on('connection', function (client) {
    console.log('New client connected...');

    var currentUserId;

    client.on('login', function (data) {
        client.pass = data.password;
        client.user = data.username;

        var cPass = false;
        var cUser = false;

        var nickInUse = false;


        for (var i = 0; i < users.length; i++) {
            if (client.user === users[i]) {
                nickInUse = true;
                console.log('user ' + client.user + ' is in use');
                break;
            } else {
                nickInUse = false;
                console.log('user ' + client.user + ' is available');
            }

        }

        if (client.pass != servPass) {
            cPass = false;
        } else {
            cPass = true;
        }

        if (client.user.trim() === "" || nickInUse === true) {
            cUser = false;
        } else {
            cUser = true;
        }

        if (cPass === true && cUser === true) {

            client.emit('authenticate');
            users.push(client.user);
            console.log(users);

            cPass = false;
            cUser = false;
            io.emit('userlist', users);
            client.emit('currentLogin', client.user);


            currentUserId = users.indexOf(client.user);
            console.log(users.length)
            chatlog.push({
                message: client.user,
                type: "connectionAlert"
            });
            console.log('User "' + client.user + '" has connected');
            io.emit('messageToChat', chatlog);
            client.emit('scrolldown');

            console.log('Authorization passed');


        } else if (cPass === false && cUser === false) {
            client.emit('invalidBoth', client.id);
            cPass = false;
            cUser = false;
            console.log('both invalid');
        } else if (cPass === true && cUser === false) {
            client.emit('invalidUser', client.id);
            cPass = false;
            cUser = false;
            console.log('username invalid');
        } else if (cPass === false && cUser === true) {
            client.emit('invalidPass', client.id);
            cPass = false;
            cUser = false;
            console.log('password invalid');
        }



    });

    client.on('messageToServer', function (msg) {

        var nmsg = msg.trim();
        var nnmsg = {
            prefix: client.user,
            message: nmsg,
            type: "message"
        };

        if (nnmsg.prefix === undefined) {
            client.emit('refresh');
            return;
        }
        if (nmsg.length > 0 && client.user !== undefined) {
            chatlog.push(nnmsg);
            io.emit('messageToChat', chatlog);
            return;
        }
    });

    client.on('resetPosition', function () {
        currentUserId = users.indexOf(client.user);
    });

    client.on("typing", function () {
        client.broadcast.emit("typing");
    });

    client.on("stopped typing", function () {
        client.broadcast.emit("stopped typing");
    });






    client.on('disconnect', function () {

        if (client.user !== undefined) {
            var disconnection = {
                type: "disconnectionAlert",
                message: client.user
            }
            chatlog.push(disconnection);
            console.log('User "' + client.user + '" has disconnected');

            io.emit('messageToChat', chatlog);

            users.splice(currentUserId, 1);

            io.emit('resetPosition');

            io.emit('userlist', users);
        } else {
            console.log('New user has disconnected');
        }

    });

});

server.listen(8080, function () {
    console.log('Server listening at port 80');
});