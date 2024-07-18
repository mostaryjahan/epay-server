const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');


const port = process.env.PORT || 5000;


// middleware
app.use(express.json())
app.use(cors())


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
    const transactionsCollection = client.db('mcash').collection('transactions');

    
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
          checkRole: checkRole,
          balance: 0 ,// Initialize balance to 0
          status: 'pending'

      };
      console.log(data);
      const result = await userCollection.insertOne(data);
      res.send(result)
  })



 
  app.post('/user', async (req, res) => {
      const { email, password } = req.query;
      //  checking email and password 
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
        res.status(200).send({ token: token });
        // res.send(user);
      } catch (error) {
        console.error('Error occurred:', error);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });







     //send money
//send money
app.post('/send-money', async (req, res) => {
  console.log('Request received at /send-money endpoint'); // ADDED LOG

  const { recipientNumber, amount, pin } = req.body;
  const token = req.headers.authorization.split(" ")[1]; // Assuming Bearer token

  try {
      // Verify the JWT token
      const decoded = jwt.verify(token, 'your-secret-key-90899');
      console.log('Decoded token:', decoded); // ADDED LOG
      const sender = decoded.user;

      // Verify the PIN
      const isPinMatch = bcrypt.compareSync(pin, sender.password);
      if (!isPinMatch) {
          console.log('Invalid PIN'); // ADDED LOG
          return res.status(400).send({ message: 'Invalid PIN' });
      }

      // Check if amount is valid
      if (amount < 50) {
          console.log('Transaction amount must be at least 50 Taka'); // ADDED LOG
          return res.status(400).send({ message: 'Transaction amount must be at least 50 Taka' });
      }

      // Check sender's balance
      const senderUser = await userCollection.findOne({ email: sender.email });
      if (!senderUser) {
          console.log('Sender not found'); // ADDED LOG
          return res.status(404).send({ message: 'Sender not found' });
      }

      if (senderUser.balance < amount) {
          console.log('Insufficient balance'); // ADDED LOG
          return res.status(400).send({ message: 'Insufficient balance' });
      }

      // Deduct fee if amount is greater than 100
      let fee = 0;
      if (amount > 100) {
          fee = 5;
      }

      // Find the recipient
      const recipientUser = await userCollection.findOne({ email: recipientNumber });
      if (!recipientUser) {
          return res.status(404).send({ message: 'Recipient not found' });
      }

      // Update balances
      await userCollection.updateOne(
          { email: sender.email },
          { $inc: { balance: -(amount + fee) } }
      );

      await userCollection.updateOne(
          { email: recipientNumber },
          { $inc: { balance: amount } }
      );

      // Store transaction details in another collection
      // const transactionId = uuidv4();
      const currentDate = new Date();


function generateTransactionId() {
  // Generate a UUID and take the first 12 characters
  return uuidv4().replace(/-/g, '').slice(0, 12);
}

const transactionId = generateTransactionId();
      
      const transaction = {
        transactionId: transactionId,
        sender: sender.email,
        recipient: recipientNumber,
        amount: amount,
        fee: fee,
        date: currentDate.toLocaleString()

      };

      const transactionResult = await transactionsCollection.insertOne(transaction);
      console.log('Transaction result:', transactionResult); // ADDED LOG

      console.log('Money sent successfully'); // ADDED LOG
      res.status(200).send({ message: 'Money sent successfully' });

  } catch (error) {
      console.error('Error occurred:', error); // ADDED LOG
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
