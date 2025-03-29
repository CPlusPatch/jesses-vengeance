"""
Calls the bitch wife a furry
"""

from nio import AsyncClient, MatrixRoom, RoomMessageText

# Command manifest
MANIFEST = {
    "name": "furry",
    "description": "Calls the bitch wife a furry",
    "usage": "!furry",
    "aliases": ["furry"],
}


async def execute(
    client: AsyncClient,
    config: dict,
    room: MatrixRoom,
    _event: RoomMessageText,
    _args: str,
) -> None:
    await client.room_send(
        room_id=room.room_id,
        message_type="m.room.message",
        content={
            "msgtype": "m.text",
            "body": f"{config['wife_id']} furry!",
            "format": "org.matrix.custom.html",
            "formatted_body": f'<a href="https://matrix.to/#/{config["wife_id"]}">{config["wife_id"]}</a> furry <img src="mxc://tastytea.de/NxcwhEikyLETasCPFkZXzNrD" alt=":neocat_pat_floof:" title=":neocat_pat_floof:" data-mx-emoticon height="32">',
            "m.mentions": {"user_ids": [config["wife_id"]]},
        },
    )
