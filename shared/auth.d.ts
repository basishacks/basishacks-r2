declare module "#auth-utils" {
    interface User {
        id: number;
    }

    interface SecureSessionData {
        accessToken: string;
        accessTokenExpiresAt: number;
        refreshToken: string;
        scopes: string[];
    }
}

export {};
