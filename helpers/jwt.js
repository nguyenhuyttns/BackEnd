// helpers/jwt.js
const expressJwt = require('express-jwt');

function authJwt() {
    const secret = process.env.secret;
    const api = process.env.API_URL;
    
    return expressJwt({
        secret,
        algorithms: ['HS256'],
        isRevoked: isRevoked,
    }).unless({
        path: [
            { url: /\/public\/uploads(.*)/, methods: ['GET', 'OPTIONS'] },
            { url: /\/api\/v1\/products(.*)/, methods: ['GET', 'POST', 'OPTIONS'] },
            { url: /\/api\/v1\/categories(.*)/, methods: ['GET', 'POST', 'OPTIONS'] },
            { url: /\/api\/v1\/orders(.*)/, methods: ['GET', 'POST', 'OPTIONS'] },
            { url: /\/api\/v1\/users(.*)/, methods: ['GET', 'PUT', 'OPTIONS'] },
            { url: /\/api\/v1\/user-activity(.*)/, methods: ['POST', 'GET', 'OPTIONS'] },
            { url: /\/api\/v1\/payments\/webhook/, methods: ['POST', 'OPTIONS'] },
            { url: /\/api\/v1\/payments\/process-payment/, methods: ['POST', 'OPTIONS'] }, // Thêm route mới
            { url: /\/api\/v1\/payments(.*)/, methods: ['POST', 'GET', 'OPTIONS'] },
            `${api}/users/login`,
            `${api}/users/register`,
            `${api}/users/forgot-password`,
            `${api}/users/reset-password`,
            '/reset-password',
            '/payment/callback'
        ],
    });
}

async function isRevoked(req, payload, done) {
    // Danh sách các đường dẫn chỉ dành cho admin
    const adminOnlyPaths = [
        '/api/v1/users/get/count',
        '/api/v1/orders/get/totalsales',
        '/api/v1/products/random'
    ];

    if (!payload.isAdmin) {
        // Kiểm tra xem request có phải là cho các endpoint chỉ dành cho admin hay không
        if (adminOnlyPaths.some(path => req.originalUrl.includes(path))) {
            return done(null, true); // Từ chối token nếu là endpoint chỉ dành cho admin
        }
    }

    // Cho phép tất cả các request khác
    done();
}

module.exports = authJwt;
