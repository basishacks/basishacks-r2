export interface OAuth2SessionBody {
    client_id: string;
    response_type: string;
    scope: string;
    state: string;
    code_challenge: string;
    code_challenge_method: string;
    redirect_uri: string;
    post_login_redirect?: string | null;
}

export function buildOAuth2SessionBody(params: OAuth2SessionBody) {
    return { ...params };
}
