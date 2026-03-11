const mongoose = require('mongoose');

const RatingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  movieId: { type: String, required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 10 },
  createdAt: { type: Date, default: Date.now },
});

// prevent duplicate rating per user/movie
RatingSchema.index({ user: 1, movieId: 1 }, { unique: true });

module.exports = mongoose.model('Rating', RatingSchema);
