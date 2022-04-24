//Imports
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config()


const app = express();
const port = process.env.PORT || 5000;

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
        const announcementsCollection = database.collection("announcements");

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

        //Checking if user is instructor or not
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isInstructor = false;
            if (user?.role === 'instructor') {
                isInstructor = true;
            }
            res.json({ instructor: isInstructor });
        })


        app.post('/user/:email/completed', async (req, res) => {
            const email = req.params.email;
            if (email) {
                const query = { email: email };
                const user = await usersCollection.findOne(query);
                const data = req.body;
                const { cID, mID, vID } = data;
                const course = await user?.courses.find(course => course.courseID == cID);
                let status = false;
                const completed = course?.completed;
                const moduleID = parseInt(completed.substring(0, completed.indexOf('/')));
                const videoID = parseInt(completed.substring(completed.indexOf("/") + 1));

                if (mID < moduleID) {
                    status = true;
                }
                else if (mID == moduleID) {
                    if (vID <= videoID) {
                        status = true;
                    }
                }

                res.json(status);
            }
        })

        app.put('/user/:email/completed', async (req, res) => {
            const email = req.params.email;
            if (email) {
                const query = { email: email };
                const user = await usersCollection.findOne(query);
                const data = req.body;
                const { cID, mID, vID } = data;
                (user.courses[cID - 1]).completed = `${mID}/${vID}`;
                const updateDoc = {
                    $set: user
                };
                const filter = query;
                const result = await usersCollection.updateOne(filter, updateDoc);
                res.json(result);
            }
        })

        app.post('/user/:courseID/new-modules', async (req, res) => {
            const id = parseInt(req.params.courseID);
            const module = req.body;
            const query = { courseID: id };
            const course = await coursesCollection.findOne(query);
            const modules = [...course.modules, module]
            course.modules = modules;
            const updateDoc = {
                $set: course
            };
            const filter = query;
            const result = await coursesCollection.updateOne(filter, updateDoc);
            res.json(result);
        })


        //course progress
        app.get('/users/progress/:email/:courseID', async (req, res) => {
            const email = req.params.email;
            const courseID = parseInt(req.params.courseID);
            const query1 = { email: email };
            const user = await usersCollection.findOne(query1);
            const userCourse = user?.courses.find(course => course.courseID == courseID);
            const completed = userCourse.completed;
            const moduleNum = parseInt(completed.substring(0, completed.indexOf('/')));
            const videoNum = parseInt(completed.substring(completed.indexOf("/") + 1));
            const query2 = { courseID: courseID };
            const course = await coursesCollection.findOne(query2);
            let total = 0;
            let watched_video_count = 0;
            course?.modules.forEach((module) => {
                const moduleKey = module.key;
                module.videos.forEach(video => {
                    const videoKey = video.key;
                    total++;
                    if (moduleKey < moduleNum) {
                        watched_video_count++;
                    }
                    else if (moduleKey == moduleNum) {
                        if (videoKey <= videoNum) {
                            watched_video_count++;
                        }
                    }
                })
            })
            const progress = Math.round((watched_video_count / total) * 100);
            res.json(progress);
        })

        app.get('/announcements', async (req, res) => {
            const cursor = announcementsCollection.find({});
            const announcements = await cursor.toArray();
            res.json(announcements);
        })

        app.post('/announcements', async (req, res) => {
            const announcement = req.body;
            const result = await announcementsCollection.insertOne(announcement);
            res.json(result);
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



