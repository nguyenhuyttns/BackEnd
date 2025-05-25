// helpers/jwt.js
const expressJwt = require('express-jwt');

/**
 * Tạo middleware xác thực JWT
 * @returns {Fuction} Middleware - Express được cấu hình
 * @description Tạo middleware xác thực JWT với các đường dẫn miễn trừ
 */
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
            { url: /\/api\/v1\/payments\/process-payment/, methods: ['POST', 'OPTIONS'] },
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

/**
 * Kiểm tra quyển truy cập token
 * @param {*} req - Đối tượng request express
 * @param {*} payload - Nội dung đã giải mã JWT
 * @param {*} done - Callback funtion để trả về kết quả
 * @returns 
 */
async function isRevoked(req, payload, done) {
    const adminOnlyPaths = [
        '/api/v1/users/get/count',
        '/api/v1/orders/get/totalsales',
        '/api/v1/products/random'
    ];
    if (!payload.isAdmin) {
        if (adminOnlyPaths.some(path => req.originalUrl.includes(path))) {
            return done(null, true);
        }
    }
    done();
}

module.exports = authJwt;
