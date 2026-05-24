console.log("Running tests...");

// import { testMicrosoftMeeting, testCreateMicrosoftMeeting, testInitializeDummyUserAccessToken } from "./test.microsoft.ts";
// import initializeMSAccessToken from "../server/plugins/microsoft.ts";

// const result_testMicrosoftMeeting = await testMicrosoftMeeting(token, "9a18ec7b-65e1-4cd4-b489-57921e09f739");
// console.log("================================")
// console.log("testMicrosoftMeeting: " + (result_testMicrosoftMeeting ? "PASSED" : "FAILED"));
// console.log("================================")

// const result_testCreateMicrosoftMeeting = await testCreateMicrosoftMeeting(token, "devclub-bisz@basischina.com");
// console.log("================================")
// console.log("testCreateMicrosoftMeeting: " + (result_testCreateMicrosoftMeeting ? "PASSED" : "FAILED"));
// console.log("================================")

// This will not work unless admins approve 
// const result_testCreateMicrosoftMeeting = await testInitializeDummyUserAccessToken();
// console.log("================================")
// console.log("testCreateMicrosoftMeeting: " + (result_testCreateMicrosoftMeeting ? "PASSED" : "FAILED"));
// console.log("================================")

// import { testDeepSeek } from "./test.deepseek.ts";

// console.log("Running tests...");

// let result_testOAuth2;
// try {
//     result_testOAuth2 = await testOAuth2();
// } catch (error) {
//     console.error("Error during testOAuth2:", error);
//     result_testOAuth2 = false;
// }
// console.log("================================")
// console.log("testOAuth2: " + (result_testOAuth2 ? "PASSED" : "FAILED"));
// console.log("================================")

// await initializeMSAccessToken();
// const token = await import("../server/plugins/microsoft.ts").then(m => m.getMSAccessToken());
// const result_testDeepSeek = await testDeepSeek();
// console.log("================================")
// console.log("testDeepSeek: " + (result_testDeepSeek ? "PASSED" : "FAILED"));
// console.log("================================")

// import { testSearch } from "./test.search.ts"
// const result_testSearch = await testSearch();
// console.log("================================")
// console.log("testSearch: " + (result_testSearch ? "PASSED" : "FAILED"));
// console.log("================================")

const res = await fetch("http://localhost:24598/api/oauth2/token", {
    method: "POST",
    headers: {
        "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
        grant_type: "authorization_code",
        code: "MHC4It5pCTmGcns7TP9mC5ugV8WuRw5fK6LQLZTBdb83WVLzj3BbQBWBLim8B_JnOZODOy-1KfyXbZr2KQaTyreOPIMBuVCchnftkzin6KwN4tKFlUbZsku1l1gulsFhXINzQirF9ELNHycHq5OMBX_zbTeS1sL5Z-TgYOsxogE",
        client_id: "97e435f4-17e8-42ef-9b12-9684fd656de9",
        client_secret: "e88641a2d03d136793ae5c73aa8d18577913e6636f6b180714cfbc6af7e42a6f"
    }).toString()
})

const json = await res.json();
const token = json.access_token;
console.log("Received token:", token);

const userinfo = await fetch("http://localhost:24598/api/oauth2/userinfo", {
    method: "GET",
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    }
})

console.log(await userinfo.json());