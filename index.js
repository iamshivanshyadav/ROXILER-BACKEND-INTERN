import express from 'express'; // Importing the express library
import bodyParser from 'body-parser'; // Importing the body-parser library for parsing request bodies
import fetch from 'node-fetch'; // Importing the fetch library for making HTTP requests
import { MongoClient } from 'mongodb'; // Importing the MongoClient from MongoDB library
import dotenv from 'dotenv'; // Importing dotenv package

dotenv.config(); 
const app = express(); // Creating an instance of Express
const port = 3000; // Port on which the server will listen

// MongoDB Atlas configuration
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(bodyParser.json()); // Using body-parser middleware for parsing JSON request bodies

// Function to connect to MongoDB Atlas
async function connectToDatabase() {
  try {
    await client.connect(); // Connecting to MongoDB Atlas
    console.log('Connected to MongoDB Atlas'); // Logging successful connection
  } catch (error) {
    console.error('Error connecting to MongoDB Atlas:', error); // Logging error if connection fails
  }
}
connectToDatabase(); // Calling the function to connect to the database

// API endpoint to initialize the database with seed data from a third-party API
app.get('/init', async (req, res) => {
  try {
    // Fetching data from the third-party API
    const response = await fetch('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    const data = await response.json();

    // Accessing the 'sales' database and 'transactions' collection
    const db = client.db('sales');
    const collection = db.collection('transactions');
    
    // Inserting the fetched data into the 'transactions' collection
    await collection.insertMany(data);

    // Sending a success message
    res.send('Database initialized with seed data');
  } catch (error) {
    console.error('Error initializing database:', error); // Logging error if initialization fails
    res.status(500).send('Internal Server Error'); // Sending a 500 status in case of an error
  }
});

// API endpoint to list all transactions with search and pagination
app.get('/transactions', async (req, res) => {
  try {
    // Parsing query parameters
    let { page = 1, perPage = 10, search = '', month = '' } = req.query;
    const db = client.db('sales');
    const collection = db.collection('transactions');
    page = Number(page);
    perPage = Number(perPage);

    // Handling default pagination if both search and month are not provided
    if (!search && !month) {
      page = 1;
      perPage = 10;
    } else {
      // Converting month name to numerical value if provided
      if (isNaN(month)) {
        month = month.toLowerCase();
        const monthMap = {
          january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
          july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
        };
        month = monthMap[month];
      } else {
        month = Number(month);
      }
    }

    // Building the query object based on search and month parameters
    let query = {};
   
   if (month) {
  const monthRegex = new RegExp(month, 'i');
      query.dateOfSale = { $regex: monthRegex };
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { price: parseFloat(search) || 0 }
    ];
  }
} else {
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { price: parseFloat(search) || 0 }
    ];
  }
}



    // Counting total documents matching the query
    const totalCount = await collection.countDocuments(query);
    const totalPages = Math.ceil(totalCount / perPage);

    // Fetching transactions based on the query parameters
    const result = await collection.find(query)
      .skip((page - 1) * perPage)
      .limit(perPage)
      .toArray();

    // Constructing response object with pagination information
    const response = { transactions: result, pagination: { page, perPage, totalPages, totalCount } };
    res.json(response); // Sending response as JSON
  } catch (error) {
    console.error('Error fetching transactions:', error); // Logging error if fetching transactions fails
    res.status(500).send('Internal Server Error'); // Sending a 500 status in case of an error
  }
});

// API endpoint to fetch statistics
app.get('/stats', async (req, res) => {
  try {
    let { month } = req.query;
    if (!month) {
      return res.status(400).json({ error: 'Month parameter is required' });
    }
    if (isNaN(month)) {
      month = month.toLowerCase();
      const monthMap = {
        january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
        july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
      };
      month = monthMap[month];
    } else {
      month = Number(month);
    }

    const db = client.db('sales');
    const collection = db.collection('transactions');

    const totalSaleAmountResult = await collection.aggregate([
      {
        $match: {
          $expr: {
            $eq: [
              { $month: { $toDate: '$dateOfSale' } },
              month
            ]
          }
        }
      },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]).toArray();

    const totalSaleAmount = totalSaleAmountResult.length > 0 ? totalSaleAmountResult[0].total : 0;
    const totalSoldItems = await collection.countDocuments({ $expr: { $eq: [{ $month: { $toDate: '$dateOfSale' } }, month] }, sold: true });
    const totalNotSoldItems = await collection.countDocuments({ $expr: { $eq: [{ $month: { $toDate: '$dateOfSale' } }, month] }, sold: false });

    const response = {
      totalSaleAmount,
      totalSoldItems,
      totalNotSoldItems
    };
    res.json(response); // Sending response as JSON
  } catch (error) {
    console.error('Error fetching statistics:', error); // Logging error if fetching statistics fails
    res.status(500).json({ error: 'Internal Server Error' }); // Sending a 500 status in case of an error
  }
});

