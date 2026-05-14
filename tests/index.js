console.log("Running tests...");

import { testMicrosoftMeeting, testCreateMicrosoftMeeting, testInitializeDummyUserAccessToken } from "./test.microsoft.ts";
import initializeMSAccessToken from "../server/plugins/microsoft.ts";

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

import { testDeepSeek } from "./test.deepseek.ts";

console.log("Running tests...");

let result_testOAuth2;
try {
    result_testOAuth2 = await testOAuth2();
} catch (error) {
    console.error("Error during testOAuth2:", error);
    result_testOAuth2 = false;
}
console.log("================================")
console.log("testOAuth2: " + (result_testOAuth2 ? "PASSED" : "FAILED"));
console.log("================================")

await initializeMSAccessToken();
const token = await import("../server/plugins/microsoft.ts").then(m => m.getMSAccessToken());
const result_testDeepSeek = await testDeepSeek();
console.log("================================")
console.log("testDeepSeek: " + (result_testDeepSeek ? "PASSED" : "FAILED"));
console.log("================================")
