import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi"
import { UnauthorizedError, isProd } from "@thinairthings/rest-api-utils"
import { CognitoJwtVerifier } from "aws-jwt-verify"
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
export const websocketRequestHandler = <T>(
    handler: ({payload, sendMessageToClient}:{payload: T, sendMessageToClient: ReturnType<typeof createSendMessageToClient>})=>Promise<void>,
    verify?: boolean
) => async (event: APIGatewayProxyEvent) => {
    const connectionId = event.requestContext.connectionId!;
    const apigw_client = new ApiGatewayManagementApiClient({endpoint: `https://${event.requestContext.domainName}`})
    const payload = (typeof event.body === 'object' ? event.body : JSON.parse(event.body))
    const sendMessageToClient = createSendMessageToClient({apigw_client, connectionId, messageId: payload.messageId})
    // Run lambda
    try {
        if (verify) {
            // Verify Token
            try {
                await CognitoJwtVerifier.create({
                    userPoolId: process.env.COGNITO__USERPOOL_ID!,
                    clientId: process.env.COGNITO__CLIENT_ID!,
                    tokenUse: 'access',
                }).verify(payload.authorization)
            } catch (_e) {
                const e = _e as Error
                throw new UnauthorizedError(e.message)
            }
        }
        await handler({payload, sendMessageToClient})
    } catch (_error) {
        const error = _error as Error;
        console.error('Error:', error);
        await sendMessageToClient('ERROR', {
            statusCode: error?.statusCode ?? 500,
            message: `The following Error occurred: ${isProd()
                ? error.prodErrorMessage ?? "Internal Server Error"
                : error.message
            }`
        })
    }
}