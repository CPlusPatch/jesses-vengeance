"""
Main module for the Matrix bot.
"""

import asyncio
import json
import logging
import os
import random
import importlib
import inspect
import time
from typing import Dict
from nio import (
    AsyncClient,
    AsyncClientConfig,
    MatrixRoom,
    RoomMessageText,
    LoginResponse,
    InviteMemberEvent,
    logger as nio_logger,
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set nio logging to WARNING (nio uses the logging library)
nio_logger.setLevel(level=logging.WARNING)


class MatrixBot:
    """
    Main bot class.
    """

    def __init__(
        self, config_path: str = "config.json", responses_path: str = "responses.json"
    ):
        self.config = self._load_config(config_path)
        self.responses = self._load_responses(responses_path)
        self.credentials_file = "credentials.json"
        self.commands = {}  # Dictionary to store loaded commands
        self.command_aliases = {}  # Dictionary to map aliases to command names
        self.last_response_times = (
            {}
        )  # Dictionary to track last response times per room

        # If store path doesn't exist, create it
        if not os.path.exists(self.config["store_path"]):
            os.makedirs(self.config["store_path"])

        # Initialize the Matrix client
        self.client = AsyncClient(
            self.config["homeserver_url"],
            self.config["user_id"],
            store_path=self.config["store_path"],
            config=AsyncClientConfig(
                max_limit_exceeded=0,
                max_timeouts=0,
                store_sync_tokens=True,
                encryption_enabled=True,
            ),
        )

        # Load commands
        self._load_commands()

    def _load_commands(self) -> None:
        """Load all commands from the commands directory."""
        commands_dir = os.path.join(os.path.dirname(__file__), "commands")
        for filename in os.listdir(commands_dir):
            if filename.endswith(".py") and not filename.startswith("__"):
                module_name = f"commands.{filename[:-3]}"
                try:
                    # Import the command module
                    module = importlib.import_module(module_name)

                    # Get the manifest and execute function
                    manifest = getattr(module, "MANIFEST", None)
                    execute_func = getattr(module, "execute", None)

                    if (
                        manifest
                        and execute_func
                        and inspect.iscoroutinefunction(execute_func)
                    ):
                        command_name = manifest["name"]
                        self.commands[command_name] = {
                            "manifest": manifest,
                            "execute": execute_func,
                        }

                        # Register aliases
                        for alias in manifest.get("aliases", []):
                            self.command_aliases[alias] = command_name

                        logger.info("Loaded command: %s", command_name)
                    else:
                        logger.warning("Invalid command module: %s", module_name)
                except Exception as e:
                    logger.error("Failed to load command %s: %s", module_name, e)

    def _load_config(self, config_path: str) -> Dict:
        """Load configuration from JSON file."""
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            logger.error("Config file %s not found!", config_path)
            raise

    def _load_responses(self, responses_path: str) -> Dict[str, str]:
        """Load keyword responses from JSON file."""
        try:
            with open(responses_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            logger.error("Responses file %s not found!", responses_path)
            raise

    def _save_credentials(self, resp: LoginResponse) -> None:
        """Save login credentials to disk."""
        credentials = {
            "homeserver": self.config["homeserver_url"],
            "user_id": resp.user_id,
            "device_id": resp.device_id,
            "access_token": resp.access_token,
        }
        with open(self.credentials_file, "w", encoding="utf-8") as f:
            json.dump(credentials, f)

    def _load_credentials(self) -> Dict:
        """Load login credentials from disk."""
        try:
            with open(self.credentials_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            return None

    def _can_respond(self, room_id: str) -> bool:
        """
        Check if enough time has passed since the last response in this room.

        Args:
            room_id: The room ID to check cooldown for

        Returns:
            bool: True if the bot can respond, False if still in cooldown
        """
        current_time = time.time()
        last_time = self.last_response_times.get(room_id, 0)
        cooldown = self.config.get(
            "response_cooldown", 60
        )  # Default 60 seconds cooldown

        if current_time - last_time >= cooldown:
            self.last_response_times[room_id] = current_time
            return True
        return False

    async def message_callback(self, room: MatrixRoom, event: RoomMessageText) -> None:
        """Handle incoming messages."""
        # Ignore messages from the bot itself
        if event.sender == self.config["user_id"]:
            return

        message = event.body.lower()
        command_prefix = self.config["command_prefix"]

        # Handle commands
        if message.startswith(command_prefix):
            command_text = message[len(command_prefix) :].strip()
            command_parts = command_text.split(maxsplit=1)
            command_name = command_parts[0]
            args = command_parts[1] if len(command_parts) > 1 else ""

            # Check if it's a command or alias
            if command_name in self.commands:
                command = self.commands[command_name]
            elif command_name in self.command_aliases:
                command = self.commands[self.command_aliases[command_name]]
            else:
                return

            try:
                await command["execute"](self.client, self.config, room, event, args)
            except Exception as e:
                logger.error("Error executing command %s: %s", command_name, e)
                await self.client.room_send(
                    room_id=room.room_id,
                    message_type="m.room.message",
                    content={
                        "msgtype": "m.text",
                        "body": f"Error executing command: {str(e)}",
                    },
                )
            return

        # Handle keyword responses with cooldown
        if self._can_respond(room.room_id):
            for keyword, responses in self.responses.items():
                # Keywords can either be a string or a list of strings
                response = (
                    responses
                    if isinstance(responses, str)
                    else random.choice(responses)
                )

                if keyword.lower() in message.lower():
                    await self.client.room_send(
                        room_id=room.room_id,
                        message_type="m.room.message",
                        content={"msgtype": "m.text", "body": response},
                    )
                    break

    async def invite_callback(self, room: MatrixRoom, event: InviteMemberEvent) -> None:
        """Handle room invites."""
        if event.membership == "invite" and event.state_key == self.config["user_id"]:
            logger.info("Received invite to room %s", room.room_id)
            try:
                await self.client.join(room.room_id)
                logger.info("Joined room %s", room.room_id)
                # Send a welcome message
                await self.client.room_send(
                    room_id=room.room_id,
                    message_type="m.room.message",
                    content={
                        "msgtype": "m.text",
                        "body": "Hello bitches!",
                    },
                )
            except Exception as e:
                logger.error("Failed to join room %s: %s", room.room_id, e)

    async def start(self) -> None:
        """Start the bot."""
        # Add message callback
        self.client.add_event_callback(self.message_callback, RoomMessageText)
        # Add invite callback
        self.client.add_event_callback(self.invite_callback, InviteMemberEvent)

        # Try to load existing credentials
        credentials = self._load_credentials()

        if credentials:
            # Restore login using stored credentials
            self.client.restore_login(
                user_id=credentials["user_id"],
                device_id=credentials["device_id"],
                access_token=credentials["access_token"],
            )
            logger.info("Logged in using stored credentials")
        else:
            # First time login with password
            password = input("Enter your bot's password: ")
            resp = await self.client.login(password)

            if not isinstance(resp, LoginResponse):
                logger.error("Failed to log in: %s", resp)
                return

            # Save credentials for future use
            self._save_credentials(resp)
            logger.info("Logged in as %s and saved credentials", resp.user_id)

        # Sync encryption keys
        if self.client.should_upload_keys:
            await self.client.keys_upload()

        # Start syncing
        await self.client.sync_forever(timeout=30000)


async def main() -> None:
    """Main entry point."""
    bot = MatrixBot()
    try:
        await bot.start()
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt, shutting down...")
    except Exception as e:
        logger.error("Error: %s", e)
    finally:
        await bot.client.close()


if __name__ == "__main__":
    asyncio.run(main())
