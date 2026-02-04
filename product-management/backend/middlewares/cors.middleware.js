import cors from 'cors';

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            process.env.CLIENT_URL || 'http://localhost:5173',
            'http://localhost:3000',
            'http://localhost:5173'
        ];

        if (true) { // Allow ALL temporarily for debugging
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // Important for HttpOnly cookies
    optionsSuccessStatus: 200
};

export default cors(corsOptions);
