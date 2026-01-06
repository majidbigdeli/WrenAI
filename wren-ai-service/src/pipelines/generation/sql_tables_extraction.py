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


sql_tables_extraction_system_prompt = load_template(
    "generation/sql_tables_extraction/system.txt"
)

sql_tables_extraction_user_prompt_template = load_template(
    "generation/sql_tables_extraction/user.txt"
)


## Start of Pipeline
@observe(capture_input=False)
def prompt(
    sql: str,
    prompt_builder: PromptBuilder,
) -> dict:
    _prompt = prompt_builder.run(sql=sql)
    return {"prompt": clean_up_new_lines(_prompt.get("prompt"))}


@observe(as_type="generation", capture_input=False)
@trace_cost
async def extract_sql_tables(prompt: dict, generator: Any, generator_name: str) -> dict:
    return await generator(prompt=prompt.get("prompt")), generator_name


@observe(capture_input=False)
async def post_process(
    extract_sql_tables: dict,
) -> list[str]:
    return orjson.loads(extract_sql_tables.get("replies")[0])["tables"]


## End of Pipeline


class SQLTablesExtractionResult(BaseModel):
    tables: list[str]


SQL_TABLES_EXTRACTION_MODEL_KWARGS = {
    "response_format": {
        "type": "json_schema",
        "json_schema": {
            "name": "sql_tables_extraction_result",
            "schema": SQLTablesExtractionResult.model_json_schema(),
        },
    }
}


class SQLTablesExtraction(BasicPipeline):
    def __init__(
        self,
        llm_provider: LLMProvider,
        **kwargs,
    ):
        self._components = {
            "generator": llm_provider.get_generator(
                system_prompt=sql_tables_extraction_system_prompt,
                generation_kwargs=SQL_TABLES_EXTRACTION_MODEL_KWARGS,
            ),
            "generator_name": llm_provider.get_model(),
            "prompt_builder": PromptBuilder(
                template=sql_tables_extraction_user_prompt_template
            ),
        }

        super().__init__(
            AsyncDriver({}, sys.modules[__name__], result_builder=base.DictResult())
        )

    @observe(name="Sql Tables Extraction")
    async def run(
        self,
        sql: str,
    ):
        logger.info("Sql Tables Extraction pipeline is running...")
        return await self._pipe.execute(
            ["post_process"],
            inputs={
                "sql": sql,
                **self._components,
            },
        )
