# ROXILER-BACKEND-INTERN

This is a RESTful API for managing sales data. It allows users to initialize the database with seed data, fetch transactions with search and pagination, and retrieve statistics, bar chart data, pie chart data, and combined data for a specific month.

## How to Run

1. Clone this repository to your local machine.
2. Install dependencies by running `npm install`.
3. Start the server by running `npm start`.
4. The server will start running on port 3000 by default.

## Endpoints

### Initialize Database

- **URL:** `/init`
- **Method:** `GET`
- **Description:** Initializes the database with seed data from a third-party API.
- **Example:** `http://localhost:3000/init`

### Fetch Transactions

- **URL:** `/transactions`
- **Method:** `GET`
- **Description:** Fetches transactions with optional search and pagination parameters.
- **Parameters:**
  - `search`: Search query to filter transactions (optional)
  - `month`: Month to filter transactions (optional)
- **Example:** `http://localhost:3000/transactions?search=Mens&month=July`

### Fetch Statistics

- **URL:** `/stats`
- **Method:** `GET`
- **Description:** Fetches statistics for a specific month.
- **Parameters:**
  - `month`: Month for which statistics are requested (required)
- **Example:** `http://localhost:3000/stats?month=July`

### Fetch Bar Chart Data

- **URL:** `/barchart`
- **Method:** `GET`
- **Description:** Fetches data for generating a bar chart for a specific month.
- **Parameters:**
  - `month`: Month for which bar chart data is requested (required)
- **Example:** `http://localhost:3000/barchart?month=August`

### Fetch Pie Chart Data

- **URL:** `/piechart`
- **Method:** `GET`
- **Description:** Fetches data for generating a pie chart for a specific month.
- **Parameters:**
  - `month`: Month for which pie chart data is requested (required)
- **Example:** `http://localhost:3000/piechart?month=July`

### Fetch Combined Data

- **URL:** `/combined-data`
- **Method:** `GET`
- **Description:** Fetches combined data (statistics, bar chart data, pie chart data) for a specific month.
- **Parameters:**
  - `month`: Month for which combined data is requested (required)
- **Example:** `http://localhost:3000/combined-data?month=June`

## Contributors

- [Your Name](https://github.com/iamshivanshyadav)
