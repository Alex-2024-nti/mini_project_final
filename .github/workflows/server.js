const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'records.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files

// Ensure data directory exists
async function ensureDataDirectory() {
    const dataDir = path.dirname(DATA_FILE);
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
    }
}

// Initialize data file if it doesn't exist
async function initializeDataFile() {
    try {
        await fs.access(DATA_FILE);
    } catch {
        await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
    }
}

// Developer access codes (in production, use proper authentication)
const DEVELOPER_CODES = [
    'letmein',
    'DEV-ECG-2024-ALPHA',
    'ECG-DEV-ADMIN-001',
    'ECG-IT-DEV-ACCESS'
];

// Simple token storage (in production, use JWT or session management)
const validTokens = new Set();

// Helper functions
async function readRecords() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

async function writeRecords(records) {
    await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2));
}

// Developer login endpoint
app.post('/api/dev-login', async (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code || !DEVELOPER_CODES.includes(code)) {
            return res.status(401).json({ message: 'Invalid developer code' });
        }
        
        // Generate a simple token (in production, use JWT)
        const token = `dev_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        validTokens.add(token);
        
        // Remove token after 24 hours (in production, use proper token expiration)
        setTimeout(() => {
            validTokens.delete(token);
        }, 24 * 60 * 60 * 1000);
        
        res.json({ 
            message: 'Developer access granted',
            token: token
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Middleware to check developer token
function checkDeveloperAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : null;
    
    if (!token || !validTokens.has(token)) {
        // Also check for session-based access for backward compatibility
        // This would typically come from session cookies or headers
        return res.status(401).json({ message: 'Unauthorized - Developer access required' });
    }
    
    next();
}

// Get all records
app.get('/api/records', checkDeveloperAuth, async (req, res) => {
    try {
        const records = await readRecords();
        res.json(records);
    } catch (error) {
        res.status(500).json({ message: 'Error reading records', error: error.message });
    }
});

// Create a new record (public endpoint - anyone can submit issues)
app.post('/api/records', async (req, res) => {
    try {
        const { vendorName, location, phone, issue } = req.body;
        
        // Validation
        if (!vendorName || !location || !phone || !issue) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        
        // Validate phone number format (Ghanaian format)
        const phonePattern = /^(\+233|0)[0-9]{9}$/;
        if (!phonePattern.test(phone)) {
            return res.status(400).json({ message: 'Invalid Ghanaian phone number format' });
        }
        
        const records = await readRecords();
        const newRecord = {
            id: records.length > 0 ? Math.max(...records.map(r => r.id || 0)) + 1 : 1,
            vendorName: vendorName.trim(),
            location: location.trim(),
            phone: phone.trim(),
            issue: issue.trim(),
            date: new Date().toISOString()
        };
        
        records.push(newRecord);
        await writeRecords(records);
        
        res.status(201).json({ 
            message: 'Record created successfully',
            record: newRecord
        });
    } catch (error) {
        res.status(500).json({ message: 'Error creating record', error: error.message });
    }
});

// Delete a record (requires developer authentication)
app.delete('/api/records/:id', checkDeveloperAuth, async (req, res) => {
    try {
        const recordId = parseInt(req.params.id);
        const records = await readRecords();
        const index = records.findIndex(r => r.id === recordId);
        
        if (index === -1) {
            return res.status(404).json({ message: 'Record not found' });
        }
        
        records.splice(index, 1);
        await writeRecords(records);
        
        res.json({ message: 'Record deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting record', error: error.message });
    }
});

// Get record statistics
app.get('/api/stats', checkDeveloperAuth, async (req, res) => {
    try {
        const records = await readRecords();
        const today = new Date().toDateString();
        const thisMonth = new Date().toISOString().slice(0, 7);
        
        let todayCount = 0;
        let monthCount = 0;
        
        records.forEach(record => {
            const recordDate = new Date(record.date);
            if (recordDate.toDateString() === today) todayCount++;
            if (recordDate.toISOString().slice(0, 7) === thisMonth) monthCount++;
        });
        
        res.json({
            total: records.length,
            today: todayCount,
            thisMonth: monthCount
        });
    } catch (error) {
        res.status(500).json({ message: 'Error getting statistics', error: error.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'ECG Help Desk API is running' });
});

// Initialize and start server
async function startServer() {
    await ensureDataDirectory();
    await initializeDataFile();
    
    app.listen(PORT, () => {
        console.log(`ECG Help Desk Server running on port ${PORT}`);
        console.log(`API endpoints available at http://localhost:${PORT}/api`);
        if (process.env.PORT) {
            console.log(`Server is ready for production deployment`);
        }
    });
}

startServer().catch(console.error);

