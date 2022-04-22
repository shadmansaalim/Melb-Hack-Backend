//Imports
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config()
const ObjectId = require('mongodb').ObjectId;


const app = express();
const port = process.env.PORT || 8000;

// Middleware use for server
app.use(cors());
app.use(express.json());


//MongoDB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xqlvg.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


async function run() {
    try {
        await client.connect();
        const database = client.db("melb-hack");
        const coursesCollection = database.collection("courses");
        const usersCollection = database.collection("users");

        //GET COURSES FROM DB
        app.get('/courses', async (req, res) => {
            const cursor = coursesCollection.find({});
            const courses = await cursor.toArray();

            res.json(courses);
        })

        //Get single course by 
        app.get('/course/:id', async (req, res) => {
            const id = parseInt(req.params.id);
            const query = { courseID: id }
            const course = await coursesCollection.findOne(query);
            res.json(course);
        })

        //Add users to database those who signed up with Email Password
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.json(result);
        })

        //Add users to database those who signed up with External Provider
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);

        })

        app.post('/user/:email/completed', async (req, res) => {
            const email = req.params.email;
            if (email) {
                const query = { email: email };
                const user = await usersCollection.findOne(query);
                const { courses } = user;
                const data = req.body;
                const { cID, mID, vID } = data;
                const course = await courses.find(course => course.courseID == cID);
                const module = await course.modules.find(module => module.key == mID);
                const video = await module.videos.find(video => video.key == vID);
                const completed = video.completed;
                res.json(completed);
            }
        })

        app.put('/user/:email/completed', async (req, res) => {
            const email = req.params.email;
            if (email) {
                const query = { email: email };
                const user = await usersCollection.findOne(query);
                const data = req.body;
                const { cID, mID, vID } = data;
                (user.courses[cID - 1].modules[mID - 1].videos[vID - 1]).completed = true;
                const updateDoc = {
                    $set: user
                };
                const filter = query;
                const result = await usersCollection.updateOne(filter, updateDoc);
                res.json(result);
            }
        })

    }
    finally {
        //   await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    console.log('Hitting backend');
    res.send('Learning App Backend')
})

app.listen(port, () => {
    console.log('Listening to port number ', port);
})



