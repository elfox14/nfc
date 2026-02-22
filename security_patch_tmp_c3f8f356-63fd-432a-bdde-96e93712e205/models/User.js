const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { encrypt, decrypt } = require('../utils/field-encryption');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  phoneEncrypted: { type: String, select: false },
  // ?? ???? ????? ???? ????? ??????? ?????
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// virtual ???? phone ????? ????? ??????? ??? toObject/toJSON
userSchema.virtual('phone')
  .get(function() {
    if (!this.phoneEncrypted) return undefined;
    try { return decrypt(this.phoneEncrypted); } catch (e) { return undefined; }
  })
  .set(function(plain) {
    this.phoneEncrypted = plain ? encrypt(plain) : undefined;
  });

// Hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function(plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
