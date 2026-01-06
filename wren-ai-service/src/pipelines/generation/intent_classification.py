import ast
import logging
import sys
from typing import Any, Literal, Optional

import orjson
from hamilton import base
from hamilton.async_driver import AsyncDriver
from haystack import Document
from haystack.components.builders.prompt_builder import PromptBuilder
from langfuse.decorators import observe
from pydantic import BaseModel

from src.core.pipeline import BasicPipeline
from src.core.provider import DocumentStoreProvider, EmbedderProvider, LLMProvider
from src.pipelines.common import build_table_ddl, clean_up_new_lines
from src.pipelines.generation.utils.sql import construct_instructions
from src.templates import load_template
from src.utils import trace_cost
from src.web.v1.services import Configuration
from src.web.v1.services.ask import AskHistory

logger = logging.getLogger("wren-ai-service")


intent_classification_system_prompt = load_template(
    "generation/intent_classification/system.txt"
)

intent_classification_user_prompt_template = load_template(
    "generation/intent_classification/user.txt"
)


## Start of Pipeline
@observe(capture_input=False, capture_output=False)
async def embedding(query: str, embedder: Any, histories: list[AskHistory]) -> dict:
    previous_query_summaries = (
        [history.question for history in histories] if histories else []
    )

    query = "\n".join(previous_query_summaries) + "\n" + query

    return await embedder.run(query)


@observe(capture_input=False)
async def table_retrieval(
    embedding: dict, project_id: str, table_retriever: Any
) -> dict:
    filters = {
        "operator": "AND",
        "conditions": [
            {"field": "type", "operator": "==", "value": "TABLE_DESCRIPTION"},
        ],
    }

    if project_id:
        filters["conditions"].append(
            {"field": "project_id", "operator": "==", "value": project_id}
        )

    return await table_retriever.run(
        query_embedding=embedding.get("embedding"),
        filters=filters,
    )


@observe(capture_input=False)
async def dbschema_retrieval(
    table_retrieval: dict, embedding: dict, project_id: str, dbschema_retriever: Any
) -> list[Document]:
    tables = table_retrieval.get("documents", [])
    table_names = []
    for table in tables:
        content = ast.literal_eval(table.content)
        table_names.append(content["name"])

    logger.info(f"dbschema_retrieval with table_names: {table_names}")

    table_name_conditions = [
        {"field": "name", "operator": "==", "value": table_name}
        for table_name in table_names
    ]

    filters = {
        "operator": "AND",
        "conditions": [
            {"field": "type", "operator": "==", "value": "TABLE_SCHEMA"},
            {"operator": "OR", "conditions": table_name_conditions},
        ],
    }

    if project_id:
        filters["conditions"].append(
            {"field": "project_id", "operator": "==", "value": project_id}
        )

    results = await dbschema_retriever.run(
        query_embedding=embedding.get("embedding"), filters=filters
    )
    return results["documents"]


@observe()
def construct_db_schemas(dbschema_retrieval: list[Document]) -> list[str]:
    db_schemas = {}
    for document in dbschema_retrieval:
        content = ast.literal_eval(document.content)
        if content["type"] == "TABLE":
            if document.meta["name"] not in db_schemas:
                db_schemas[document.meta["name"]] = content
            else:
                db_schemas[document.meta["name"]] = {
                    **content,
                    "columns": db_schemas[document.meta["name"]].get("columns", []),
                }
        elif content["type"] == "TABLE_COLUMNS":
            if document.meta["name"] not in db_schemas:
                db_schemas[document.meta["name"]] = {"columns": content["columns"]}
            else:
                if "columns" not in db_schemas[document.meta["name"]]:
                    db_schemas[document.meta["name"]]["columns"] = content["columns"]
                else:
                    db_schemas[document.meta["name"]]["columns"] += content["columns"]

    # remove incomplete schemas
    db_schemas = {k: v for k, v in db_schemas.items() if "type" in v and "columns" in v}

    db_schemas_in_ddl = []
    for table_schema in list(db_schemas.values()):
        if table_schema["type"] == "TABLE":
            ddl, _, _ = build_table_ddl(table_schema)
            db_schemas_in_ddl.append(ddl)

    return db_schemas_in_ddl


