import logging
import sys
from typing import Any, Dict

import orjson
from hamilton import base
from hamilton.async_driver import AsyncDriver
from haystack.components.builders.prompt_builder import PromptBuilder
from langfuse.decorators import observe

from src.core.pipeline import BasicPipeline
from src.core.provider import LLMProvider
from src.pipelines.common import clean_up_new_lines
from src.pipelines.generation.utils.chart import (
    ChartDataPreprocessor,
    ChartGenerationPostProcessor,
    ChartGenerationResults,
    chart_generation_instructions,
)
from src.templates import load_template, render_template
from src.utils import trace_cost
from src.web.v1.services.chart_adjustment import ChartAdjustmentOption

logger = logging.getLogger("wren-ai-service")


chart_adjustment_system_prompt = render_template(
    "generation/chart_adjustment/system.txt",
    chart_generation_instructions=chart_generation_instructions,
)

chart_adjustment_user_prompt_template = load_template(
    "generation/chart_adjustment/user.txt"
)


## Start of Pipeline
@observe(capture_input=False)
def preprocess_data(
    data: Dict[str, Any], chart_data_preprocessor: ChartDataPreprocessor
) -> dict:
    return chart_data_preprocessor.run(data)


@observe(capture_input=False)
def prompt(
    query: str,
    sql: str,
    adjustment_option: ChartAdjustmentOption,
    chart_schema: dict,
    preprocess_data: dict,
    language: str,
    prompt_builder: PromptBuilder,
) -> dict:
    sample_data = preprocess_data.get("sample_data")
    sample_column_values = preprocess_data.get("sample_column_values")

    _prompt = prompt_builder.run(
        query=query,
        sql=sql,
        adjustment_option=adjustment_option,
        chart_schema=chart_schema,
        sample_data=sample_data,
        sample_column_values=sample_column_values,
        language=language,
    )
    return {"prompt": clean_up_new_lines(_prompt.get("prompt"))}


@observe(as_type="generation", capture_input=False)
@trace_cost
async def generate_chart_adjustment(
    prompt: dict,
    generator: Any,
    generator_name: str,
) -> dict:
    return await generator(prompt=prompt.get("prompt")), generator_name


@observe(capture_input=False)
def post_process(
    generate_chart_adjustment: dict,
    vega_schema: Dict[str, Any],
    preprocess_data: dict,
    post_processor: ChartGenerationPostProcessor,
) -> dict:
    return post_processor.run(
        generate_chart_adjustment.get("replies"),
        vega_schema,
        preprocess_data["sample_data"],
    )


## End of Pipeline
CHART_ADJUSTMENT_MODEL_KWARGS = {
    "response_format": {
        "type": "json_schema",
        "json_schema": {
            "name": "chart_adjustment_results",
            "schema": ChartGenerationResults.model_json_schema(),
        },
    }
}


class ChartAdjustment(BasicPipeline):
    def __init__(
        self,
        llm_provider: LLMProvider,
        **kwargs,
    ):
        self._components = {
            "prompt_builder": PromptBuilder(
                template=chart_adjustment_user_prompt_template
            ),
            "generator": llm_provider.get_generator(
                system_prompt=chart_adjustment_system_prompt,
                generation_kwargs=CHART_ADJUSTMENT_MODEL_KWARGS,
            ),
            "generator_name": llm_provider.get_model(),
            "chart_data_preprocessor": ChartDataPreprocessor(),
            "post_processor": ChartGenerationPostProcessor(),
        }

        with open("src/pipelines/generation/utils/vega-lite-schema-v5.json", "r") as f:
            _vega_schema = orjson.loads(f.read())

        self._configs = {
            "vega_schema": _vega_schema,
        }
        super().__init__(
            AsyncDriver({}, sys.modules[__name__], result_builder=base.DictResult())
        )

    @observe(name="Chart Adjustment")
    async def run(
        self,
        query: str,
        sql: str,
        adjustment_option: ChartAdjustmentOption,
        chart_schema: dict,
        data: dict,
        language: str,
    ) -> dict:
        logger.info("Chart Adjustment pipeline is running...")

        return await self._pipe.execute(
            ["post_process"],
            inputs={
                "query": query,
                "sql": sql,
                "adjustment_option": adjustment_option,
                "chart_schema": chart_schema,
                "data": data,
                "language": language,
                **self._components,
                **self._configs,
            },
        )
