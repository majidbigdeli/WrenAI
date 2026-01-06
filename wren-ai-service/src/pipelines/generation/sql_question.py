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
from src.web.v1.services import Configuration

logger = logging.getLogger("wren-ai-service")


sql_question_system_prompt = load_template("generation/sql_question/system.txt")

sql_question_user_prompt_template = load_template("generation/sql_question/user.txt")


## Start of Pipeline
@observe(capture_input=False)
def prompt(
    sql: str,
    language: str,
    prompt_builder: PromptBuilder,
) -> dict:
    _prompt = prompt_builder.run(
        sql=sql,
        language=language,
    )
    return {"prompt": clean_up_new_lines(_prompt.get("prompt"))}


@observe(as_type="generation", capture_input=False)
@trace_cost
async def generate_sql_question(
    prompt: dict, generator: Any, generator_name: str
) -> dict:
    return await generator(prompt=prompt.get("prompt")), generator_name


@observe(capture_input=False)
def post_process(
    generate_sql_question: dict,
) -> str:
    return orjson.loads(generate_sql_question.get("replies")[0])["question"]


## End of Pipeline


class SQLQuestionResult(BaseModel):
    question: str


SQL_QUESTION_MODEL_KWARGS = {
    "response_format": {
        "type": "json_schema",
        "json_schema": {
            "name": "sql_question_result",
            "schema": SQLQuestionResult.model_json_schema(),
        },
    }
}


class SQLQuestion(BasicPipeline):
    def __init__(
        self,
        llm_provider: LLMProvider,
        **kwargs,
    ):
        self._components = {
            "generator": llm_provider.get_generator(
                system_prompt=sql_question_system_prompt,
                generation_kwargs=SQL_QUESTION_MODEL_KWARGS,
            ),
            "generator_name": llm_provider.get_model(),
            "prompt_builder": PromptBuilder(template=sql_question_user_prompt_template),
        }

        super().__init__(
            AsyncDriver({}, sys.modules[__name__], result_builder=base.DictResult())
        )

    @observe(name="Sql Question Generation")
    async def run(
        self,
        sql: str,
        configuration: Configuration = Configuration(),
    ):
        logger.info("Sql Question Generation pipeline is running...")
        return await self._pipe.execute(
            ["post_process"],
            inputs={
                "sql": sql,
                "language": configuration.language or "English",
                **self._components,
            },
        )
