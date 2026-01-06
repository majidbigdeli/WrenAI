import pytest

from src.core.engine import Engine
from src.pipelines.generation.utils.sql import SQLGenPostProcessor


class _FailingDryRunEngine(Engine):
    async def execute_sql(self, sql, session, dry_run=True, **kwargs):
        return (
            False,
            None,
            {
                "error_message": "boom",
                "error_sql": "SELECT 1",
                "correlation_id": "cid-123",
            },
        )


@pytest.mark.asyncio
async def test_dry_run_failure_reports_original_sql():
    processor = SQLGenPostProcessor(engine=_FailingDryRunEngine())

    raw_sql = "  SELECT * FROM books LIMIT 5;  "

    result = await processor.run([raw_sql])
    invalid = result["invalid_generation_result"]

    assert invalid["sql"] == raw_sql
    assert invalid["original_sql"] == raw_sql
    assert invalid["engine_sql"] == "SELECT 1"
    assert invalid["error"] == "boom"
    assert invalid["type"] == "DRY_RUN"
    assert invalid["correlation_id"] == "cid-123"
