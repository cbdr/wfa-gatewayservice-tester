const fetch = require("node-fetch");
var jwt = JWT();

var myArgs = process.argv.slice(2);
console.log('myArgs: ', myArgs);

var client_id = myArgs[0];
var secret = myArgs[1];

var token_url = "https://api.careerbuilder.com/oauth/token";
var url = "https://api.careerbuilder.com/corporate/supplydemandservice/gateway/summaryfull";
var year_month_min = new Date();
year_month_min.setFullYear(year_month_min.getFullYear() -2);
var data = {
    "location":{"city_state" : "atlanta, ga","radius":50, "lat" : "", "lon": ""},
    "include_compensation": true,
    "include_supply": true,
    "include_demand": false,
    "include_hiring_indicator": false,
    "timeframe": 24,
    "occupations_onet":[],
    "military_experience":[""],
    "auto_apply_onets": false,
    "allow_multiselect": false,
    "compensation_breakout":"",
    "use_recruitmentedge_api":true,
    "keywords": "***CACHEBYPASS***rn",
    "skills_v4":[""],
    "carotene_v3":[""],
    "group_by": [
        {
            "name": "skillsv4",
            "limit": 10
        }
    ]
};

runTest();

async function callGateway(bearerToken) {
    var myToken = 'bearer ' + bearerToken;

    //Make POST request, passing in options and callback.
    let response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': myToken,
            'Accept': 'application/json; version=1.0',
            'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(data)
    });

    let result = await response.json();
    console.log(result);
}

async function runTest() {
    const bearerToken = await getToken();
    await callGateway(bearerToken);
    console.log (`Bearer token used: bearer ${bearerToken}`);

}
async function getToken() {

    let response = await fetch(token_url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify({
            'client_id': client_id,
            'client_secret': secret,
            'grant_type': 'client_credentials',
            'client_assertion_type': 'urn:params:oauth:client-assertion-type:jwt-bearer',
            'client_assertion': getJWTEncoded()
        })
    });

    let result = await response.json();
    // console.log(result);
    return (result.data.access_token);

    function getJWTEncoded() {
        return jwt.encode({
            iss: client_id,
            sub: client_id,
            aud: token_url,
            exp: Date.now() / 1000 + 30
        }, secret, 'HS512');
    }
}

function JWT() {
    /*
     * jwt-simple
     *
     * JSON Web Token encode and decode module for node.js
     *
     * Copyright(c) 2011 Kazuhito Hokamura
     * MIT Licensed
     */

    /**
     * module dependencies
     */
    var crypto = require('crypto');


    /**
     * support algorithm mapping
     */
    var algorithmMap = {
        HS256: 'sha256',
        HS384: 'sha384',
        HS512: 'sha512',
        RS256: 'RSA-SHA256'
    };

    /**
     * Map algorithm to hmac or sign type, to determine which crypto function to use
     */
    var typeMap = {
        HS256: 'hmac',
        HS384: 'hmac',
        HS512: 'hmac',
        RS256: 'sign'
    };


    /**
     * expose object
     */
    var jwt = {};


    /**
     * version
     */
    jwt.version = '0.2.0';

    /**
     * Decode jwt
     *
     * @param {Object} token
     * @param {String} key
     * @param {Boolean} noVerify
     * @param {String} algorithm
     * @return {Object} payload
     * @api public
     */
    jwt.decode = function jwt_decode(token, key, noVerify, algorithm) {
        // check seguments
        var segments = token.split('.');
        if (segments.length !== 3) {
            throw new Error('Not enough or too many segments');
        }

        // All segment should be base64
        var headerSeg = segments[0];
        var payloadSeg = segments[1];
        var signatureSeg = segments[2];

        // base64 decode and parse JSON
        var header = JSON.parse(base64urlDecode(headerSeg));
        var payload = JSON.parse(base64urlDecode(payloadSeg));

        if (!noVerify) {
            var signingMethod = algorithmMap[algorithm || header.alg];
            var signingType = typeMap[algorithm || header.alg];
            if (!signingMethod || !signingType) {
                throw new Error('Algorithm not supported');
            }

            // verify signature. `sign` will return base64 string.
            var signingInput = [headerSeg, payloadSeg].join('.');
            if (!verify(signingInput, key, signingMethod, signingType, signatureSeg)) {
                throw new Error('Signature verification failed');
            }
        }

        return payload;
    };


    /**
     * Encode jwt
     *
     * @param {Object} payload
     * @param {String} key
     * @param {String} algorithm
     * @return {String} token
     * @api public
     */
    jwt.encode = function jwt_encode(payload, key, algorithm) {
        // Check key
        if (!key) {
            throw new Error('Require key');
        }

        // Check algorithm, default is HS256
        if (!algorithm) {
            algorithm = 'HS256';
        }

        var signingMethod = algorithmMap[algorithm];
        var signingType = typeMap[algorithm];
        if (!signingMethod || !signingType) {
            throw new Error('Algorithm not supported');
        }

        // header, typ is fixed value.
        var header = { typ: 'JWT', alg: algorithm };

        // create segments, all segment should be base64 string
        var segments = [];
        segments.push(base64urlEncode(JSON.stringify(header)));
        segments.push(base64urlEncode(JSON.stringify(payload)));
        segments.push(sign(segments.join('.'), key, signingMethod, signingType));

        return segments.join('.');
    };


    /**
     * private util functions
     */

    function verify(input, key, method, type, signature) {
        if(type === "hmac") {
            return (signature === sign(input, key, method, type));
        }
        else if(type == "sign") {
            return crypto.createVerify(method)
                .update(input)
                .verify(key, base64urlUnescape(signature), 'base64');
        }
        else {
            throw new Error('Algorithm type not recognized');
        }
    }

    function sign(input, key, method, type) {
        var base64str;
        if(type === "hmac") {
            base64str = crypto.createHmac(method, key).update(input).digest('base64');
        }
        else if(type == "sign") {
            base64str = crypto.createSign(method).update(input).sign(key, 'base64');
        }
        else {
            throw new Error('Algorithm type not recognized');
        }

        return base64urlEscape(base64str);
    }

    function base64urlDecode(str) {
        return new Buffer(base64urlUnescape(str), 'base64').toString();
    }

    function base64urlUnescape(str) {
        str += new Array(5 - str.length % 4).join('=');
        return str.replace(/\-/g, '+').replace(/_/g, '/');
    }

    function base64urlEncode(str) {
        return base64urlEscape(new Buffer(str).toString('base64'));
    }

    function base64urlEscape(str) {
        return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

    return jwt;
}