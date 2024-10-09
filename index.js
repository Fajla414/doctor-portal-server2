const express = require('express');
const PORT = 5000;
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs-extra');
require('dotenv').config();


const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.uzsam.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/doctors')
    },
    filename: (req, file, cb) => {
        cb(null, `${file.originalname}`)
    }
})

const upload = multer({ storage });


const run = async () => {
    try {
        await client.connect();
        const database = client.db(process.env.DB_NAME);
        const appolintementCollection = database.collection('appointments');
        const doctorsCollection = database.collection('doctors')

        // GET
        app.get('/', (req, res) => {
            res.send('Hello World!');
        })


        app.get('/allPatients', (req, res) => {
            appolintementCollection.find({}).toArray().then(result => {
                res.send(result);
            })
        })
        app.get('/doctor', (req, res) => {
            doctorsCollection.find({}).toArray().then(result => {
                res.send(result)
            })
        })

        //POST
        app.post('/addAppointment', (req, res) => {
            const appointment = req.body;
            appolintementCollection.insertOne(appointment).then(result => {
                res.send(result.acknowledged === true)
            })
        })



        app.post('/appointmentByDate', (req, res) => {
            const date = req.body;
            const email = req.body.email;
            doctorsCollection.find({ email: email }).toArray().then(doctors => {
                const filter = { date: date.date };
                if (doctors.length === 0) {
                    filter.email = email;
                }
                appolintementCollection.find(filter).toArray().then(result => {
                    res.send(result)
                })
            })



        })



        app.post('/addADoctor', upload.single('file'), (req, res) => {
            const file = req.file.filename;
            const name = req.body.name;
            const email = req.body.email;
            const phone = req.body.phone;
            const newImg = fs.readFileSync(`public/doctors/${file}`);
            const encImg = newImg.toString('base64');

            const image = {
                contentType: req.file.mimetype,
                size: req.file.size,
                img: Buffer.from(encImg, 'base64')
            }

            doctorsCollection.insertOne({ name, email, phone, image }).then(result => {
                fs.remove(`public/doctors/${file}`, err => {
                    if (err) {
                        console.log(err);
                        res.status(500).send({ msg: 'Failed to upload' });
                    }
                    res.send(result.acknowledged === true)
                })
            })
        })


        app.post('/isDoctor', (req, res) => {
            const email = req.body.email;
            doctorsCollection.find({ email: email }).toArray().then(doctors => {
                console.log(doctors.length)
                res.send(doctors.length > 0);
            })
        })










        app.listen(PORT, console.log('Server is running'));
    } catch (err) {
        console.log(err);
    }
}

run();