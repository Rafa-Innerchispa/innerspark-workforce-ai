#!/usr/bin/env python3
"""One-shot MCP tool call for femar server-side bridges (reads MCP_API_KEY from env)."""

from __future__ import annotations

import asyncio
import json
import os
import sys

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client


async def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "usage: mcp_tool_call.py <tool_name> [json_args]"}))
        sys.exit(1)

    tool = sys.argv[1]
    args = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    url = os.getenv("RALFIA_MCP_URL", "http://127.0.0.1:8102/mcp")
    headers = {}
    if os.getenv("MCP_API_KEY"):
        headers["X-API-Key"] = os.environ["MCP_API_KEY"]

    async with streamablehttp_client(url, headers=headers) as (read_stream, write_stream, _):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            result = await session.call_tool(tool, args)
            payload = result.structuredContent
            if payload is None and result.content:
                text = "".join(getattr(part, "text", "") or "" for part in result.content)
                try:
                    payload = json.loads(text)
                except json.JSONDecodeError:
                    payload = {"ok": True, "text": text}
            print(json.dumps(payload or {"ok": False, "error": "empty_result"}, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
