const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config()
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;
const bcrypt = require('bcrypt');

// middleware
app.use(express.json())
app.use(cors())
// app.use(express.static("public"));
const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kc8fcbi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    const userCollection = client.db('mcash').collection('users')
    
    app.post('/users', async (req, res) => {
      const { name, email, password, checkRole } = req.body;
      // existing user
      const existingUser = await userCollection.findOne({ email: email });
      if (existingUser) {
          return res.send({ message: 'User already exists',insertedId: null });
      }
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);
      const data = {
          name: name,
          email: email,
          password: hash,
          checkRole: checkRole
      };
      console.log(data);
      const result = await userCollection.insertOne(data);
      res.send(result)
  })

  app.post('/user', async (req, res) => {
      const { email, password } = req.query;
      // email and pass check 
      if (!email || !password) {
        return res.status(400).send({ message: 'Email and password are required' });
      }
      try {
        // Find user by email
        const user = await userCollection.findOne({ email: email });
        if (!user) {
          return res.status(404).send({ message: 'User not found' });
        }
        // Check password
        const isMatch = bcrypt.compareSync(password,user.password);
        if (!isMatch) {
          return res.send({ message: 'Password is incorrect', status: 400 });
        }
        // test and change this cecret key
        const token = jwt.sign({ user }, 'your-secret-key-90899', {
          expiresIn: 86400 // 24 hours
        });
        // টোকেন সহ রেসপন্স করা
        res.status(200).send({ token: token });
        // Successfully authenticated
        // res.send(user);
      } catch (error) {
        console.error('Error occurred:', error);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });





    // Connect the client to the server	(optional starting in v4.7)
    //  await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('the server is running........')
})
app.listen(port, () => {
    console.log(`the server: ${port}`);
})
