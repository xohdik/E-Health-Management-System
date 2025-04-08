const sendEmail = require('./email');

const NotificationTemplates = {
  PATIENT_BOOKED: (patientName, doctorName, date, type) => ({
    subject: 'Appointment Scheduled',
    html: `
      <p>Dear ${patientName},</p>
      <p>Your ${type} appointment with Dr. ${doctorName} has been scheduled for ${date}.</p>
      <p>You'll receive a confirmation once the doctor approves your appointment.</p>
    `
  }),

  DOCTOR_NEW_BOOKING: (doctorName, patientName, date, reason) => ({
    subject: 'New Appointment Request',
    html: `
      <p>Dr. ${doctorName},</p>
      <p>You have a new appointment request from ${patientName}.</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Please log in to confirm or reschedule.</p>
    `
  }),

  PATIENT_CONFIRMED: (patientName, doctorName, date) => ({
    subject: 'Appointment Confirmed',
    html: `
      <p>Dear ${patientName},</p>
      <p>Your appointment with Dr. ${doctorName} on ${date} has been confirmed.</p>
      <p>Please arrive 10 minutes early.</p>
    `
  }),

  APPOINTMENT_CANCELED: (recipientName, otherPartyName, date, isPatient) => ({
    subject: 'Appointment Canceled',
    html: `
      <p>Dear ${recipientName},</p>
      <p>Your appointment with ${isPatient ? 'Dr.' : ''}${otherPartyName} on ${date} has been canceled.</p>
      ${isPatient ? '<p>Please contact us to reschedule.</p>' : ''}
    `
  }),

  APPOINTMENT_REMINDER: (patientName, doctorName, date, type) => ({
    subject: 'Appointment Reminder',
    html: `
      <p>Dear ${patientName},</p>
      <p>This is a reminder for your ${type} appointment with Dr. ${doctorName}.</p>
      <p><strong>Scheduled Time:</strong> ${date}</p>
      <p>Please arrive 10 minutes early for your appointment.</p>
    `
  })
};

module.exports = {
  sendPatientNotification: async (email, templateName, data) => {
    const template = NotificationTemplates[templateName];
    if (!template) throw new Error('Invalid template name');
    return sendEmail({ to: email, ...template(...data) });
  },

  sendDoctorNotification: async (email, templateName, data) => {
    const template = NotificationTemplates[templateName];
    if (!template) throw new Error('Invalid template name');
    return sendEmail({ to: email, ...template(...data) });
  }
};