export default async function testOAuth2() {
    console.log("Testing OAuth2...");

    const res = await fetch("http://localhost:24598/api/oauth2/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            "client_id": "cbc6e1e2-a6bb-4002-bbdc-6da892a051a7",
            "scope": "https://graph.microsoft.com/.default",
            "client_secret": "GQ~ZQ~.9j8n3sXo5z8Q~_lHh0b9mN8kW",
            "grant_type": "client_credentials"
        })
    });

    const status = res.status;
    const data = await res.json();

    console.log("OAuth2 Token Response: " + status, data.toString().substring(0, 100) + "...");
    if (status == 200) {
        return true;
    }

    console.log(data)
    return false;
    
}