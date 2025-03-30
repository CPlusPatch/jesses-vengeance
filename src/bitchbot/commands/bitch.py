"""
Insults the bitch wife
"""

from random import random
import argparse
from nio import MatrixRoom, RoomMessageText
from bitchbot import MatrixBot

# Command manifest
MANIFEST = {
    "name": "bitch",
    "description": "Insults the bitch wife",
    "usage": "!bitch",
    "arguments": [
        {
            "name": "--repeat",
            "aliases": ["-r"],
            "type": int,
            "help": "Number of times to repeat the message",
            "default": 1,
        },
        {
            "name": "--user",
            "aliases": ["-u"],
            "help": "The user to insult",
        },
    ],
}

WHORE_PROBABILITY = 0.1


async def execute(
    client: MatrixBot,
    room: MatrixRoom,
    _event: RoomMessageText,
    args: argparse.Namespace,
) -> None:
    user = args.user or client.config["wife_id"]
    insult = "bi­­tch"

    if random() < WHORE_PROBABILITY:
        insult = "wh­­ore"

    for _ in range(args.repeat):
        await client.room_send(
            room_id=room.room_id,
            message_type="m.room.message",
            content={
                "msgtype": "m.text",
                "body": f"{user} {insult}!",
                "format": "org.matrix.custom.html",
                "formatted_body": f'<a href="https://matrix.to/#/{user}">{user}</a> {insult}!',
                "m.mentions": {"user_ids": [user]},
            },
        )
