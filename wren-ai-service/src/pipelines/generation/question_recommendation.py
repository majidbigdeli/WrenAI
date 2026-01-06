import logging
import sys
from typing import Any

import orjson
from hamilton import base
from hamilton.async_driver import AsyncDriver
from haystack.components.builders.prompt_builder import PromptBuilder
from langfuse.decorators import observe
from pydantic import BaseModel

from src.core.pipeline import BasicPipeline
from src.core.provider import LLMProvider
from src.pipelines.common import clean_up_new_lines
from src.templates import load_template
from src.utils import trace_cost

logger = logging.getLogger("wren-ai-service")


system_prompt = load_template("generation/question_recommendation/system.txt")

user_prompt_template = load_template("generation/question_recommendation/user.txt")


## Start of Pipeline
@observe(capture_input=False)
def prompt(
    previous_questions: list[str],
    documents: list,
    language: str,
    max_questions: int,
    max_categories: int,
    prompt_builder: PromptBuilder,
) -> dict:
    """
    If previous_questions is provided, the MDL is omitted to allow the LLM to focus on
    generating recommendations based on the question history. This helps provide more
    contextually relevant questions that build on previous questions.
    """

    _prompt = prompt_builder.run(
        documents=documents,
        previous_questions=previous_questions,
        language=language,
        max_questions=max_questions,
        max_categories=max_categories,
    )
    return {"prompt": clean_up_new_lines(_prompt.get("prompt"))}


@observe(as_type="generation", capture_input=False)
@trace_cost
async def generate(prompt: dict, generator: Any, generator_name: str) -> dict:
    return await generator(prompt=prompt.get("prompt")), generator_name


@observe(capture_input=False)
def normalized(generate: dict) -> dict:
    def wrapper(text: str) -> list:
        text = text.replace("\n", " ")
        text = " ".join(text.split())
        try:
            text_list = orjson.loads(text.strip())
            return text_list
        except orjson.JSONDecodeError as e:
            logger.error(f"Error decoding JSON: {e}")
            return []  # Return an empty list if JSON decoding fails

    reply = generate.get("replies")[0]  # Expecting only one reply
    normalized = wrapper(reply)

    return normalized


## End of Pipeline
class Question(BaseModel):
    question: str
    category: str


class QuestionResult(BaseModel):
    questions: list[Question]


QUESTION_RECOMMENDATION_MODEL_KWARGS = {
    "response_format": {
        "type": "json_schema",
        "json_schema": {
            "name": "question_recommendation",
            "schema": QuestionResult.model_json_schema(),
        },
    }
}


class QuestionRecommendation(BasicPipeline):
    def __init__(
        self,
        llm_provider: LLMProvider,
        **_,
    ):
        self._components = {
            "prompt_builder": PromptBuilder(template=user_prompt_template),
            "generator": llm_provider.get_generator(
                system_prompt=system_prompt,
                generation_kwargs=QUESTION_RECOMMENDATION_MODEL_KWARGS,
            ),
            "generator_name": llm_provider.get_model(),
        }

        self._final = "normalized"

        super().__init__(
            AsyncDriver({}, sys.modules[__name__], result_builder=base.DictResult())
        )

    @observe(name="Question Recommendation")
    async def run(
        self,
        contexts: list[str],
        previous_questions: list[str] = [],
        categories: list[str] = [],
        language: str = "en",
        max_questions: int = 5,
        max_categories: int = 3,
        **_,
    ) -> dict:
        logger.info("Question Recommendation pipeline is running...")
        return await self._pipe.execute(
            [self._final],
            inputs={
                "documents": contexts,
                "previous_questions": previous_questions,
                "categories": categories,
                "language": language,
                "max_questions": max_questions,
                "max_categories": max_categories,
                **self._components,
            },
        )
