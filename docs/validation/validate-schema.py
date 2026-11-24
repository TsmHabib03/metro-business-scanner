"""Static planning validation only; never connects to a database."""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE / "vendor"))
import pglast

statements = pglast.parse_sql((ROOT / "database/schema.sql").read_text(encoding="utf-8"))
tables = {}
foreign_keys = []


def names(items):
    return tuple(item.sval for item in (items or ()))


def record_constraint(table, constraint, column=None):
    kind = constraint.contype.name
    if kind in ("CONSTR_PRIMARY", "CONSTR_UNIQUE"):
        tables[table]["unique"].append((column,) if column else names(constraint.keys))
    if kind == "CONSTR_FOREIGN":
        foreign_keys.append((table, (column,) if column else names(constraint.fk_attrs),
                             constraint.pktable.relname, names(constraint.pk_attrs)))


for raw in statements:
    node = raw.stmt
    if type(node).__name__ == "CreateStmt":
        table = node.relation.relname
        tables[table] = {"columns": set(), "unique": []}
        for element in node.tableElts:
            if type(element).__name__ == "ColumnDef":
                tables[table]["columns"].add(element.colname)
                for constraint in element.constraints or ():
                    record_constraint(table, constraint, element.colname)
            elif type(element).__name__ == "Constraint":
                record_constraint(table, element)
    elif type(node).__name__ == "AlterTableStmt":
        for command in node.cmds:
            if type(command.def_).__name__ == "Constraint":
                record_constraint(node.relation.relname, command.def_)

errors = []
for table, local, referenced, remote in foreign_keys:
    if referenced not in tables:
        errors.append(f"{table}: unknown referenced table {referenced}")
        continue
    if not set(local) <= tables[table]["columns"]:
        errors.append(f"{table}: unknown local foreign-key columns {local}")
    if remote and not set(remote) <= tables[referenced]["columns"]:
        errors.append(f"{table}: unknown referenced columns {remote}")
    if remote and not any(len(key) == len(remote) and set(key) == set(remote)
                          for key in tables[referenced]["unique"]):
        errors.append(f"{table}: no declared unique/primary key for {referenced}{remote}")

result = {
    "parser": pglast.__version__,
    "statements": len(statements),
    "tables": len(tables),
    "foreign_keys": len(foreign_keys),
    "syntax": "passed",
    "static_fk_columns_and_referenced_keys": "failed" if errors else "passed",
    "errors": errors,
    "runtime_database_validation": "not run; no PostgreSQL/PostGIS instance used",
    "limitations": "Static AST checks do not validate types, functions, extensions, privileges, application policy enforcement, or runtime migration behavior.",
}
(HERE / "schema-result.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result))
assert not errors
