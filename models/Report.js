const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    location: {
        type: {
            type: String, // Don't do `-- { location: { type: String } }`
            enum: ['Point'], // 'location.type' must be 'Point'
            required: true,
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [lon, lat]
            required: true
        }
    },
    severity: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        required: true
    },
    imageUrl: {
        type: String
    },
    description: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create 2dsphere index for geospatial queries
ReportSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Report', ReportSchema);
