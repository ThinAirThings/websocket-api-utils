import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi"
import { APIGatewayProxyEvent } from "aws-lambda"

const sendMessageToClient = async <P extends Record<string, any>>(
    apigw_client: ApiGatewayManagementApiClient, 
    connectionId: string, 
    messageId: string, 
    status: 'RUNNING'|'ERROR'|'COMPLETE',
    payload: P
) => {
    await apigw_client.send(new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify({
            messageId,
            status,
            payload
        }) as unknown as Uint8Array
    }))
}

const createSendMessageToClient = ({
    apigw_client,
    connectionId,
    messageId
}:{
    apigw_client: ApiGatewayManagementApiClient,
    connectionId: string,
    messageId: string
}) => async <P extends Record<string, any>>(status: 'RUNNING'|'ERROR'|'COMPLETE', payload: P) => {
    await sendMessageToClient(apigw_client, connectionId, messageId, status, payload)
}
export const wsRequestHandler = (
    handler: (payload: any, sendMessageToClient: ReturnType<typeof createSendMessageToClient>)=>Promise<void>
) => async (event: APIGatewayProxyEvent) => {
    const connectionId = event.requestContext.connectionId!;
    const apigw_client = new ApiGatewayManagementApiClient({endpoint: `https://${event.requestContext.domainName}`})
    const payload = (typeof event.body === 'object' ? event.body : JSON.parse(event.body))
    const sendMessageToClient = createSendMessageToClient({apigw_client, connectionId, messageId: payload.messageId})
    try { 
        await handler(payload, sendMessageToClient)
    } catch (_error) {
        const error = _error as Error;
        console.error('Error:', error);
        await sendMessageToClient('ERROR', {
            message: `The following Error occurred: ${error.message}`
        })
    }
}