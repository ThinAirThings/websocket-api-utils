import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import { APIGatewayProxyEvent } from "aws-lambda";
declare const createSendMessageToClient: ({ apigw_client, connectionId, messageId }: {
    apigw_client: ApiGatewayManagementApiClient;
    connectionId: string;
    messageId: string;
}) => <P extends Record<string, any>>(status: 'RUNNING' | 'ERROR' | 'COMPLETE', payload: P) => Promise<void>;
export declare const websocketRequestHandler: <T>(handler: ({ payload, sendMessageToClient }: {
    payload: T;
    sendMessageToClient: ReturnType<typeof createSendMessageToClient>;
}) => Promise<void>, verify?: boolean) => (event: APIGatewayProxyEvent) => Promise<void>;
export {};
