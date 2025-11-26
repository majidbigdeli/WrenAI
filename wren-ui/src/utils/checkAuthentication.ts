import { Path } from "./enum";

// utils/checkAuthentication.ts
export const checkAuthentication = async () => {
    try {
        console.log("checkAuthentication running...");

        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) {
            console.warn("No access token found. Redirecting to /");
            window.location.replace("/");
            return;
        }

        const isLocalHost = window.location.origin.includes("localhost");
        const apiUrl = `${isLocalHost ? "https://dev.test.payamgostar.com" : window.location.origin}/api/v2/user/profile`;

        const response = await fetch(apiUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            console.warn("Error fetching user profile. Redirecting to /");
            window.location.replace("/");
            return;
        }

        console.log("User is authenticated. Redirecting to /home");
        if (!window.location.pathname.includes(Path.Home))
            window.location.replace(Path.Home);

    } catch (error) {
        console.error("checkAuthentication error:", error);
        window.location.replace("/");
    }
};
