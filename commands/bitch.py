"""
Insults the bitch wife
"""

from random import random
from nio import AsyncClient, MatrixRoom, RoomMessageText

# Command manifest
MANIFEST = {
    "name": "bitch",
    "description": "Insults the bitch wife",
    "usage": "!bitch",
    "aliases": ["nexy", "whore"],
}

WHORE_PROBABILITY = 0.1


async def execute(
    client: AsyncClient,
    config: dict,
    room: MatrixRoom,
    _event: RoomMessageText,
    _args: str,
) -> None:
    insult = "bitch"

    if random() < WHORE_PROBABILITY:
        insult = "whore"

    await client.room_send(
        room_id=room.room_id,
        message_type="m.room.message",
        content={
            "msgtype": "m.text",
            "body": f"{config['wife_id']} {insult}!",
            "format": "org.matrix.custom.html",
            "formatted_body": f'<a href="https://matrix.to/#/{config['wife_id']}">{config['wife_id']}</a> {insult}!',
            "m.mentions": {"user_ids": [config["wife_id"]]},
        },
    )
