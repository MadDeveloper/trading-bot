declare interface Config {
    api: {
        key: string;
        secret: string;
        passphrase: string;
        uri: string;
        websocketURI: string;
        sandboxWebsocketURI: string;
        sandboxURI: string;
        sandbox: boolean;
    }
}