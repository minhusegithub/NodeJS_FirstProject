import crypto from 'crypto';
import querystring from 'querystring';
import moment from 'moment';

function getVNPayConfig() {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const config = {
        vnp_TmnCode: process.env.VNPAY_TMNCODE,
        vnp_HashSecret: process.env.VNPAY_SECURESECRET,
        vnp_Url: process.env.VNPAY_HOST || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
        vnp_ReturnUrl: `${clientUrl}/vnpay-return`
    };

    if (!config.vnp_HashSecret || !config.vnp_TmnCode) {
        throw new Error('VNPay configuration incomplete');
    }

    return config;
}

function sortObject(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    keys.forEach(key => {
        sorted[key] = obj[key];
    });
    return sorted;
}

export function createPaymentUrl(orderId, amount, orderInfo, ipAddr) {
    const vnpayConfig = getVNPayConfig();
    const date = new Date();
    const createDate = moment(date).format('YYYYMMDDHHmmss');
    const expireDate = moment(date).add(15, 'minutes').format('YYYYMMDDHHmmss');

    // Normalize IP: VNPay often rejects IPv6 (::1), force IPv4
    let vnp_IpAddr = ipAddr;
    if (!vnp_IpAddr || vnp_IpAddr === '::1' || vnp_IpAddr === '::ffff:127.0.0.1') {
        vnp_IpAddr = '127.0.0.1';
    }

    let vnp_Params = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = vnpayConfig.vnp_TmnCode;
    vnp_Params['vnp_Locale'] = 'vn';
    vnp_Params['vnp_CurrCode'] = 'VND';
    vnp_Params['vnp_TxnRef'] = orderId;
    vnp_Params['vnp_OrderInfo'] = orderInfo;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount'] = Math.floor(amount * 100);
    vnp_Params['vnp_ReturnUrl'] = vnpayConfig.vnp_ReturnUrl;
    vnp_Params['vnp_IpAddr'] = vnp_IpAddr;
    vnp_Params['vnp_CreateDate'] = createDate;
    vnp_Params['vnp_ExpireDate'] = expireDate;

    vnp_Params = sortObject(vnp_Params);

    // Sign Data: Use '&' and '=' explicitly for separation to match VNPay requirements
    const signData = querystring.stringify(vnp_Params, '&', '=', { encode: false });
    const hmac = crypto.createHmac('sha512', vnpayConfig.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    vnp_Params['vnp_SecureHash'] = signed;

    // Final URL
    const paymentUrl = vnpayConfig.vnp_Url + '?' + querystring.stringify(vnp_Params, '&', '=', { encode: true });

    return paymentUrl;
}

export function verifyReturnUrl(vnp_Params) {
    const vnpayConfig = getVNPayConfig();
    const secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    const sortedParams = sortObject(vnp_Params);

    const signData = querystring.stringify(sortedParams, '&', '=', { encode: false });
    const hmac = crypto.createHmac('sha512', vnpayConfig.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return secureHash === signed;
}
