"""Base model shared by the API contracts."""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Serialises to camelCase JSON (matching the TypeScript types) and also accepts snake_case."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
