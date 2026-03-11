const bcrypt = require('bcrypt');
const { nanoid } = require('nanoid');

// a tiny wrapper over lowdb access to keep controllers clean
module.exports = function makeUserController(db) {
  const users = db.data.users;

  async function createUser({ username, email, password }) {
    if (!username || !password) throw new Error('username and password required');
    const exists = users.find((u) => u.username === username || (email && u.email === email));
    if (exists) throw new Error('User or email already exists');
    const hash = await bcrypt.hash(password, 10);
    const u = { id: nanoid(), username, email: email || null, passwordHash: hash, createdAt: Date.now() };
    users.push(u);
    await db.write();
    return { id: u.id, username: u.username, email: u.email };
  }

  async function findByUsername(username) {
    return users.find((u) => u.username === username);
  }

  async function findByEmail(email) {
    return users.find((u) => u.email === email);
  }

  async function setPassword(username, newPassword) {
    const idx = users.findIndex((u) => u.username === username);
    if (idx === -1) throw new Error('User not found');
    users[idx].passwordHash = await bcrypt.hash(newPassword, 10);
    await db.write();
    return true;
  }

  return { createUser, findByUsername, findByEmail, setPassword };
};
