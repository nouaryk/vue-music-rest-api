const PORT = process.env.PORT || 5000
const fs = require('fs');
var express = require("express"),
    session = require('express-session')
app = express(),
    bodyParser = require("body-parser"),
    methodOverride = require("method-override");

// MONGOOSE CONNECTION
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/vue-music', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(db => console.log('---------------- Connected to MongoDB : ) ----------------'))
    .catch(error => console.log(error))

// Mongoose Models
const Playlist = require('./models/playlist');
const Users = require('./models/users');

// CONFIG
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride());

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// ROUTER
var router = express.Router();
app.use(router);

app.listen(PORT, () => {
    console.log("Node server running on http://localhost:3000");
});


// PLAYLIST
router.post('/playlist/add', async(req, res) => {

    const playlist = new Playlist(req.body.data);
    await playlist.save()
    console.log("[REST API] Se añadido una nueva playlist.");
    res.send({ status: 'PLAYLIST_CREATED_SUCCESS' });
});

router.post('/add-song-toplaylist', async(req, res) => {
    try {
        const filter = { _id: req.body.data.playlistId };
        const playlist = await Playlist.find(filter);
        const SONG_EXISTS_IN_PLAYLIST = await Playlist.find({
            _id: req.body.data.playlistId,
            songs: req.body.data.songId
        });

        if (SONG_EXISTS_IN_PLAYLIST.length == 0) {
            await Playlist.updateOne(filter, {
                $push: {
                    songs: req.body.data.songId
                }
            })
            console.log("[REST API] Se añadió la canción a la playlist.");
            res.send({ status: 'TRACK_ADD_SUCCESS' });
        } else {
            res.send({ status: 'TRACK_ADD_ERROR' });
            console.log("[REST API] No se pudo añadir la canción a la playlist. (ya existe)");
        }
    } catch (error) {
        console.log("[REST API] No se pudo añadir la canción a la playlist.");
        res.send({ status: 'TRACK_ADD_ERROR' });
    }

});

router.get('/test', async(req, res) => {

    const filter = {
        //title: req.body.data.title
    };
    const playlist = await Playlist.find({ songs: 1221 });
    res.send(playlist)
});

router.get('/getPlaylists', async(req, res) => {
    const playlists = await Playlist.find();
    res.send(playlists);
    console.log("[REST API] Playlists cargadas con éxito.");
});

router.get('/getPlaylist/:id', async(req, res) => {
    const playlistId = {_id: req.params.id};
    const playlist = await Playlist.find(playlistId);
    res.send(playlist);
    console.log("[REST API] Playlist cargada con éxito.");
});

router.post('/playlist/delete/song', async(req, res) => {
    console.log(req.body)
    const playlistId = req.body.data.playlistId;
    console.log('playlist:: ', playlistId)
    try {
        const playlist = await Playlist.findByIdAndUpdate(playlistId, {
            $pull: {
                songs: req.body.data.songId
            }
        });
           
        console.log(`[REST API] Se eliminado la playlist: ${playlistId}.`);
        res.send({ status: 'PLAYLIST_SONG_DELETED_SUCCESS' });
    } catch (error) {
        console.log(error)
        console.log('[REST API] Playlist NO encontrada');
        res.send({ status: 'PLAYLIST_NOT_FOUND' });
    }

});

router.post('/playlist/delete/:id', async(req, res) => {
    try {
        const { id } = req.params;
        const playlist = await Playlist.find({ _id: id });

        await Playlist.remove({ _id: id })
        console.log(`[REST API] Se eliminado la playlist: ${id}.`);
        res.send({ status: 'PLAYLIST_DELETED_SUCCESS' });
    } catch (error) {
        console.log('[REST API] Playlist NO encontrada');
        res.send({ status: 'PLAYLIST_NOT_FOUND' });
    }

});

router.post('/playlist/edit/:id', async(req, res) => {

    console.log('NEW TITLE: ', req.body.data.title);
    const playlist = Playlist.find({ _id: req.params.id })
    await playlist.updateOne({ _id: req.params.id }, {
        $set: {
            title: req.body.data.title
        }
    })
    const getPlaylists = await Playlist.find(); // replace with filter user_id
    console.log("[REST API] La playlist ha sido actualizada con éxito.");
    res.send({ status: 'PLAYLIST_UPDATED_SUCCESS', playlists: getPlaylists });
});
// END PLAYLIST



// USER - ACCOUNT
router.post('/register', async(req, res) => {
    const data = req.body.data;
    const user = await Users.find({
        email: data.email,
        password: data.password
    });
    if (req.body.data.email == '' || req.body.data.email == '') {
        res.send({ status: 'USER_CREATED_FAILED' });
    } else {
        if (!user.length) {
            const auth_token = generateAuthToken();
            const newUser = {
                email: req.body.data.email,
                password: req.body.data.password,
                token: auth_token,
            }
            const users = new Users(newUser);
            await users.save();

            res.send({ status: 'USER_CREATED_SUCCESS', auth_token: auth_token });

        } else {
            res.send({ status: 'USER_CREATED_ALREADY_EXISTS' });
            console.log("[REST API] No se ha podido crear el usuario, ya existe!.");

        }
    }
});

router.post('/check_auth', async(req, res) => {
    const data = req.body.data;
    const filter = {
        email: data.email,
        password: data.password
    };

    const user = await Users.find(filter);
    if (!user.length) {
        res.send({ status: 'USER_AUTH_FAILED' });
        console.log("[REST API] El usuario no se ha podido encontrar.");
    } else {
        Array.from(user).forEach((u) => {
            res.send({ status: 'USER_AUTH_SUCCESS', user_auth_token: u.token });
            console.log("[REST API] El usuario se ha conectado correctamente.");
        })

    }
});

router.post('/login', async(req, res) => {
    const data = req.body.data;
    const filter = {
        email: data.email,
        password: data.password
    };
    const user = await Users.find(filter);
    if (!user.length) {
        res.send({ status: 'USER_LOGIN_FAILED' });
        console.log("[REST API] El usuario no se ha podido conectar.");
    } else {
        const auth_token = generateAuthToken();
        res.send({ status: 'USER_LOGIN_SUCCESS', auth_token: auth_token });
        await Users.updateOne(filter, {
            $set: {
                token: auth_token
            }
        })
        console.log("[REST API] El usuario se ha conectado correctamente.");
    }
});

router.post('/user/update-settings', async(req, res) => {
    const data = req.body.data;
    const filter = {
        email: data.email,
        password: data.password
    };
    const user = await Users.find(filter);
    console.log(user)
    console.log(req.body)
    if (user.length > 0) {
        res.send({ status: 'UPDATE_SETTINGS_SUCCESS' });
        console.log("[REST API] El perfil se ha actualizado correctamente.");
        await Users.updateOne(filter, {
            $set: {
                email: req.body.data.email,
                password: req.body.data.new_password
            }
        });
        
    } else {
        res.send({ status: 'UPDATE_SETTINGS_FAILED' });
        console.log("[REST API] No se ha podido actualizar el perfil.");
    }
});

// END USER - ACCOUNT

const generateAuthToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
