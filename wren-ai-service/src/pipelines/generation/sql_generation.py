import logging
import sys
from pathlib import Path
from typing import Any

from hamilton import base
from hamilton.async_driver import AsyncDriver
from haystack.components.builders.prompt_builder import PromptBuilder
from langfuse.decorators import observe

from src.core.engine import Engine
from src.core.pipeline import BasicPipeline
from src.core.provider import DocumentStoreProvider, LLMProvider
from src.pipelines.common import clean_up_new_lines, retrieve_metadata
from src.pipelines.generation.utils.sql import (
    SQL_GENERATION_MODEL_KWARGS,
    SQLGenPostProcessor,
    construct_instructions,
    get_calculated_field_instructions,
    get_json_field_instructions,
    get_metric_instructions,
    get_sql_generation_system_prompt,
)
from src.pipelines.retrieval.sql_functions import SqlFunction
from src.pipelines.retrieval.sql_knowledge import SqlKnowledge
from src.templates import load_template
from src.utils import trace_cost

logger = logging.getLogger("wren-ai-service")

# ===============================
# Template loading from /template
# ===============================
# __file__ = wren-ai-service/src/pipelines/generation/sql_generation.py
# parents[0] -> .../src/pipelines/generation
# parents[1] -> .../src/pipelines
# parents[2] -> .../src
# parents[3] -> .../wren-ai-service  (root)
BASE_DIR = Path(__file__).resolve().parents[3]

<<<<<<< HEAD
sql_generation_user_prompt_template = load_template(
    "generation/sql_generation/user.txt"
)
=======
TEMPLATE_DIR = BASE_DIR / "template"
SQL_GENERATION_TEMPLATE_PATH = TEMPLATE_DIR / "sql_generation_user_prompt_template.jinja2"


def load_template(path: Path) -> str:
    """Read a template file as UTF-8 text."""
    if not path.exists():
        raise FileNotFoundError(f"Template file not found: {path}")
    return path.read_text(encoding="utf-8")


sql_generation_user_prompt_template: str = load_template(SQL_GENERATION_TEMPLATE_PATH)


# ===============================
# Start of Pipeline
# ===============================
>>>>>>> 1fcd5766 (.)


@observe(capture_input=False)
def prompt(
    query: str,
    documents: list[str],
    prompt_builder: PromptBuilder,
    sql_generation_reasoning: str | None = None,
    sql_samples: list[dict] | None = None,
    instructions: list[dict] | None = None,
    has_calculated_field: bool = False,
    has_metric: bool = False,
    has_json_field: bool = False,
    sql_functions: list[SqlFunction] | None = None,
    sql_knowledge: SqlKnowledge | None = None,
) -> dict:
    _prompt = prompt_builder.run(
        query=query,
        documents=documents,
        sql_generation_reasoning=sql_generation_reasoning,
        instructions=construct_instructions(
            instructions=instructions,
        ),
        calculated_field_instructions=(
            get_calculated_field_instructions(sql_knowledge)
            if has_calculated_field
            else ""
        ),
        metric_instructions=(
            get_metric_instructions(sql_knowledge) if has_metric else ""
        ),
        json_field_instructions=(
            get_json_field_instructions(sql_knowledge) if has_json_field else ""
        ),
        sql_samples=sql_samples,
        sql_functions=sql_functions,
    )
    return {"prompt": clean_up_new_lines(_prompt.get("prompt"))}


@observe(as_type="generation", capture_input=False)
@trace_cost
async def generate_sql(
    prompt: dict,
    generator: Any,
    generator_name: str,
    sql_knowledge: SqlKnowledge | None = None,
) -> dict:
<<<<<<< HEAD
    current_system_prompt = get_sql_generation_system_prompt(sql_knowledge)
    return await generator(
        prompt=prompt.get("prompt"), current_system_prompt=current_system_prompt
    ), generator_name
=======
    # همون رفتاری که قبلاً داشتی، فقط تمپلیتش از فایل میاد
    return await generator(prompt=prompt.get("prompt")), generator_name
>>>>>>> 1fcd5766 (.)


@observe(capture_input=False)
async def post_process(
    generate_sql: dict,
    post_processor: SQLGenPostProcessor,
    data_source: str,
    project_id: str | None = None,
    use_dry_plan: bool = False,
    allow_dry_plan_fallback: bool = True,
    allow_data_preview: bool = False,
) -> dict:
    return await post_processor.run(
        generate_sql.get("replies"),
        project_id=project_id,
        use_dry_plan=use_dry_plan,
        data_source=data_source,
        allow_dry_plan_fallback=allow_dry_plan_fallback,
        allow_data_preview=allow_data_preview,
    )


# ===============================
# End of Pipeline
# ===============================


class SQLGeneration(BasicPipeline):
    def __init__(
        self,
        llm_provider: LLMProvider,
        document_store_provider: DocumentStoreProvider,
        engine: Engine,
        **kwargs,
    ):
        self._retriever = document_store_provider.get_retriever(
            document_store_provider.get_store("project_meta")
        )

        self._components = {
            "generator": llm_provider.get_generator(
                system_prompt=get_sql_generation_system_prompt(None),
                generation_kwargs=SQL_GENERATION_MODEL_KWARGS,
            ),
            "generator_name": llm_provider.get_model(),
            "prompt_builder": PromptBuilder(
                template=sql_generation_user_prompt_template
            ),
            "post_processor": SQLGenPostProcessor(engine=engine),
        }

        super().__init__(
            AsyncDriver({}, sys.modules[__name__], result_builder=base.DictResult())
        )

    @observe(name="SQL Generation")
    async def run(
        self,
        query: str,
        contexts: list[str],
        sql_generation_reasoning: str | None = None,
        sql_samples: list[dict] | None = None,
        instructions: list[dict] | None = None,
        project_id: str | None = None,
        has_calculated_field: bool = False,
        has_metric: bool = False,
        has_json_field: bool = False,
        sql_functions: list[SqlFunction] | None = None,
        use_dry_plan: bool = False,
        allow_dry_plan_fallback: bool = True,
        allow_data_preview: bool = False,
        sql_knowledge: SqlKnowledge | None = None,
    ):
        logger.info("SQL Generation pipeline is running...")

        if use_dry_plan:
            metadata = await retrieve_metadata(project_id or "", self._retriever)
        else:
            metadata = {}

        return await self._pipe.execute(
            ["post_process"],
            inputs={
                "query": query,
                "documents": contexts,
                "sql_generation_reasoning": sql_generation_reasoning,
                "sql_samples": sql_samples,
                "instructions": instructions,
                "project_id": project_id,
                "has_calculated_field": has_calculated_field,
                "has_metric": has_metric,
                "has_json_field": has_json_field,
                "sql_functions": sql_functions,
                "use_dry_plan": use_dry_plan,
                "allow_dry_plan_fallback": allow_dry_plan_fallback,
                "data_source": metadata.get("data_source", "local_file"),
                "allow_data_preview": allow_data_preview,
                "sql_knowledge": sql_knowledge,
                **self._components,
            },
        )
