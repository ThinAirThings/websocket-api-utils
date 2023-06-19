"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsRequestHandler = void 0;
const client_apigatewaymanagementapi_1 = require("@aws-sdk/client-apigatewaymanagementapi");
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
const wsRequestHandler = (handler) => async (event) => {
    const connectionId = event.requestContext.connectionId;
    const apigw_client = new client_apigatewaymanagementapi_1.ApiGatewayManagementApiClient({ endpoint: `https://${event.requestContext.domainName}` });
    const payload = (typeof event.body === 'object' ? event.body : JSON.parse(event.body));
    const sendMessageToClient = createSendMessageToClient({ apigw_client, connectionId, messageId: payload.messageId });
    try {
        await handler(payload, sendMessageToClient);
    }
    catch (_error) {
        const error = _error;
        console.error('Error:', error);
        await sendMessageToClient('ERROR', {
            message: `The following Error occurred: ${error.message}`
        });
    }
};
exports.wsRequestHandler = wsRequestHandler;
