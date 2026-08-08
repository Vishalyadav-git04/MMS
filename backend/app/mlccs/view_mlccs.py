"""View MLCCS — Weapon → MLCCS using Native SQL.

Search / list / class-of-eqpt options against MMS_MLCCS_EQUIPMENT_MASTER.
Mirrors frontend src/components/mlccs/ViewMlccs.tsx.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.deps import get_db_session
from app.db.native_utils import fetch_all, fetch_one

router = APIRouter(
    prefix="/mlccs",
    tags=["mlccs: view mlccs"],
)


class MlccsSearchRequest(BaseModel):
    text: str | None = None
    field: str = Field(
        default="Nomenclature",
        description="Nomenclature | Census No | Material No | Cat Part No",
    )
    class_of_eqpt: str | None = None
    result_q: str | None = Field(
        default=None,
        description="Optional secondary filter across visible result columns",
    )
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=5000)


class MlccsListItem(BaseModel):
    id: str | int
    material_no: str | None = None
    census_no: str | None = None
    nomenclature: str | None = None
    class_of_eqpt: str | None = None
    cat_part_no: str | None = None
    au: str | None = None
    status: str | None = None


class MlccsSearchResponse(BaseModel):
    items: list[MlccsListItem]
    total: int
    page: int
    page_size: int


@router.get("/status")
def mlccs_status() -> dict[str, str]:
    return {"module": "mlccs", "status": "ok"}


@router.get("/options")
def mlccs_options(session: Session = Depends(get_db_session)) -> dict[str, list[dict[str, str]]]:
    """Class-of-eqpt (and related) dropdown values from the master table."""
    sql = "SELECT DISTINCT class_category FROM MMS_MLCCS_EQUIPMENT_MASTER WHERE class_category IS NOT NULL ORDER BY class_category"
    rows = fetch_all(session, sql)
    class_of_eqpt = [
        {"value": str(r["class_category"]), "label": str(r["class_category"])}
        for r in rows
        if r.get("class_category") and str(r["class_category"]).strip()
    ]
    return {"class_of_eqpt": class_of_eqpt}


def _build_where_clause(
    body: MlccsSearchRequest,
    opstatus_map: dict[str, str] | None = None,
) -> tuple[str, dict[str, Any], str, dict[str, Any]]:
    sql_where = " WHERE 1=1"
    params: dict[str, Any] = {}
    order_params: dict[str, Any] = {}

    if body.class_of_eqpt and body.class_of_eqpt.strip():
        sql_where += " AND UPPER(class_category) = :ceqpt"
        params["ceqpt"] = body.class_of_eqpt.strip().upper()

    text_val = (body.text or "").strip()
    if text_val:
        q = f"%{text_val.upper()}%"
        field = (body.field or "Nomenclature").strip()
        if field == "Census No":
            sql_where += " AND UPPER(census_no) LIKE :qtext"
        elif field == "Material No":
            sql_where += " AND UPPER(material_no) LIKE :qtext"
        elif field == "Cat Part No":
            sql_where += " AND UPPER(cat_part_no) LIKE :qtext"
        else:
            sql_where += " AND UPPER(nomen) LIKE :qtext"
        params["qtext"] = q

    result_q = (body.result_q or "").strip()
    if result_q:
        terms = [t for t in result_q.split() if t]
        for idx, term in enumerate(terms):
            t_upper = term.upper()
            param_name = f"rq_{idx}"
            params[param_name] = f"%{t_upper}%"

            status_codes = []
            if opstatus_map:
                for code, label in opstatus_map.items():
                    if t_upper in label.upper() or t_upper in code.upper():
                        status_codes.append(code.upper())

            status_clause = ""
            if status_codes:
                st_param_names = []
                for st_i, st_code in enumerate(status_codes):
                    st_pname = f"rq_{idx}_st_{st_i}"
                    params[st_pname] = st_code
                    st_param_names.append(f":{st_pname}")
                st_in_list = ", ".join(st_param_names)
                status_clause = f" OR UPPER(op_status) IN ({st_in_list}) OR UPPER(item_status) IN ({st_in_list})"

            sql_where += f""" AND (
                UPPER(material_no) LIKE :{param_name} OR
                UPPER(census_no) LIKE :{param_name} OR
                UPPER(nomen) LIKE :{param_name} OR
                UPPER(class_category) LIKE :{param_name} OR
                UPPER(cat_part_no) LIKE :{param_name} OR
                UPPER(au) LIKE :{param_name} OR
                UPPER(op_status) LIKE :{param_name} OR
                UPPER(item_status) LIKE :{param_name}
                {status_clause}
            )"""

    # Relevance ordering: exact match -> prefix match -> default census_no
    if result_q:
        full_rq = result_q.upper()
        order_params["full_rq_exact"] = full_rq
        order_params["full_rq_pfx"] = f"{full_rq}%"
        order_sql = """ORDER BY
            CASE
                WHEN UPPER(material_no) = :full_rq_exact OR UPPER(census_no) = :full_rq_exact OR UPPER(nomen) = :full_rq_exact OR UPPER(cat_part_no) = :full_rq_exact OR UPPER(class_category) = :full_rq_exact THEN 1
                WHEN UPPER(material_no) LIKE :full_rq_pfx OR UPPER(census_no) LIKE :full_rq_pfx OR UPPER(nomen) LIKE :full_rq_pfx OR UPPER(cat_part_no) LIKE :full_rq_pfx OR UPPER(class_category) LIKE :full_rq_pfx THEN 2
                ELSE 3
            END ASC,
            census_no ASC NULLS LAST,
            nomen ASC NULLS LAST"""
    elif text_val:
        full_txt = text_val.upper()
        order_params["full_txt_exact"] = full_txt
        order_params["full_txt_pfx"] = f"{full_txt}%"
        order_sql = """ORDER BY
            CASE
                WHEN UPPER(material_no) = :full_txt_exact OR UPPER(census_no) = :full_txt_exact OR UPPER(nomen) = :full_txt_exact OR UPPER(cat_part_no) = :full_txt_exact OR UPPER(class_category) = :full_txt_exact THEN 1
                WHEN UPPER(material_no) LIKE :full_txt_pfx OR UPPER(census_no) LIKE :full_txt_pfx OR UPPER(nomen) LIKE :full_txt_pfx OR UPPER(cat_part_no) LIKE :full_txt_pfx OR UPPER(class_category) LIKE :full_txt_pfx THEN 2
                ELSE 3
            END ASC,
            census_no ASC NULLS LAST,
            nomen ASC NULLS LAST"""
    else:
        order_sql = "ORDER BY census_no ASC NULLS LAST, nomen ASC NULLS LAST"

    return sql_where, params, order_sql, order_params


def _get_opstatus_map(session: Session) -> dict[str, str]:
    sql = """
        SELECT code_value, label_name, label_short
        FROM MMS_DOMAIN_VALUES
        WHERE REPLACE(UPPER(domain_name), '_', '') IN ('OPSTATUS', 'ITEMSTATUS')
    """
    rows = fetch_all(session, sql)
    mapping: dict[str, str] = {}
    for r in rows:
        label = str(r.get("label_name") or r.get("code_value") or "").strip()
        code = str(r.get("code_value") or "").strip()
        short = str(r.get("label_short") or "").strip()
        if code and label:
            mapping[code.upper()] = label
        if label:
            mapping[label.upper()] = label
        if short and label:
            mapping[short.upper()] = label
    return mapping


@router.post("/search", response_model=MlccsSearchResponse)
def search_mlccs(
    body: MlccsSearchRequest,
    session: Session = Depends(get_db_session),
) -> MlccsSearchResponse:
    opstatus_map = _get_opstatus_map(session)
    where_sql, where_params, order_sql, order_params = _build_where_clause(body, opstatus_map)

    count_sql = f"SELECT COUNT(id) AS cnt FROM MMS_MLCCS_EQUIPMENT_MASTER{where_sql}"
    total_row = fetch_one(session, count_sql, where_params)
    total = int((total_row.get("cnt") if total_row else 0) or 0)

    offset = (body.page - 1) * body.page_size
    query_sql = f"""
        SELECT id, material_no, census_no, nomen, class_category, cat_part_no, au, op_status, item_status
        FROM MMS_MLCCS_EQUIPMENT_MASTER
        {where_sql}
        {order_sql}
        OFFSET :offset_val ROWS FETCH NEXT :limit_val ROWS ONLY
    """
    page_params = {**where_params, **order_params, "offset_val": offset, "limit_val": body.page_size}
    rows = fetch_all(session, query_sql, page_params)

    items = []
    for r in rows:
        raw_status = str(r.get("op_status") or r.get("item_status") or "").strip()
        mapped_status = opstatus_map.get(raw_status.upper(), raw_status) if raw_status else None
        items.append(
            MlccsListItem(
                id=str(r["id"]),
                material_no=r.get("material_no"),
                census_no=r.get("census_no"),
                nomenclature=r.get("nomen"),
                class_of_eqpt=r.get("class_category"),
                cat_part_no=r.get("cat_part_no"),
                au=r.get("au"),
                status=mapped_status,
            )
        )

    return MlccsSearchResponse(
        items=items,
        total=total,
        page=body.page,
        page_size=body.page_size,
    )
