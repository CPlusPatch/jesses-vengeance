import { client } from "../index.ts";

const SHOP_KEY = "shop";

export interface ShopItem {
    id: string;
    name: string;
    price: number;
    description?: string;
}

export const shopItems: ShopItem[] = [
    {
        id: "rock",
        name: "Rock",
        price: 10,
        description: "Dav's favourite object!",
    },
    {
        id: "getaway-van",
        name: "Getaway van",
        price: 200,
        description:
            "Increases your odds of stealing, but if you get caught, you'll get towed!",
    },
    {
        id: "nexy",
        name: "Nexy",
        price: 300,
        description: "The best friend a bit­­ch could ask for",
    },
    {
        id: "one-evening-with-jesse",
        name: "One evening with Jesse",
        price: 10_000,
        description:
            "Jesse is a good girl, but you know how you could be an even better girl? That's right, give me 10,000 quid!",
    },
];

export const getOwnedItems = async (userId: string): Promise<ShopItem[]> => {
    const itemIdsJson = await client.redis.hGet(SHOP_KEY, userId);

    if (!itemIdsJson) {
        return [];
    }

    const itemIds: string[] = JSON.parse(itemIdsJson);
    return itemIds
        .map((id) => shopItems.find((item) => item.id === id))
        .filter((item): item is ShopItem => item !== undefined);
};

export const setOwnedItems = async (
    userId: string,
    items: ShopItem[],
): Promise<void> => {
    const itemIds = items.map((item) => item.id);
    await client.redis.hSet(SHOP_KEY, userId, JSON.stringify(itemIds));
};

export const addOwnedItem = async (
    userId: string,
    item: ShopItem,
): Promise<void> => {
    const currentItems = await getOwnedItems(userId);
    if (!currentItems.some((i) => i.id === item.id)) {
        currentItems.push(item);
        await setOwnedItems(userId, currentItems);
    }
};

export const removeOwnedItem = async (
    userId: string,
    itemId: string,
): Promise<void> => {
    const currentItems = await getOwnedItems(userId);
    const updatedItems = currentItems.filter((item) => item.id !== itemId);
    await setOwnedItems(userId, updatedItems);
};

export const ownsItem = async (
    userId: string,
    itemId: string,
): Promise<boolean> => {
    const currentItems = await getOwnedItems(userId);
    return currentItems.some((item) => item.id === itemId);
};
