import {
  createUser,
  findUserByEmail,
  verifyPassword
} from '../models/users.js';

export const showRegister = (req, res) => {
  res.render('register', {
    title: 'Register',
    error: null
  });
};

export const showLogin = (req, res) => {
  res.render('login', {
    title: 'Sign In',
    error: null
  });
};

export const register = async (req, res, next) => {
  const { name, username, email, password } = req.body;

  if (
    typeof name !== 'string' || !name.trim() ||
    typeof username !== 'string' || !username.trim() ||
    typeof email !== 'string' || !email.trim() ||
    typeof password !== 'string' ||
    password.length < 8 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    return res.status(400).render('register', {
      title: 'Register',
      error: 'Enter a name, email, and password of at least 8 characters (maximum 72 bytes).'
    });
  }

  try {
    await createUser(name.trim(), username, email, password);
    return res.redirect('/login');
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).render('register', {
        title: 'Register',
        error: 'An account with that email or username already exists.'
      });
    }

    return next(error);
  }
};

export const login = async (req, res, next) => {
  const { email, password } = req.body;

  if (
    typeof email !== 'string' || !email.trim() ||
    typeof password !== 'string' || !password
  ) {
    return res.status(400).render('login', {
      title: 'Sign In',
      error: 'Enter your email and password.'
    });
  }

  try {
    const user = await findUserByEmail(email);

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).render('login', {
        title: 'Sign In',
        error: 'Invalid email or password.'
      });
    }

    if (!user.role) {
      return next(new Error('User role is missing.'));
    }

    // Replace the old session after successful authentication.
    return req.session.regenerate((error) => {
      if (error) return next(error);

      req.session.user = {
        id: user._id.toString(),
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role.name
      };

      return req.session.save((error) => {
        if (error) return next(error);
        return res.redirect('/');
      });
    });
  } catch (error) {
    return next(error);
  }
};

export const logout = (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);

    res.clearCookie('connect.sid', { path: '/' });
    return res.redirect('/login');
  });
};
