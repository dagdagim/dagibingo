const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function updateAdmin() {
  const uri = process.env.MONGODB_URI;
  console.log('Connecting to MongoDB Atlas at:', uri ? uri.substring(0, 30) + '...' : 'undefined');
  await mongoose.connect(uri);

  const passwordHash = await bcrypt.hash('password1234', 10);
  const userColl = mongoose.connection.collection('users');

  const result = await userColl.updateOne(
    { role: 'ADMIN' },
    {
      $set: {
        email: 'admin@dagibing.com',
        username: 'admin@dagibing.com',
        passwordHash: passwordHash,
        firstName: 'Dagim',
        lastName: 'Admin',
        role: 'ADMIN',
        isActive: true,
        isEmailVerified: true,
      },
    },
    { upsert: true }
  );

  console.log('✅ Admin user updated in MongoDB Atlas successfully:', result);
  const updatedUser = await userColl.findOne({ email: 'admin@dagibing.com' });
  console.log('Current Admin Details in DB:', {
    _id: updatedUser._id,
    email: updatedUser.email,
    username: updatedUser.username,
    role: updatedUser.role,
  });

  await mongoose.disconnect();
}

updateAdmin().catch((err) => {
  console.error('Error updating admin:', err);
  process.exit(1);
});
