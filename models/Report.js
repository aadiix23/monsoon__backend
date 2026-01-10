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
    address: {
        type: String // Full address fetched from Nominatim
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
        type: String, // Or Date, but user asked for date and time input, String is often safer for raw input unless parsing is desired immediately. Let's use String for now based on "take this as a input". Using String for simplicity unless Date object is strictly better. Actually, standard practice for APIs is usually ISO strings or similar. Let's stick to String to store exactly what user sends or simple Date. Let's use String for now to be flexible or Date if we want to enforce. 
        // "take the input of date and time".
        // Let's use Date type for eventDate and String for eventTime to keep it simple, or best practice: save both as Date objects or split.
        // Let's go with String for both for flexibility as per "take this as a input" which implies raw.
        // Actually, let's use String for both to avoid parsing headaches for now.
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
        enum: ['Pending', 'Ongoing', 'Completed'],
        default: 'Pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create 2dsphere index for geospatial queries
ReportSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Report', ReportSchema);
