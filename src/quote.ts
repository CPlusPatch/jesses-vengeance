export const getQuote = async (
    username: string,
    text: string,
    options?: {
        avatarUrl?: string;
        displayName?: string;
    },
): Promise<string> => {
    const response = await fetch("https://api.voids.top/quote", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            username,
            display_name: options?.displayName,
            text,
            avatar: options?.avatarUrl,
            color: true,
        }),
    });

    const data = (await response.json()) as {
        success: boolean;
        url: string;
    };

    return data.url;
};
