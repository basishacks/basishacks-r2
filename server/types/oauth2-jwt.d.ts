import type { OAuth2JWTContext } from "../utils/oauth2-jwt";

declare module "h3" {
    interface H3EventContext {
        oauth2?: OAuth2JWTContext;
    }
}

export {};
