const Admin = require('../models/Admin');
const Report = require('../models/Report');
const ArchivedReport = require('../models/ArchivedReport');
const Notification = require('../models/Notification');
const jwt = require('jsonwebtoken');

// Admin Login
exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {

        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Simple password check (plaintext as per plan/requests for simplicity/scope)
        if (password !== admin.password) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }


        const payload = {
            id: admin._id,
            isAdmin: true
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '12h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getAdminReports = async (req, res) => {
    try {
        const reports = await Report.find().sort({ createdAt: -1 });

        const geoJson = {
            type: "FeatureCollection",
            features: reports.map(report => ({
                type: "Feature",
                geometry: report.location,
                properties: {
                    id: report._id,
                    address: report.address || `Lat: ${report.location.coordinates[1]}, Lon: ${report.location.coordinates[0]}`,
                    severity: report.severity,
                    imageUrl: report.imageUrl,
                    description: report.description,
                    reportType: report.reportType,
                    status: report.status,
                    eventDate: report.eventDate,
                    eventTime: report.eventTime,
                    userName: report.userName,
                    userPhone: report.userPhone,
                    timestamp: report.createdAt,
                    user: report.user
                }
            }))
        };

        res.json(geoJson);
    } catch (err) {
        console.error('Error fetching admin reports:', err);
        res.status(500).json({ error: 'Server error fetching reports' });
    }
};

exports.getAdminNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find()
            .sort({ createdAt: -1 })
            .populate('relatedReport', 'reportType address'); // Only keep reportType and address

        res.json(notifications);
    } catch (err) {
        console.error('Error fetching admin notifications:', err);
        res.status(500).json({ error: 'Server error fetching notifications' });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const completedReports = await ArchivedReport.countDocuments();
        const ongoingReports = await Report.countDocuments({ status: 'Ongoing' });
        const pendingReports = await Report.countDocuments({ status: 'Pending' }); // Active but not ongoing
        const totalReports = completedReports + ongoingReports + pendingReports;

        res.json({
            totalReports,
            completedReports,
            ongoingReports
        });
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.status(500).json({ error: 'Server error fetching stats' });
    }
};
