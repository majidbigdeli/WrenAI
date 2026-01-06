import logging
import sys
from enum import Enum
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


system_prompt = load_template("generation/relationship_recommendation/system.txt")

user_prompt_template = load_template("generation/relationship_recommendation/user.txt")


## Start of Pipeline
@observe(capture_input=False)
def cleaned_models(mdl: dict) -> dict:
    def remove_display_name(d: dict) -> dict:
        if "properties" in d and isinstance(d["properties"], dict):
            d["properties"] = d["properties"].copy()
            d["properties"].pop("displayName", None)
        return d

    def column_filter(columns: list[dict]) -> list[dict]:
        filtered_columns = []
        for column in columns:
            if "relationship" not in column:
                # Create a copy of the column to avoid modifying the original
                filtered_column = column.copy()
                filtered_column = remove_display_name(filtered_column)
                filtered_columns.append(filtered_column)
        return filtered_columns

    return [
        remove_display_name(
            {**model, "columns": column_filter(model.get("columns", []))}
        )
        for model in mdl.get("models", [])
    ]


@observe(capture_input=False)
def prompt(
    cleaned_models: dict,
    prompt_builder: PromptBuilder,
    language: str,
) -> dict:
    _prompt = prompt_builder.run(models=cleaned_models, language=language)
    return {"prompt": clean_up_new_lines(_prompt.get("prompt"))}


@observe(as_type="generation", capture_input=False)
@trace_cost
async def generate(prompt: dict, generator: Any, generator_name: str) -> dict:
    return await generator(prompt=prompt.get("prompt")), generator_name


@observe(capture_input=False)
def normalized(generate: dict) -> dict:
    def wrapper(text: str) -> str:
        text = text.replace("\n", " ")
        text = " ".join(text.split())
        # Convert the normalized text to a dictionary
        try:
            text_dict = orjson.loads(text.strip())
            return text_dict
        except orjson.JSONDecodeError as e:
            logger.error(f"Error decoding JSON: {e}")
            return {}  # Return an empty dictionary if JSON decoding fails

    reply = generate.get("replies")[0]  # Expecting only one reply
    normalized = wrapper(reply)

    return normalized


@observe(capture_input=False)
def validated(normalized: dict, mdl: dict) -> dict:
    model_columns = {
        model["name"]: set(
            [
                column["name"]
                for column in model.get("columns", [])
                if not column.get("relationship")
            ]
        )
        for model in mdl.get("models", [])
    }

    relationships = normalized.get("relationships", [])
    validated_relationships = [
        relationship
        for relationship in relationships
        if RelationType.is_include(relationship.get("type"))
        and relationship.get("fromModel") in model_columns
        and relationship.get("toModel") in model_columns
        and relationship.get("fromColumn")
        in model_columns.get(relationship.get("fromModel"))
        and relationship.get("toColumn")
        in model_columns.get(relationship.get("toModel"))
    ]

    return {"relationships": validated_relationships}


## End of Pipeline
class RelationType(Enum):
    MANY_TO_ONE = "MANY_TO_ONE"
    ONE_TO_MANY = "ONE_TO_MANY"
    ONE_TO_ONE = "ONE_TO_ONE"

    @classmethod
    def is_include(cls, value: str) -> bool:
        return value in cls._value2member_map_


class ModelRelationship(BaseModel):
    name: str
    fromModel: str
    fromColumn: str
    type: RelationType
    toModel: str
    toColumn: str
    reason: str


class RelationshipResult(BaseModel):
    relationships: list[ModelRelationship]


RELATIONSHIP_RECOMMENDATION_MODEL_KWARGS = {
    "response_format": {
        "type": "json_schema",
        "json_schema": {
            "name": "semantic_description",
            "schema": RelationshipResult.model_json_schema(),
        },
    }
}


class RelationshipRecommendation(BasicPipeline):
    def __init__(
        self,
        llm_provider: LLMProvider,
        **_,
    ):
        self._components = {
            "prompt_builder": PromptBuilder(template=user_prompt_template),
            "generator": llm_provider.get_generator(
                system_prompt=system_prompt,
                generation_kwargs=RELATIONSHIP_RECOMMENDATION_MODEL_KWARGS,
            ),
            "generator_name": llm_provider.get_model(),
        }

        self._final = "validated"

        super().__init__(
            AsyncDriver({}, sys.modules[__name__], result_builder=base.DictResult())
        )

    @observe(name="Relationship Recommendation")
    async def run(
        self,
        mdl: dict,
        language: str = "English",
    ) -> dict:
        logger.info("Relationship Recommendation pipeline is running...")
        return await self._pipe.execute(
            [self._final],
            inputs={
                "mdl": mdl,
                "language": language,
                **self._components,
            },
        )
