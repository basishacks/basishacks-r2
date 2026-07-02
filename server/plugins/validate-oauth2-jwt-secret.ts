import { validateOAuth2JWTSecret } from "../utils/validate-oauth2-jwt-secret";

export default defineNitroPlugin(() => {
    validateOAuth2JWTSecret();
});