// API endpoint to fetch data for bar chart
app.get('/barchart', async (req, res) => {
  try {
    let { month } = req.query;
    if (!month) {
      return res.status(400).json({ error: 'Month parameter is required' });
    }
    if (isNaN(month)) {
      month = month.toLowerCase();
      const monthMap = {
        january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
        july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
      };
      month = monthMap[month];
    } else {
      month = Number(month);
    }

    const db = client.db('sales');
    const collection = db.collection('transactions');

    const barChartData = await collection.aggregate([
      { $match: { $expr: { $eq: [{ $month: { $toDate: '$dateOfSale' } }, month] } } },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lte: ['$price', 100] }, then: '0 - 100' },
                { case: { $lte: ['$price', 200] }, then: '101 - 200' },
                { case: { $lte: ['$price', 300] }, then: '201 - 300' },
                { case: { $lte: ['$price', 400] }, then: '301 - 400' },
                { case: { $lte: ['$price', 500] }, then: '401 - 500' },
                { case: { $lte: ['$price', 600] }, then: '501 - 600' },
                { case: { $lte: ['$price', 700] }, then: '601 - 700' },
                { case: { $lte: ['$price', 800] }, then: '701 - 800' },
                { case: { $lte: ['$price', 900] }, then: '801 - 900' },
                { case: { $gte: ['$price', 901] }, then: '901-above' }
              ]
            }
          },
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    res.json(barChartData); // Sending response as JSON
  } catch (error) {
    console.error('Error generating bar chart data:', error); // Logging error if generating bar chart data fails
    res.status(500).send('Internal Server Error'); // Sending a 500 status in case of an error
  }
});

// API endpoint to fetch data for pie chart
app.get('/piechart', async (req, res) => {
  try {
    let { month } = req.query;
    if (!month) {
      return res.status(400).json({ error: 'Month parameter is required' });
    }
    if (isNaN(month)) {
      month = month.toLowerCase();
      const monthMap = {
        january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
        july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
      };
      month = monthMap[month];
    } else {
      month = Number(month);
    }

    const db = client.db('sales');
    const collection = db.collection('transactions');
    const pieChartData = await collection.aggregate([
      { $match: { $expr: { $eq: [{ $month: { $toDate: '$dateOfSale' } }, month] } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]).toArray();

    res.json(pieChartData); // Sending response as JSON
  } catch (error) {
    console.error('Error generating pie chart data:', error); // Logging error if generating pie chart data fails
    res.status(500).send('Internal Server Error'); // Sending a 500 status in case of an error
  }
});

// Function to fetch combined data for a specific month
async function fetchData(month) {
  try {
    // Fetching statistics, bar chart, and pie chart data for the specified month
    const statisticsResponse = await fetch(`http://localhost:3000/stats?month=${month}`);
    const statisticsData = await statisticsResponse.json();
    const barChartResponse = await fetch(`http://localhost:3000/barchart?month=${month}`);
    const barChartData = await barChartResponse.json();
    const pieChartResponse = await fetch(`http://localhost:3000/piechart?month=${month}`);
    const pieChartData = await pieChartResponse.json();

    // Combining all fetched data into a single object
    const combinedData = {
      statistics: statisticsData,
      barChart: barChartData,
      pieChart: pieChartData
    };

    return combinedData;
  } catch (error) {
    console.error('Error fetching combined data:', error); // Logging error if fetching combined data fails
    throw error;
  }
}

// API endpoint to fetch combined data for a specific month
app.get('/combined-data', async (req, res) => {
  try {
    let { month } = req.query;
    if (isNaN(month)) {
      month = month.toLowerCase();
      const monthMap = {
        january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
        july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
      };
      month = monthMap[month];
    } else {
      month = Number(month);
    }

    if (!month) {
      return res.status(400).json({ error: 'Month parameter is required' });
    }

    // Fetching combined data for the specified month
    const combinedData = await fetchData(month);
    res.json(combinedData); // Sending response as JSON
  } catch (error) {
    console.error('Error fetching combined data:', error); // Logging error if fetching combined data fails
    res.status(500).json({ error: 'Internal Server Error' }); // Sending a 500 status in case of an error
  }
});

// Starting the Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`); // Logging a message when the server starts
});
