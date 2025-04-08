const Doctor = require('../models/Doctor');

exports.getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find()
      .populate('user', 'firstName lastName email')
      .select('firstName lastName specialization yearsOfExperience rating user');

    const formattedDoctors = doctors.map(doctor => ({
      _id: doctor._id,
      user: doctor.user._id,
      firstName: doctor.user.firstName,
      lastName: doctor.user.lastName,
      specialization: doctor.specialization,
      yearsOfExperience: doctor.yearsOfExperience,
      rating: doctor.rating || 0
    }));

    res.json(formattedDoctors);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ message: 'Server error fetching doctors' });
  }
};