require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs'); // Change to bcryptjs

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ehealth')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const updatePasswords = async () => {
  try {
    const users = await User.find();
    console.log(`Found ${users.length} users in the database`);

    if (users.length === 0) {
      console.log('No users found in the database. Please run generate_synthetic_data.js to populate the database.');
      process.exit(0);
    }

    const saltRounds = 10;
    const newPassword = 'password123'; // Set a known password for testing

    for (const user of users) {
      // Check if the password is already a valid bcrypt hash
      const isValidHash = user.password && user.password.startsWith('$2a$'); // bcryptjs uses $2a$
      if (isValidHash) {
        console.log(`Password for ${user.email} is already a valid hash, skipping...`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      user.password = hashedPassword;
      await user.save();
      console.log(`Updated password for ${user.email}`);
    }

    console.log('All passwords updated');
    process.exit(0);
  } catch (error) {
    console.error('Error updating passwords:', error);
    process.exit(1);
  }
};

updatePasswords();