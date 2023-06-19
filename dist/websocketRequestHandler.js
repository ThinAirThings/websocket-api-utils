"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.websocketRequestHandler = void 0;
const client_apigatewaymanagementapi_1 = require("@aws-sdk/client-apigatewaymanagementapi");
const rest_api_utils_1 = require("@thinairthings/rest-api-utils");
const aws_jwt_verify_1 = require("aws-jwt-verify");
const sendMessageToClient = async (apigw_client, connectionId, messageId, status, payload) => {
    await apigw_client.send(new client_apigatewaymanagementapi_1.PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify({
            messageId,
            status,
            payload
        })
    }));
};
const createSendMessageToClient = ({ apigw_client, connectionId, messageId }) => async (status, payload) => {
    await sendMessageToClient(apigw_client, connectionId, messageId, status, payload);
};
const websocketRequestHandler = (handler, verify) => async (event) => {
    const connectionId = event.requestContext.connectionId;
    const apigw_client = new client_apigatewaymanagementapi_1.ApiGatewayManagementApiClient({ endpoint: `https://${event.requestContext.domainName}` });
    const payload = (typeof event.body === 'object' ? event.body : JSON.parse(event.body));
    const sendMessageToClient = createSendMessageToClient({ apigw_client, connectionId, messageId: payload.messageId });
    // Run lambda
    try {
        if (verify) {
            // Verify Token
            try {
                await aws_jwt_verify_1.CognitoJwtVerifier.create({
                    userPoolId: process.env.COGNITO__USERPOOL_ID,
                    clientId: process.env.COGNITO__CLIENT_ID,
                    tokenUse: 'access',
                }).verify(payload.authorization);
            }
            catch (_e) {
                const e = _e;
                throw new rest_api_utils_1.UnauthorizedError(e.message);
            }
        }
        await handler({ payload, sendMessageToClient });
    }
    catch (_error) {
        const error = _error;
        console.error('Error:', error);
        await sendMessageToClient('ERROR', {
            statusCode: error?.statusCode ?? 500,
            message: `The following Error occurred: ${(0, rest_api_utils_1.isProd)()
                ? error.prodErrorMessage ?? "Internal Server Error"
                : error.message}`
        });
    }
};
exports.websocketRequestHandler = websocketRequestHandler;
