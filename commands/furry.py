"""
Calls the bitch wife a furry
"""

import argparse
from nio import MatrixRoom, RoomMessageText
from main import MatrixBot

# Command manifest
MANIFEST = {
    "name": "furry",
    "description": "Calls the bitch wife a furry",
    "usage": "!furry",
    "aliases": ["furry"],
}


async def execute(
    client: MatrixBot,
    room: MatrixRoom,
    _event: RoomMessageText,
    _args: argparse.Namespace,
) -> None:
    await client.room_send(
        room_id=room.room_id,
        message_type="m.room.message",
        content={
            "msgtype": "m.text",
            "body": f"{client.config['wife_id']} furry!",
            "format": "org.matrix.custom.html",
            "formatted_body": f'<a href="https://matrix.to/#/{client.config["wife_id"]}">{client.config["wife_id"]}</a> furry <img src="mxc://tastytea.de/NxcwhEikyLETasCPFkZXzNrD" alt=":neocat_pat_floof:" title=":neocat_pat_floof:" data-mx-emoticon height="32">',
            "m.mentions": {"user_ids": [client.config["wife_id"]]},
        },
    )