@observe(capture_input=False)
def prompt(
    query: str,
    wren_ai_docs: list[dict],
    construct_db_schemas: list[str],
    histories: list[AskHistory],
    prompt_builder: PromptBuilder,
    sql_samples: Optional[list[dict]] = None,
    instructions: Optional[list[dict]] = None,
    configuration: Configuration | None = None,
) -> dict:
    _prompt = prompt_builder.run(
        query=query,
        language=configuration.language,
        db_schemas=construct_db_schemas,
        histories=histories,
        sql_samples=sql_samples,
        instructions=construct_instructions(
            instructions=instructions,
        ),
        docs=wren_ai_docs,
    )
    return {"prompt": clean_up_new_lines(_prompt.get("prompt"))}


@observe(as_type="generation", capture_input=False)
@trace_cost
async def classify_intent(prompt: dict, generator: Any, generator_name: str) -> dict:
    return await generator(prompt=prompt.get("prompt")), generator_name


@observe(capture_input=False)
def post_process(classify_intent: dict, construct_db_schemas: list[str]) -> dict:
    try:
        results = orjson.loads(classify_intent.get("replies")[0])
        return {
            "rephrased_question": results["rephrased_question"],
            "intent": results["results"],
            "reasoning": results["reasoning"],
            "db_schemas": construct_db_schemas,
        }
    except Exception:
        return {
            "rephrased_question": "",
            "intent": "TEXT_TO_SQL",
            "reasoning": "",
            "db_schemas": construct_db_schemas,
        }


## End of Pipeline


class IntentClassificationResult(BaseModel):
    rephrased_question: str
    results: Literal["MISLEADING_QUERY", "TEXT_TO_SQL", "GENERAL", "USER_GUIDE"]
    reasoning: str


INTENT_CLASSIFICAION_MODEL_KWARGS = {
    "response_format": {
        "type": "json_schema",
        "json_schema": {
            "name": "intent_classification",
            "schema": IntentClassificationResult.model_json_schema(),
        },
    }
}


class IntentClassification(BasicPipeline):
    def __init__(
        self,
        llm_provider: LLMProvider,
        embedder_provider: EmbedderProvider,
        document_store_provider: DocumentStoreProvider,
        wren_ai_docs: list[dict],
        table_retrieval_size: Optional[int] = 50,
        table_column_retrieval_size: Optional[int] = 100,
        **kwargs,
    ):
        self._components = {
            "embedder": embedder_provider.get_text_embedder(),
            "table_retriever": document_store_provider.get_retriever(
                document_store_provider.get_store(dataset_name="table_descriptions"),
                top_k=table_retrieval_size,
            ),
            "dbschema_retriever": document_store_provider.get_retriever(
                document_store_provider.get_store(),
                top_k=table_column_retrieval_size,
            ),
            "generator": llm_provider.get_generator(
                system_prompt=intent_classification_system_prompt,
                generation_kwargs=INTENT_CLASSIFICAION_MODEL_KWARGS,
            ),
            "generator_name": llm_provider.get_model(),
            "prompt_builder": PromptBuilder(
                template=intent_classification_user_prompt_template
            ),
        }

        self._configs = {
            "wren_ai_docs": wren_ai_docs,
        }

        super().__init__(
            AsyncDriver({}, sys.modules[__name__], result_builder=base.DictResult())
        )

    @observe(name="Intent Classification")
    async def run(
        self,
        query: str,
        project_id: Optional[str] = None,
        histories: Optional[list[AskHistory]] = None,
        sql_samples: Optional[list[dict]] = None,
        instructions: Optional[list[dict]] = None,
        configuration: Configuration = Configuration(),
    ):
        logger.info("Intent Classification pipeline is running...")
        return await self._pipe.execute(
            ["post_process"],
            inputs={
                "query": query,
                "project_id": project_id or "",
                "histories": histories or [],
                "sql_samples": sql_samples or [],
                "instructions": instructions or [],
                "configuration": configuration,
                **self._components,
                **self._configs,
            },
        )
