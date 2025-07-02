import { mock } from "bun:test";

// Create a mock client that doesn't make real HTTP requests
export const createMockClient = () => ({
    client: {
        getUserId: mock(() => Promise.resolve("@bot:matrix.org")),
        getRoomMembers: mock(() =>
            Promise.resolve([
                {
                    sender: "@alice:matrix.org",
                    content: { displayname: "Alice" },
                },
                {
                    sender: "@bob:matrix.org",
                    content: { displayname: "Bob" },
                },
                {
                    sender: "@charlie:matrix.org",
                    content: { displayname: null },
                },
            ]),
        ),
    },
    isUserInRoom: mock(() => Promise.resolve(true)),
});

export const mockClient = createMockClient();
