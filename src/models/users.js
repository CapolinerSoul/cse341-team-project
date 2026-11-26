import bcrypt from 'bcrypt';
import { User } from './schemas/users.js';
import { Role } from './schemas/roles.js';

export const createUser = async (name, username, email, password) => {
  const customer = await Role.findOne({ name: 'customer' });

  if (!customer) {
    throw new Error('Default role not found. Run the database import.');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    username: username.trim().toLowerCase(),
    email: email.trim().toLowerCase(),
    passwordHash,
    role: customer._id
  });

  return user._id.toString();
};

export const findUserById = async (id) => {
  return User.findById(id).lean();
};

export const findUserByEmail = async (email) => {
  return User.findOne({
    email: email.trim().toLowerCase()
  }).populate('role');
};

export const verifyPassword = async (password, passwordHash) => {
  return bcrypt.compare(password, passwordHash);
};