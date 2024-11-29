const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db.js');
const authRoutes = require('./routes/authRoutes');
const caseRoutes = require('./routes/caseRoutes.js');
const searchRoute =  require('./routes/searchRoutes.js')
const uploadRoute  = require('./routes/caseRoutesup.js')
// const fileRoute = require('./routes/fileRoutes.js')
require('./utils/scrapingCron'); 
require('./utils/emailReminder'); 

const cors = require('cors');
const cookieParser = require('cookie-parser');  
dotenv.config();
connectDB(); 

const app = express();

const corsOptions = {
  origin: 'http://localhost:3005',  
  credentials: true, 
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));  // Apply CORS configuration
app.use(express.json()); // Body parser
app.use(cookieParser());  // Use cookie-parser middleware

// API Routes
app.use('/api/email', authRoutes); // Authentication related routes
app.use('/api/case', caseRoutes); // Case related routes
app.use("/api/search", searchRoute);
app.use("/api/up", uploadRoute );
// app.use('/api/file',fileRoute);



// Default route
app.get('/api', (req, res) => {
  res.send('Hello World!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
