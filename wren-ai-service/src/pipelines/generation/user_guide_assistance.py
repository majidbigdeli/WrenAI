import asyncio
import logging
import sys
from typing import Any, Optional

from hamilton import base
from hamilton.async_driver import AsyncDriver
from haystack.components.builders.prompt_builder import PromptBuilder
from langfuse.decorators import observe

from src.core.pipeline import BasicPipeline
from src.core.provider import LLMProvider
from src.pipelines.common import clean_up_new_lines
from src.templates import load_template
from src.utils import trace_cost

logger = logging.getLogger("wren-ai-service")


user_guide_assistance_system_prompt = load_template(
    "generation/user_guide_assistance/system.txt"
)

user_guide_assistance_user_prompt_template = load_template(
    "generation/user_guide_assistance/user.txt"
)


## Start of Pipeline
@observe(capture_input=False)
def prompt(
    query: str,
    language: str,
    wren_ai_docs: list[dict],
    prompt_builder: PromptBuilder,
    custom_instruction: str,
) -> dict:
    _prompt = prompt_builder.run(
        query=query,
        language=language,
        docs=wren_ai_docs,
        custom_instruction=custom_instruction,
    )
    return {"prompt": clean_up_new_lines(_prompt.get("prompt"))}


@observe(as_type="generation", capture_input=False)
@trace_cost
async def user_guide_assistance(
    prompt: dict, generator: Any, query_id: str, generator_name: str
) -> dict:
    return await generator(
        prompt=prompt.get("prompt"), query_id=query_id
    ), generator_name


## End of Pipeline


class UserGuideAssistance(BasicPipeline):
    def __init__(
        self,
        llm_provider: LLMProvider,
        wren_ai_docs: list[dict],
        **kwargs,
    ):
        self._user_queues = {}
        self._components = {
            "generator": llm_provider.get_generator(
                system_prompt=user_guide_assistance_system_prompt,
                streaming_callback=self._streaming_callback,
            ),
            "generator_name": llm_provider.get_model(),
            "prompt_builder": PromptBuilder(
                template=user_guide_assistance_user_prompt_template
            ),
        }
        self._configs = {
            "wren_ai_docs": wren_ai_docs,
        }

        super().__init__(
            AsyncDriver({}, sys.modules[__name__], result_builder=base.DictResult())
        )

    def _streaming_callback(self, chunk, query_id):
        if query_id not in self._user_queues:
            self._user_queues[
                query_id
            ] = asyncio.Queue()  # Create a new queue for the user if it doesn't exist
        # Put the chunk content into the user's queue
        asyncio.create_task(self._user_queues[query_id].put(chunk.content))
        if chunk.meta.get("finish_reason"):
            asyncio.create_task(self._user_queues[query_id].put("<DONE>"))

    async def get_streaming_results(self, query_id):
        async def _get_streaming_results(query_id):
            return await self._user_queues[query_id].get()

        if query_id not in self._user_queues:
            self._user_queues[query_id] = asyncio.Queue()

        while True:
            try:
                # Wait for an item from the user's queue
                self._streaming_results = await asyncio.wait_for(
                    _get_streaming_results(query_id), timeout=120
                )
                if (
                    self._streaming_results == "<DONE>"
                ):  # Check for end-of-stream signal
                    del self._user_queues[query_id]
                    break
                if self._streaming_results:  # Check if there are results to yield
                    yield self._streaming_results
                    self._streaming_results = ""  # Clear after yielding
            except TimeoutError:
                break

    @observe(name="User Guide Assistance")
    async def run(
        self,
        query: str,
        language: str,
        query_id: Optional[str] = None,
        custom_instruction: Optional[str] = None,
    ):
        logger.info("User Guide Assistance pipeline is running...")
        return await self._pipe.execute(
            ["user_guide_assistance"],
            inputs={
                "query": query,
                "language": language,
                "query_id": query_id or "",
                "custom_instruction": custom_instruction or "",
                **self._components,
                **self._configs,
            },
        )
