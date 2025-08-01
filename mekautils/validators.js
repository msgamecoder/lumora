const isValidName = (name) => {
  return typeof name === 'string' && /^[A-Za-z\s]+$/.test(name) && name.length <= 33;
};

const isValidUsername = (username) => {
  if (typeof username !== 'string' || username.length > 33) return false;
  const linkRegex = /(http|www\.|\.com|\.ng|\.net|\.org)/i;
  return !linkRegex.test(username);
};

const isValidEmail = (email) => {
  if (typeof email !== 'string') return false;
  const acceptedDomains = /@(gmail\.com|yahoo\.com|outlook\.com)$/i;
  return acceptedDomains.test(email);
};

const isValidPhone = (phone) => {
  return typeof phone === 'string' && /^\d{10,16}$/.test(phone);
};

const isValidWorld = (world) => {
  return ['one', 'two'].includes(world);
};

const isValidPassword = (password) => {
  return typeof password === 'string' && password.length >= 10 && password.length <= 15;
};

module.exports = {
  isValidName,
  isValidUsername,
  isValidEmail,
  isValidPhone,
  isValidWorld,
  isValidPassword
};
