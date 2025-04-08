import React from 'react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p>&copy; {new Date().getFullYear()} E-Health Management System</p>
      </div>
    </footer>
  );
};

export default Footer;