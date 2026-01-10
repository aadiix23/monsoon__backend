const mongoose = require('mongoose');

const ArchivedReportSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true,
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [lon, lat]
            required: true
        }
    },
    address: {
        type: String
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
    reportType: {
        type: String,
        enum: ['Drainage Block', 'Water Log'],
        required: true
    },
    eventDate: {
        type: String,
        required: true
    },
    eventTime: {
        type: String,
        required: true
    },
    userName: {
        type: String
    },
    userPhone: {
        type: String
    },
    status: {
        type: String,
        enum: ['Completed'], // Only Completed reports usually go here
        default: 'Completed'
    },
    archivedAt: {
        type: Date,
        default: Date.now
    },
    originalCreatedAt: {
        type: Date
    }
});

ArchivedReportSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('ArchivedReport', ArchivedReportSchema);
