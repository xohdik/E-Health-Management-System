const sendEmail = require('./email');

const NotificationTemplates = {
  PATIENT_BOOKED: (patientName, doctorName, date, type) => ({
    subject: 'Appointment Scheduled',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #2c3e50;">Appointment Scheduled</h2>
        <p style="font-size: 16px; color: #333;">
          Dear ${patientName},
        </p>
        <p style="font-size: 16px; color: #333;">
          Your ${type} appointment with Dr. ${doctorName} has been scheduled for ${date}.
        </p>
        <p style="font-size: 16px; color: #333;">
          You'll receive a confirmation once the doctor approves your appointment.
        </p>
        <a href="http://localhost:3000/appointments" style="display: inline-block; padding: 10px 20px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">
          View Appointments
        </a>
        <p style="font-size: 14px; color: #777; margin-top: 20px;">
          If you have any questions, please contact our support team at support@ehealthsystem.com.s
        </p>
        <p style="font-size: 14px; color: #777;">
          Best regards,<br>The E-Health Management Team
        </p>
      </div>
    `
  }),

  DOCTOR_NEW_BOOKING: (doctorName, patientName, date, reason) => ({
    subject: 'New Appointment Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #2c3e50;">New Appointment Request</h2>
        <p style="font-size: 16px; color: #333;">
          Dr. ${doctorName},
        </p>
        <p style="font-size: 16px; color: #333;">
          You have a new appointment request from ${patientName}.
        </p>
        <p style="font-size: 16px; color: #333;">
          <strong>Date:</strong> ${date}
        </p>
        <p style="font-size: 16px; color: #333;">
          <strong>Reason:</strong> ${reason}
        </p>
        <p style="font-size: 16px; color: #333;">
          Please log in to confirm or reschedule.
        </p>
        <a href="http://localhost:3000/doctor/appointments" style="display: inline-block; padding: 10px 20px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">
          Manage Appointments
        </a>
        <p style="font-size: 14px; color: #777; margin-top: 20px;">
          If you have any questions, please contact our support team at support@ehealthsystem.com.
        </p>
        <p style="font-size: 14px; color: #777;">
          Best regards,<br>The E-Health Management Team
        </p>
      </div>
    `
  }),

  PATIENT_CONFIRMED: (patientName, doctorName, date) => ({
    subject: 'Appointment Confirmed',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #27ae60;">Appointment Confirmed</h2>
        <p style="font-size: 16px; color: #333;">
          Dear ${patientName},
        </p>
        <p style="font-size: 16px; color: #333;">
          Your appointment with Dr. ${doctorName} on ${date} has been confirmed.
        </p>
        <p style="font-size: 16px; color: #333;">
          Please arrive 10 minutes early for your appointment.
        </p>
        <a href="http://localhost:3000/appointments" style="display: inline-block; padding: 10px 20px; background-color: #27ae60; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">
          View Appointment Details
        </a>
        <p style="font-size: 14px; color: #777; margin-top: 20px;">
          If you have any questions, please contact our support team at support@ehealthsystem.com.
        </p>
        <p style="font-size: 14px; color: #777;">
          Best regards,<br>The E-Health Management Team
        </p>
      </div>
    `
  }),

  APPOINTMENT_CANCELED: (recipientName, otherPartyName, date, isPatient) => ({
    subject: 'Appointment Canceled',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #c0392b;">Appointment Canceled</h2>
        <p style="font-size: 16px; color: #333;">
          Dear ${recipientName},
        </p>
        <p style="font-size: 16px; color: #333;">
          Your appointment with ${isPatient ? 'Dr.' : ''}${otherPartyName} on ${date} has been canceled.
        </p>
        ${isPatient ? `
          <p style="font-size: 16px; color: #333;">
            Please contact us to reschedule.
          </p>
          <a href="http://localhost:3000/appointments/schedule" style="display: inline-block; padding: 10px 20px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">
            Reschedule Appointment
          </a>
        ` : ''}
        <p style="font-size: 14px; color: #777; margin-top: 20px;">
          If you have any questions, please contact our support team at support@ehealthsystem.com.
        </p>
        <p style="font-size: 14px; color: #777;">
          Best regards,<br>The E-Health Management Team
        </p>
      </div>
    `
  }),

  APPOINTMENT_REMINDER: (patientName, doctorName, date, type) => ({
    subject: 'Appointment Reminder',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #f39c12;">Appointment Reminder</h2>
        <p style="font-size: 16px; color: #333;">
          Dear ${patientName},
        </p>
        <p style="font-size: 16px; color: #333;">
          This is a reminder for your ${type} appointment with Dr. ${doctorName}.
        </p>
        <p style="font-size: 16px; color: #333;">
          <strong>Scheduled Time:</strong> ${date}
        </p>
        <p style="font-size: 16px; color: #333;">
          Please arrive 10 minutes early for your appointment.
        </p>
        <div style="margin-top: 10px;">
          <a href="http://localhost:3000/appointments" style="display: inline-block; padding: 10px 20px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px;">
            View Details
          </a>
          <a href="http://localhost:3000/appointments/reschedule" style="display: inline-block; padding: 10px 20px; background-color: #95a5a6; color: white; text-decoration: none; border-radius: 5px;">
            Reschedule
          </a>
        </div>
        <p style="font-size: 14px; color: #777; margin-top: 20px;">
          If you have any questions, please contact our support team at support@ehealthsystem.com.
        </p>
        <p style="font-size: 14px; color: #777;">
          Best regards,<br>The E-Health Management Team
        </p>
      </div>
    `
  }),

  TELEMEDICINE_SESSION_STARTED: (recipientName, otherPartyName, date, isPatient) => ({
    subject: 'Telemedicine Session Started',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #2ecc71;">Telemedicine Session Started</h2>
        <p style="font-size: 16px; color: #333;">
          Dear ${recipientName},
        </p>
        <p style="font-size: 16px; color: #333;">
          Your telemedicine session with ${isPatient ? 'Dr.' : ''}${otherPartyName} on ${date} has started.
        </p>
        <p style="font-size: 16px; color: #333;">
          Please join the session now.
        </p>
        <a href="http://localhost:3000/telemedicine/session" style="display: inline-block; padding: 10px 20px; background-color: #2ecc71; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">
          Join Session Now
        </a>
        <p style="font-size: 14px; color: #777; margin-top: 20px;">
          If you have any technical issues, please contact our support team at support@ehealthsystem.com or call (123) 456-7890.
        </p>
        <p style="font-size: 14px; color: #777;">
          Best regards,<br>The E-Health Management Team
        </p>
      </div>
    `
  }),

  TELEMEDICINE_SESSION_ENDED: (recipientName, otherPartyName, date, duration, isPatient) => ({
    subject: 'Telemedicine Session Ended',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #2c3e50;">Telemedicine Session Ended</h2>
        <p style="font-size: 16px; color: #333;">
          Dear ${recipientName},
        </p>
        <p style="font-size: 16px; color: #333;">
          Your telemedicine session with ${isPatient ? 'Dr.' : ''}${otherPartyName} on ${date} has ended.
        </p>
        <p style="font-size: 16px; color: #333;">
          <strong>Duration:</strong> ${formatDuration(duration)}
        </p>
        <p style="font-size: 16px; color: #333;">
          You can review any session notes in your patient portal.
        </p>
        <div style="margin-top: 10px;">
          <a href="http://localhost:3000/patient/records" style="display: inline-block; padding: 10px 20px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px;">
            View Records
          </a>
          <a href="http://localhost:3000/appointments/schedule" style="display: inline-block; padding: 10px 20px; background-color: #2ecc71; color: white; text-decoration: none; border-radius: 5px;">
            Schedule Follow-up
          </a>
        </div>
        <p style="font-size: 14px; color: #777; margin-top: 20px;">
          If you have any questions, please contact our support team at support@ehealthsystem.com.
        </p>
        <p style="font-size: 14px; color: #777;">
          Best regards,<br>The E-Health Management Team
        </p>
      </div>
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