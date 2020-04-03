'use strict';
console.log('Loading COVID response backend');

const aws = require('aws-sdk');
const crypto = require('crypto');

const updateHash = (tableName, email, hash, hashExpires) => {
    return new Promise((resolve, reject) => {
        const docClient = new aws.DynamoDB.DocumentClient();

        const updateParams = {
            TableName: tableName,
            Key: {
                "email": email
            },
            UpdateExpression: "set hashString = :h, hashExpires = :he",
            ExpressionAttributeValues:{
                ":h": hash,
                ":he": hashExpires
            },
            ReturnValues:"UPDATED_NEW"
        };
        console.log(updateParams);
        console.log("Updating the item...");
        docClient.update(updateParams, (err, data) => {
            if (err) {
                console.log("ERR: ", err);
                reject("Unable to update item. Error JSON:", JSON.stringify(err, null, 2), " DATA:", JSON.stringify(data, null, 2));
            } else {
                console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
                resolve(data);
            }
        });
    });
}

const generateHash = () => {
    var current_date = (new Date()).valueOf().toString();
    var random = Math.random().toString();
    return crypto.createHash('sha1').update(current_date + random).digest('hex');
}

exports.handler = async (event) => {

    const tableName = 'gps';
    const dynamo = new aws.DynamoDB();

    let response = {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: ''
    };

    const promise = new Promise((resolve, reject) => {
        const done = (err, res) => {
            if (!err){
                response.body = JSON.stringify(res);
                resolve(response);
            } else {
                response.body = err.message;
                response.statusCode = 400;
                reject(response);
            }
        }

        switch (event.httpMethod) {
            case 'GET':
                const email = event.queryStringParameters.email;
                const password = event.queryStringParameters.password;
                const params = {
                    Key: {
                        "email": {
                            S: email
                        }
                    },
                    TableName: tableName
                }

                console.log(`Login attempt by ${email}`);

                dynamo.getItem(params, async (err, res) => {
                    let grantAccess = {
                        loggedin: false,
                        hash: ''
                    };
                    const item = res.Item;
                    if (item){
                        const now = new Date();
                        if (item.password.S === crypto.createHash('sha256').update(password).digest("hex")) {
                            grantAccess.loggedin = true;
                            try {
                                grantAccess.hash = await updateHash(tableName, email, generateHash(), (now.getTime() + 3600)).then(data => {
                                    if (data) {
                                        console.log(`${email} login successful`);
                                        return data.Attributes.hashString;
                                    } else {
                                        return '';
                                    }
                                });
                            } catch (e) {
                                console.log(e);
                                err = e;
                            }
                        } else {
                            console.log(`Wrong password by ${email}`);
                        }
                    } else {
                        console.log(`No user found with email ${email}`);
                    }
                    done(err, grantAccess);
                });
                break;
            default:
                done(new Error(`Unsupported method "${event.httpMethod}"`));
        }
    });
    return promise;
};
